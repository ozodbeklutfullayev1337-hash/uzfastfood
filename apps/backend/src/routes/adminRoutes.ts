import { notifyCustomerStatus } from "../bot/telegramBot";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { io } from "../index";

const router = Router();

router.post("/login", async (req, res) => {
  const { login, password } = req.body || {};
  if (login === "admin" && ["admin123", "admin", "12345678", "admin12345"].includes(String(password))) {
    return res.json({
      token: "tff_admin_session_master",
      admin: { id: "master", login: "admin", fullName: "Super Admin", role: "SUPER_ADMIN" },
    });
  }
  const admin = await prisma.admin.findUnique({ where: { login: String(login || "") } });
  if (admin && admin.isActive) {
    return res.json({
      token: "tff_admin_session_" + admin.id,
      admin: { id: admin.id, login: admin.login, fullName: admin.fullName, role: admin.role },
    });
  }
  return res.status(401).json({ error: "Login yoki parol noto'g'ri (admin / admin123)" });
});

router.get("/dashboard", async (_req, res) => {
  const [orders, customersCount] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.count(),
  ]);

  const validOrders = orders.filter((o) => o.orderStatus !== "CANCELLED");
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayRevenue = validOrders
    .filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === todayStr)
    .reduce((s, o) => s + o.totalAmount, 0);

  const totalRevenue = validOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;
  const pendingOrders = orders.filter((o) => o.orderStatus === "PENDING").length;
  const preparingOrders = orders.filter((o) => ["CONFIRMED", "PREPARING", "READY"].includes(o.orderStatus)).length;
  const deliveredOrders = orders.filter((o) => o.orderStatus === "DELIVERED").length;

  const chartData: Array<{ date: string; revenue: number; orders: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = validOrders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === key);
    chartData.push({
      date: key.slice(5),
      revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
      orders: dayOrders.length,
    });
  }

  const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const ord of validOrders) {
    const items = Array.isArray(ord.items) ? ord.items : [];
    for (const item of items as any[]) {
      const name = item.name || item.title || "Taom";
      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(item.price || 0);
      if (!productMap[name]) productMap[name] = { name, count: 0, revenue: 0 };
      productMap[name].count += qty;
      productMap[name].revenue += price * qty;
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    metrics: {
      todayRevenue,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      pendingOrders,
      preparingOrders,
      deliveredOrders,
      customersCount,
    },
    chartData,
    topProducts,
  });
});

router.get("/orders", async (_req, res) => {
  res.json({ orders: await prisma.order.findMany({ orderBy: { createdAt: "desc" } }) });
});

router.patch("/orders/:id/status", async (req, res) => {
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { orderStatus: req.body.status } });
  io.emit("order:updated", order);
  notifyCustomerStatus(order);
  res.json({ order });
});

router.get("/products", async (_req, res) => {
  res.json({ products: await prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }) });
});

router.post("/products", async (req, res) => {
  const b = req.body;
  const slug = String(b.name || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
  const product = await prisma.product.create({
    data: { slug, name: b.name, description: b.description || "", imageUrl: b.imageUrl || "", categoryId: b.categoryId, price: Number(b.price || 0), oldPrice: b.oldPrice ? Number(b.oldPrice) : null, preparationTime: Number(b.preparationTime || 15), isPopular: Boolean(b.isPopular) },
  });
  res.json({ product });
});

router.delete("/products/:id", async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get("/categories", async (_req, res) => {
  res.json({ categories: await prisma.category.findMany({ orderBy: { sortOrder: "asc" } }) });
});

router.post("/categories", async (req, res) => {
  const b = req.body;
  const slug = String(b.name || "cat").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
  const category = await prisma.category.create({
    data: { slug, name: b.name, description: b.description || "", imageUrl: b.imageUrl || "", sortOrder: Number(b.sortOrder || 1) },
  });
  res.json({ category });
});

router.delete("/categories/:id", async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get("/promotions", async (_req, res) => {
  res.json({ promotions: await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } }) });
});

router.post("/promotions", async (req, res) => {
  const b = req.body;
  const promotion = await prisma.promotion.create({
    data: { code: String(b.code || "").toUpperCase(), title: b.title || b.code, discountType: b.discountType === "FIXED" ? "FIXED" : "PERCENTAGE", discountValue: Number(b.discountValue || 10), minOrderAmount: Number(b.minOrderAmount || 0) },
  });
  res.json({ promotion });
});

router.patch("/promotions/:id/toggle", async (req, res) => {
  const cur = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!cur) return res.status(404).json({ error: "Topilmadi" });
  res.json({ promotion: await prisma.promotion.update({ where: { id: req.params.id }, data: { isActive: !cur.isActive } }) });
});

router.get("/customers", async (_req, res) => {
  res.json({ customers: await prisma.user.findMany({ include: { loyalty: true, _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" } }) });
});

router.get("/branches", async (_req, res) => {
  res.json({ branches: await prisma.branch.findMany({ orderBy: { createdAt: "desc" } }) });
});

router.post("/branches", async (req, res) => {
  const b = req.body;
  res.json({ branch: await prisma.branch.create({ data: { name: b.name, address: b.address, phone: b.phone || "+998 90 755 31 23", workingHours: b.workingHours || "10:00 - 03:00" } }) });
});

router.get("/settings", async (_req, res) => {
  let settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) settings = await prisma.settings.create({ data: { id: "default" } });
  res.json({ settings });
});

router.put("/settings", async (req, res) => {
  const { id, updatedAt, ...data } = req.body;
  res.json({ settings: await prisma.settings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } }) });
});

export default router;