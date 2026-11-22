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
    console.log("[HUMO] TG_SESSION topilmadi, avtomatik tinglovchi kutish rejimida.");
    return;
  }

  try {
    const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();
    console.log("[HUMO] @HUMOcardbot avtomatik to'lov tinglovchisi ishga tushdi!");

    client.addEventHandler(async (event) => {
      try {
        const msg = event.message;
        if (!msg || !msg.message) return;

        const sender = await msg.getSender().catch(() => null);
        const username = (sender as any)?.username?.toLowerCase() || "";
        const text = msg.message;

        // Faqat @HUMOcardbot yoki kirim (+ ... UZS) xabarlarini tekshirish
        if (username && username !== "humocardbot") return;
        if (!text.includes("+") && !text.includes("➕") && !text.toLowerCase().includes("popolnenie")) return;

        // Kirim summasini ajratib olish (masalan: ➕ 50 014.00 UZS yoki +50014.00)
        const match = text.match(/[+➕]\s*([0-9\s.,]+)\s*(?:UZS|so'm|sum)/i);
        if (!match) return;

        const rawNum = match[1].replace(/\s+/g, "").replace(/,/g, ".");
        const exactAmount = Math.floor(parseFloat(rawNum));
        if (!exactAmount || exactAmount <= 0) return;

        console.log("[HUMO] Kirim aniqlandi:", exactAmount, "UZS");

        // Bazadan kutilayotgan va muddati o'tmagan so'rovni qidirish
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

        // Tranzaksiya: so'rovni COMPLETED qilish va foydalanuvchi balansiga qo'shish
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

        console.log(`[HUMO] Muvaffaqiyatli! User ${updatedUser.firstName} balansi +${exactAmount} UZS ga oshirildi.`);

        // Mini App ekranini jonli yangilash
        io.emit("wallet:updated", {
          telegramId: updatedUser.telegramId,
          requestId: updatedReq.id,
          amount: exactAmount,
          newBalance: updatedUser.balance,
        });

        // Telegram bot orqali mijozga xabar yuborish
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
        console.error("[HUMO] Xabarni qayta ishlashda xatolik:", err);
      }
    }, new NewMessage({}));
  } catch (err) {
    console.error("[HUMO] Ulanishda xatolik:", err);
  }
}
