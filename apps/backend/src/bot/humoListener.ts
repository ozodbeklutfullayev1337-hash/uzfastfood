import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { prisma } from "../lib/prisma";
import { io } from "../index";

export async function startHumoListener() {
  const apiId = Number(process.env.TG_API_ID || 38859312);
  const apiHash = process.env.TG_API_HASH || "676962b7784f2c3982c6ccbeb7736abe";
  const sessionStr = process.env.TG_SESSION || "";

  if (!sessionStr) {
    console.log("[HUMO] TG_SESSION topilmadi.");
    return;
  }

  try {
    const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();
    await client.getDialogs({ limit: 30 });
    console.log("[HUMO] @HUMOcardbot avtomatik to'lov tinglovchisi tayyor!");

    client.addEventHandler(async (event) => {
      try {
        const msg = event.message;
        if (!msg || !msg.message) return;

        const sender = await msg.getSender().catch(() => null);
        const username = ((sender as any)?.username || "").toLowerCase();
        const text = msg.message;

        if (username === "humocardbot" || /humo|uzs/i.test(text)) {
          console.log("[HUMO_RAW]", username, JSON.stringify(text));
        }

        if (username && username !== "humocardbot") return;

        const isIncome =
          /[+➕]/.test(text) ||
          /popolnenie|пополнение|kirim|tushum|зачисление/i.test(text);
        if (!isIncome) return;

        const match = text.match(/([0-9][0-9\s\u00A0.,]*)\s*(?:UZS|so'm|sum)/i);
        if (!match) return;

        let numStr = match[1].replace(/[\s\u00A0]/g, "");
        if (/\.\d{2}$/.test(numStr)) {
          numStr = numStr.replace(/,/g, "");
        } else if (/,\d{2}$/.test(numStr)) {
          numStr = numStr.replace(/\./g, "").replace(",", ".");
        } else {
          numStr = numStr.replace(/[.,]/g, "");
        }

        const exactAmount = Math.floor(parseFloat(numStr));
        if (!exactAmount || exactAmount <= 0) return;

        console.log("[HUMO] Kirim aniqlandi:", exactAmount, "UZS");

        const pending = await prisma.topUpRequest.findFirst({
          where: {
            status: "PENDING",
            uniqueAmount: exactAmount,
            expiresAt: { gt: new Date() },
          },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        });

        if (!pending) {
          console.log("[HUMO] Mos keluvchi kutilayotgan so'rov topilmadi:", exactAmount);
          return;
        }

        const [updatedReq, updatedUser] = await prisma.$transaction([
          prisma.topUpRequest.update({
            where: { id: pending.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          }),
          prisma.user.update({
            where: { id: pending.userId },
            data: { balance: { increment: exactAmount } },
          }),
        ]);

        console.log(`[HUMO] Muvaffaqiyatli! ${updatedUser.firstName} balansi +${exactAmount} UZS ga oshirildi.`);

        io.emit("wallet:updated", {
          telegramId: updatedUser.telegramId,
          requestId: updatedReq.id,
          amount: exactAmount,
          newBalance: updatedUser.balance,
        });

        const botToken = process.env.BOT_TOKEN;
        if (botToken && updatedUser.telegramId && !updatedUser.telegramId.startsWith("777")) {
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: updatedUser.telegramId,
              text: `✅ <b>Balansingiz muvaffaqiyatli to'ldirildi!</b>\n\n💰 Summa: <b>+${exactAmount.toLocaleString("ru-RU")} so'm</b>\n💳 Joriy balans: <b>${updatedUser.balance.toLocaleString("ru-RU")} so'm</b>`,
              parse_mode: "HTML",
            }),
          }).catch(() => {});
        }
      } catch (err) {
        console.error("[HUMO] Xatolik:", err);
      }
    }, new NewMessage({}));
  } catch (err) {
    console.error("[HUMO] Ulanishda xatolik:", err);
  }
}
