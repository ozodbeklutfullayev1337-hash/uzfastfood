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
    res.json({ settings, categories, products, user });
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

router.post("/orders", async (req, res) => {
  const u = await getOrCreateUser(req);
  const b = req.body;
  const order = await prisma.order.create({
    data: {
      userId: u.id,
      items: b.items || [],
      subtotal: Number(b.subtotal || 0),
      discount: Number(b.discount || 0),
      bonusUsed: Number(b.bonusUsed || 0),
      deliveryFee: Number(b.deliveryFee || 0),
      totalAmount: Number(b.totalAmount || 0),
      promoCode: b.promoCode || null,
      address: b.address || "Toshkent",
      phone: b.phone || "",
      customerName: b.customerName || u.firstName,
      comment: b.comment || null,
      paymentMethod: b.paymentMethod === "CARD_ON_DELIVERY" ? "CARD_ON_DELIVERY" : "CASH",
    },
  });
  io.emit("order:created", order);
  notifyNewOrder(order);
  res.json({ order });
});

export default router;
