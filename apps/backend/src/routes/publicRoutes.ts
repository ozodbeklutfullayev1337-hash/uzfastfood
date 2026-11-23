import { notifyNewOrder } from "../bot/telegramBot";
import { io } from "../index";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { extractTelegramUser } from "../lib/security";

const router = Router();

async function getOrCreateUser(req: any) {
  const tg = extractTelegramUser(req);
  let u = await prisma.user.findUnique({
    where: { telegramId: tg.telegramId },
    include: { loyalty: true, favorites: { select: { productId: true } }, addresses: true },
  });
  if (!u) {
    u = await prisma.user.create({
      data: {
        telegramId: tg.telegramId,
        firstName: tg.firstName,
        lastName: tg.lastName,
        username: tg.username,
        loyalty: { create: { points: 0, totalSpent: 0, tier: "BRONZE" } },
      },
      include: { loyalty: true, favorites: { select: { productId: true } }, addresses: true },
    });
  }
  return u;
}

router.get("/bootstrap", async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) settings = await prisma.settings.create({ data: { id: "default" } });
    const [categories, products, user] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.product.findMany({ where: { isAvailable: true }, orderBy: { createdAt: "asc" } }),
      getOrCreateUser(req),
    ]);
    const isAdmin = String(user.telegramId) === String(process.env.ADMIN_TELEGRAM_ID || "6515742580");
    res.json({ settings, categories, products, user: { ...user, isAdmin } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/categories", async (_req, res) => {
  res.json({ categories: await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }) });
});

router.get("/products", async (_req, res) => {
  res.json({ products: await prisma.product.findMany({ where: { isAvailable: true } }) });
});

router.get("/my/orders", async (req, res) => {
  const u = await getOrCreateUser(req);
  res.json({ orders: await prisma.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } }) });
});

router.post("/my/favorites/:productId", async (req, res) => {
  const u = await getOrCreateUser(req);
  const { productId } = req.params;
  const ex = await prisma.favorite.findUnique({ where: { userId_productId: { userId: u.id, productId } } });
  if (ex) {
    await prisma.favorite.delete({ where: { id: ex.id } });
    return res.json({ liked: false });
  }
  await prisma.favorite.create({ data: { userId: u.id, productId } });
  res.json({ liked: true });
});

router.post("/promotions/validate", async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  const sub = Number(req.body.subtotal || 0);
  const p = await prisma.promotion.findUnique({ where: { code } });
  if (!p || !p.isActive) return res.status(400).json({ error: "Promokod topilmadi" });
  let d = p.discountType === "PERCENTAGE" ? Math.round((sub * p.discountValue) / 100) : p.discountValue;
  if (p.maxDiscount && d > p.maxDiscount) d = p.maxDiscount;
  res.json({ code: p.code, discountAmount: d });
});


// HUMO Avtomatik Balans To'ldirish So'rovi
router.post("/wallet/topup", async (req, res) => {
  try {
    const u = await getOrCreateUser(req);
    const baseAmount = Math.max(1000, Math.round(Number(req.body.amount || 0)));

    // Muddati o'tgan eski so'rovlarni tozalash
    await prisma.topUpRequest.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    // Hozir band bo'lgan unikal summalarni olish
    const activeReqs = await prisma.topUpRequest.findMany({
      where: { status: "PENDING" },
      select: { uniqueAmount: true },
    });
    const taken = new Set(activeReqs.map((r) => r.uniqueAmount));

    // +1 dan +99 gacha bo'sh unikal birlik topish
    let uniqueAmount = baseAmount + Math.floor(Math.random() * 89) + 11;
    for (let offset = 1; offset <= 99; offset++) {
      if (!taken.has(baseAmount + offset)) {
        uniqueAmount = baseAmount + offset;
        break;
      }
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 daqiqa
    const request = await prisma.topUpRequest.create({
      data: {
        userId: u.id,
        baseAmount,
        uniqueAmount,
        expiresAt,
      },
    });

    res.json({
      request,
      cardNumber: "9860 1701 1062 1555",
      cardHolder: "HUMO • THE FAST FOOD",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/wallet/topup/:id", async (req, res) => {
  const request = await prisma.topUpRequest.findUnique({ where: { id: req.params.id } });
  const u = await getOrCreateUser(req);
  res.json({ request, balance: u.balance });
});

router.post("/orders", async (req, res) => {
  try {
    const u = await getOrCreateUser(req);
    const b = req.body;
    const method = ["CASH", "CARD_ON_DELIVERY", "BALANCE"].includes(b.paymentMethod) ? b.paymentMethod : "CASH";

    const items = Array.isArray(b.items) ? b.items : [];
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });

    let calcSubtotal = 0;
    const enrichedItems = items.map((i: any) => {
      const p = dbProducts.find((dp) => dp.id === i.productId);
      const extras = Array.isArray(i.customizations) ? i.customizations.reduce((s: number, c: any) => s + Number(c.price || 0), 0) : 0;
      const unitPrice = (p?.price || 0) + extras;
      const qty = Math.max(1, Number(i.quantity || 1));
      calcSubtotal += unitPrice * qty;
      return {
        productId: i.productId,
        name: p?.name || "Taom",
        imageUrl: p?.imageUrl || "",
        unitPrice,
        quantity: qty,
      };
    });

    const subtotal = Number(b.subtotal || calcSubtotal);
    const bonusUsed = Math.min(u.loyalty?.points || 0, Math.max(0, Number(b.useBonusPoints || b.bonusUsed || 0)));
    let discount = Number(b.discount || 0);
    if (b.promoCode && !discount) {
      const promo = await prisma.promotion.findUnique({ where: { code: String(b.promoCode).toUpperCase() } });
      if (promo && promo.isActive) {
        discount = promo.discountType === "PERCENTAGE" ? Math.round((subtotal * promo.discountValue) / 100) : promo.discountValue;
      }
    }
    const deliveryFee = subtotal - discount >= 100000 ? 0 : 15000;
    const totalAmount = Math.max(0, subtotal - discount - bonusUsed + deliveryFee);

    if (method === "BALANCE" && u.balance < totalAmount) {
      return res.status(400).json({ error: "Balansingizda mablag' yetarli emas. Avval balansni to'ldiring." });
    }

    const order = await prisma.$transaction(async (tx) => {
      if (method === "BALANCE") {
        await tx.user.update({
          where: { id: u.id },
          data: { balance: { decrement: totalAmount } },
        });
      }
      if (bonusUsed > 0 && u.loyalty) {
        await tx.loyalty.update({
          where: { userId: u.id },
          data: { points: { decrement: bonusUsed } },
        });
      }
      return tx.order.create({
        data: {
          userId: u.id,
          items: enrichedItems,
          subtotal,
          discount,
          bonusUsed,
          deliveryFee,
          totalAmount,
          promoCode: b.promoCode || null,
          address: b.address || "Toshkent",
          latitude: b.latitude ?? null,
          longitude: b.longitude ?? null,
          phone: b.phone || "",
          customerName: b.customerName || u.firstName,
          comment: b.comment || null,
          paymentMethod: method,
          paymentStatus: method === "BALANCE" ? "PAID" : "UNPAID",
          orderStatus: method === "BALANCE" ? "CONFIRMED" : "PENDING",
        },
      });
    });

    io.emit("order:created", order);
    notifyNewOrder(order);
    res.json({ order });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
