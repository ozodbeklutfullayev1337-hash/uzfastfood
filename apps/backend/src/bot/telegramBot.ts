import { Telegraf, Markup } from "telegraf";
import { prisma } from "../lib/prisma";
import { io } from "../index";

let botInstance: Telegraf | null = null;
const dynamicAdminIds = new Set<string>(
  (process.env.ADMIN_TELEGRAM_ID || "6515742580")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

const STATUS_LABELS: Record<string, string> = {
  PENDING: "⏳ Kutilmoqda",
  CONFIRMED: "✅ Tasdiqlandi",
  PREPARING: "👨‍🍳 Tayyorlanmoqda",
  READY: "📦 Tayyor (kuryer kutilmoqda)",
  ON_THE_WAY: "🛵 Kuryer yo'lda",
  DELIVERED: "🏁 Yetkazib berildi",
  CANCELLED: "❌ Bekor qilindi",
};

function buildOrderKeyboard(orderId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Tasdiqlash", `ord_status:${orderId}:CONFIRMED`),
      Markup.button.callback("👨‍🍳 Tayyorlash", `ord_status:${orderId}:PREPARING`),
    ],
    [
      Markup.button.callback("🛵 Yo'lda", `ord_status:${orderId}:ON_THE_WAY`),
      Markup.button.callback("🏁 Yetkazildi", `ord_status:${orderId}:DELIVERED`),
    ],
    [Markup.button.callback("❌ Bekor qilish", `ord_status:${orderId}:CANCELLED`)],
  ]);
}

function formatOrderText(order: any) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.length
    ? items
        .map((it: any, i: number) => `${i + 1}. ${it.name || it.title || "Taom"} × ${it.quantity || it.qty || 1} — ${(Number(it.price || 0) * Number(it.quantity || it.qty || 1)).toLocaleString()} so'm`)
        .join("\n")
    : "—";

  return [
    `🔥 <b>YANGI BUYURTMA #${order.orderNumber || order.id.slice(-5)}</b>`,
    `📊 Holat: <b>${STATUS_LABELS[order.orderStatus] || order.orderStatus}</b>`,
    ``,
    `👤 Mijoz: <b>${order.customerName}</b>`,
    `📞 Telefon: <code>${order.phone}</code>`,
    `📍 Manzil: ${order.address}`,
    order.comment ? `💬 Izoh: <i>${order.comment}</i>` : null,
    `💳 To'lov: ${order.paymentMethod === "CARD_ON_DELIVERY" ? "Karta orqali" : "Naqd pul"}`,
    ``,
    `🍔 <b>Buyurtma tarkibi:</b>`,
    itemsText,
    ``,
    `💰 <b>Jami summa: ${Number(order.totalAmount).toLocaleString()} so'm</b>`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export async function notifyNewOrder(order: any) {
  if (!botInstance) return;
  const text = formatOrderText(order);
  const keyboard = buildOrderKeyboard(order.id);
  for (const chatId of dynamicAdminIds) {
    try {
      await botInstance.telegram.sendMessage(chatId, text, {
        parse_mode: "HTML",
        ...keyboard,
      });
    } catch (e: any) {
      console.error(`Admin (${chatId}) ga xabar yuborilmadi:`, e.message);
    }
  }
}

export async function notifyCustomerStatus(order: any) {
  if (!botInstance || !order?.userId) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: order.userId } });
    if (!user?.telegramId || user.telegramId === "777000111") return;
    const statusText = STATUS_LABELS[order.orderStatus] || order.orderStatus;
    await botInstance.telegram.sendMessage(
      user.telegramId,
      `🍔 <b>THE FAST FOOD</b>\n\nBuyurtmangiz (#${order.orderNumber || order.id.slice(-5)}) holati yangilandi:\n<b>${statusText}</b>`,
      { parse_mode: "HTML" }
    );
  } catch (e: any) {
    console.error("Mijozga xabar yuborilmadi:", e.message);
  }
}

export function startTelegramBot() {
  const token = process.env.BOT_TOKEN;
  const url = process.env.MINI_APP_URL || process.env.PUBLIC_WEBAPP_URL;
  if (!token) return null;

  const bot = new Telegraf(token);
  botInstance = bot;

  bot.start((ctx) => {
    const chatId = String(ctx.from.id);
    const isAdmin = dynamicAdminIds.has(chatId);
    const kb = url
      ? Markup.inlineKeyboard([[Markup.button.webApp("🍔 Menyuni ochish", url)]])
      : undefined;
    ctx.reply(
      isAdmin
        ? `Assalomu alaykum, Admin! ✅\nYangi buyurtmalar shu chatga kelib tushadi (ID: ${chatId}).`
        : "Assalomu alaykum! THE FAST FOOD yetkazib berish xizmatiga xush kelibsiz!",
      kb
    );
  });

  bot.action(/^ord_status:([^:]+):([A-Z_]+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const newStatus = ctx.match[2];
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { orderStatus: newStatus as any },
      });
      io.emit("order:updated", updated);
      await notifyCustomerStatus(updated);
      await ctx.answerCbQuery(`Holat o'zgardi: ${STATUS_LABELS[newStatus] || newStatus}`);
      await ctx.editMessageText(formatOrderText(updated), {
        parse_mode: "HTML",
        ...buildOrderKeyboard(updated.id),
      });
    } catch (e: any) {
      await ctx.answerCbQuery("Xatolik: " + e.message, { show_alert: true });
    }
  });

  bot.launch().catch((e) => console.error("Bot launch error:", e.message));
  return bot;
}