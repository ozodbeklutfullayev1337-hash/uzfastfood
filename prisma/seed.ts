import { PrismaClient, AdminRole, DiscountType } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

const BURGER_CUSTOMIZATIONS = [
  { id: 'ext-cheese', name: 'Extra Cheddar pishlog’i', price: 6000, group: 'Qo’shimchalar' },
  { id: 'ext-meat', name: 'Qo’shimcha mol go’shti kotleti', price: 16000, group: 'Qo’shimchalar' },
  { id: 'ext-sauce', name: 'Maxsus trufel sousi', price: 5000, group: 'Qo’shimchalar' },
  { id: 'rem-onion', name: 'Piyozsiz tayyorlash', price: 0, group: 'Tarkibni o’zgartirish' },
  { id: 'rem-tomato', name: 'Pomidorsiz tayyorlash', price: 0, group: 'Tarkibni o’zgartirish' },
];

const PIZZA_CUSTOMIZATIONS = [
  { id: 'size-30', name: '30 sm (O’rtacha)', price: 0, group: 'O’lcham' },
  { id: 'size-35', name: '35 sm (Katta)', price: 22000, group: 'O’lcham' },
  { id: 'crust-thin', name: 'Yupqa xamir', price: 0, group: 'Xamir turi' },
  { id: 'crust-thick', name: 'Qalin pishloqli bort', price: 14000, group: 'Xamir turi' },
  { id: 'pizza-ext-cheese', name: 'Ikki hissa Mozzarella', price: 12000, group: 'Qo’shimchalar' },
];

const FRIES_CUSTOMIZATIONS = [
  { id: 'fry-sm', name: 'Small (120g)', price: 0, group: 'Portiya' },
  { id: 'fry-md', name: 'Medium (180g)', price: 5000, group: 'Portiya' },
  { id: 'fry-lg', name: 'Large (250g)', price: 10000, group: 'Portiya' },
  { id: 'sauce-cheese', name: 'Issiq pishloqli sous', price: 4000, group: 'Souslar' },
  { id: 'sauce-special', name: 'Firmali barbekyu sous', price: 4000, group: 'Souslar' },
];

async function main() {
  console.log('THE FAST FOOD bazasi maʼlumotlar bilan to’ldirilmoqda...');

  // 1. Kompaniya sozlamalari
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'THE FAST FOOD',
      companyPhone: '+998 90 755 31 23',
      deliveryZone: 'Toshkent shahri bo’ylab',
      deliveryFee: 15000,
      minOrderAmount: 35000,
      freeDeliveryThreshold: 100000,
      estimatedDeliveryTime: '30-45 daqiqa',
      cashbackPercent: 5,
    },
  });

  // 2. Boshlang’ich Admin
  const adminLogin = process.env.ADMIN_DEFAULT_LOGIN || 'admin';
  const adminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin12345';

  await prisma.admin.upsert({
    where: { login: adminLogin },
    update: {},
    create: {
      login: adminLogin,
      passwordHash: hashPassword(adminPass),
      fullName: 'Ozodbek Lutfullayev (Founder)',
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  // 3. Filiallar
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-tashkent-center' },
    update: {},
    create: {
      id: 'branch-tashkent-center',
      name: 'THE FAST FOOD — Amir Temur Flagship',
      address: 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko’chasi 108',
      phone: '+998 90 755 31 23',
      workingHours: '10:00 - 03:00',
      latitude: 41.311081,
      longitude: 69.240562,
      isActive: true,
    },
  });

  // 4. Kategoriyalar (11 ta)
  const categoriesData = [
    { slug: 'burgers', name: 'Burgerlar', description: 'Marmar mol go’shtidan premium burgerlar', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=85', sortOrder: 1 },
    { slug: 'pizzas', name: 'Pizzalar', description: 'Tosh pechda pishirilgan italyan uslubidagi pizzalar', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=85', sortOrder: 2 },
    { slug: 'chicken', name: 'Tovuqli taomlar', description: 'Qarsildoq oltinrang tovuq go’shtlari', imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=85', sortOrder: 3 },
    { slug: 'fries-snacks', name: 'Fri va Snacks', description: 'Issiq kartoshka fri va maxsus gazaklar', imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=85', sortOrder: 4 },
    { slug: 'sandwiches', name: 'Sendvichlar', description: 'Ko’p qavatli klub sendvichlar', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=85', sortOrder: 5 },
    { slug: 'hot-dogs', name: 'Hot Dog', description: 'Maxsus sosiskali premium hot-doglar', imageUrl: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=800&q=85', sortOrder: 6 },
    { slug: 'lavash-doner', name: 'Lavash va Doner', description: 'Sharqona ziravorlar bilan boyitilgan taomlar', imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=85', sortOrder: 7 },
    { slug: 'salads', name: 'Salatlar', description: 'Yangi sabzavotlar va mualliflik souslari', imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=85', sortOrder: 8 },
    { slug: 'drinks', name: 'Ichimliklar', description: 'Muzdek salqin ichimliklar va kokteyllar', imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=85', sortOrder: 9 },
    { slug: 'desserts', name: 'Desertlar', description: 'Nozik shirinliklar', imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=85', sortOrder: 10 },
    { slug: 'combo', name: 'Combo', description: 'Tejamkor va to’yimli maxsus to’plamlar', imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=85', sortOrder: 11 },
  ];

  const categoriesMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoriesMap[cat.slug] = created.id;
  }

  // 5. Mahsulotlar (20 ta noyob rasmli mahsulot)
  const productsData = [
    {
      slug: 'classic-burger',
      name: 'Classic Burger',
      description: '100% yangi mol go’shtidan shirador kotlet, eritilgan Cheddar pishlog’i, qarsildoq aysberg salati, pomidor va firmali sous yumshoq brioche bulochkasida.',
      ingredients: ['Mol go’shti kotleti', 'Cheddar pishlog’i', 'Brioche bulochka', 'Aysberg salati', 'Pomidor', 'Firmali sous'],
      calories: 640,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'burgers',
      price: 38000,
      oldPrice: 44000,
      isPopular: true,
      isNew: false,
      preparationTime: 12,
      customizations: BURGER_CUSTOMIZATIONS,
    },
    {
      slug: 'double-cheeseburger',
      name: 'Double Cheeseburger',
      description: 'Ikki qavat marmar mol go’shti kotleti, ikki hissa Cheddar pishlog’i, tuzlangan bodring, karamellangan piyoz va tutunli barbekyu-mayonez sousi.',
      ingredients: ['2x Mol go’shti kotleti', '2x Cheddar pishlog’i', 'Tuzlangan bodring', 'Karamellangan piyoz', 'Maxsus sous'],
      calories: 890,
      imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'burgers',
      price: 52000,
      oldPrice: 60000,
      isPopular: true,
      isNew: false,
      preparationTime: 15,
      customizations: BURGER_CUSTOMIZATIONS,
    },
    {
      slug: 'chicken-burger',
      name: 'Chicken Burger',
      description: 'Oltinrang qarsildoq panirovkada qovurilgan tovuq filesi, mayin qaymoqli sous, yangi salat bargi va kunjutli bulochka.',
      ingredients: ['Tovuq filesi', 'Kunjutli bulochka', 'Aysberg salati', 'Qaymoqli sarimsoq sousi'],
      calories: 560,
      imageUrl: 'https://images.unsplash.com/photo-1615297928064-24977384d0da?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'burgers',
      price: 34000,
      oldPrice: null,
      isPopular: false,
      isNew: false,
      preparationTime: 12,
      customizations: BURGER_CUSTOMIZATIONS,
    },
    {
      slug: 'crispy-chicken',
      name: 'Crispy Chicken',
      description: 'Maxsus 11 xil ziravor bilan marinadlangan, ichi suvli va usti o’ta qarsildoq 4 bo’lak premium tovuq filesi.',
      ingredients: ['Tovuq filesi (4 dona)', 'Qarsildoq panirovka', 'Maxsus ziravorlar'],
      calories: 610,
      imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'chicken',
      price: 39000,
      oldPrice: 45000,
      isPopular: true,
      isNew: false,
      preparationTime: 14,
      customizations: FRIES_CUSTOMIZATIONS,
    },
    {
      slug: 'spicy-chicken',
      name: 'Spicy Chicken',
      description: 'Achchiq chili va dudlangan paprika sousi bilan qoplangan olovli qarsildoq tovuq bo’laklari — o’tkir ta’m ixlosmandlari uchun.',
      ingredients: ['Tovuq qanot va filelari', 'Chili glazur', 'Kunjut', 'Ko’k piyoz'],
      calories: 650,
      imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'chicken',
      price: 42000,
      oldPrice: null,
      isPopular: false,
      isNew: true,
      preparationTime: 14,
      customizations: FRIES_CUSTOMIZATIONS,
    },
    {
      slug: 'chicken-nuggets',
      name: 'Chicken Nuggets',
      description: '100% tabiiy tovuq ko’krak go’shtidan tayyorlangan 9 dona oltinrang naggetslar, tanlangan sous bilan.',
      ingredients: ['Tovuq ko’krak go’shti (9 dona)', 'Oltinrang qobiq'],
      calories: 430,
      imageUrl: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'chicken',
      price: 28000,
      oldPrice: 32000,
      isPopular: false,
      isNew: false,
      preparationTime: 10,
      customizations: FRIES_CUSTOMIZATIONS,
    },
    {
      slug: 'french-fries',
      name: 'French Fries',
      description: 'Tanlangan golland kartoshkasidan tayyorlangan, dengiz tuzi sepilgan issiq va qarsildoq kartoshka fri.',
      ingredients: ['Golland kartoshkasi', 'Dengiz tuzi', 'O’simlik yog’i'],
      calories: 340,
      imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'fries-snacks',
      price: 18000,
      oldPrice: null,
      isPopular: true,
      isNew: false,
      preparationTime: 8,
      customizations: FRIES_CUSTOMIZATIONS,
    },
    {
      slug: 'loaded-fries',
      name: 'Loaded Fries',
      description: 'Issiq Cheddar pishloq sousi, qovurilgan mol go’shti bo’laklari, xalapenyo qalampiri va ko’k piyoz bilan bezatilgan fri.',
      ingredients: ['Kartoshka fri', 'Issiq Cheddar sousi', 'Mol go’shti', 'Xalapenyo', 'Ko’k piyoz'],
      calories: 720,
      imageUrl: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'fries-snacks',
      price: 32000,
      oldPrice: 38000,
      isPopular: true,
      isNew: true,
      preparationTime: 12,
      customizations: FRIES_CUSTOMIZATIONS,
    },
    {
      slug: 'pepperoni-pizza',
      name: 'Pepperoni Pizza',
      description: '24 soat tindirilgan italyan xamiri, boyitilgan pomidor sousi, cho’ziluvchan Mozzarella va dudlangan pepperoni kolbasasi.',
      ingredients: ['Italyan xamiri', 'Mozzarella pishlog’i', 'Pepperoni kolbasa', 'San-Marzano pomidor sousi', 'Oregano'],
      calories: 1120,
      imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'pizzas',
      price: 78000,
      oldPrice: 89000,
      isPopular: true,
      isNew: false,
      preparationTime: 18,
      customizations: PIZZA_CUSTOMIZATIONS,
    },
    {
      slug: 'margherita-pizza',
      name: 'Margherita Pizza',
      description: 'Klassik neapolitan uyg’unligi: yangi Mozzarella, shirador pomidor sousi, zaytun moyi va yangi uzilgan rayhon barglari.',
      ingredients: ['Italyan xamiri', 'Yangi Mozzarella', 'Pomidor sousi', 'Yangi rayhon', 'Zaytun moyi'],
      calories: 920,
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'pizzas',
      price: 65000,
      oldPrice: null,
      isPopular: false,
      isNew: false,
      preparationTime: 16,
      customizations: PIZZA_CUSTOMIZATIONS,
    },
    {
      slug: 'bbq-pizza',
      name: 'BBQ Pizza',
      description: 'Dudlangan tovuq filesi, qizil piyoz halqalari, Mozzarella pishlog’i va tutunli Barbekyu sousi bilan boyitilgan pizza.',
      ingredients: ['Dudlangan tovuq', 'Barbekyu sousi', 'Mozzarella', 'Qizil piyoz', 'Koriandr'],
      calories: 1180,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'pizzas',
      price: 84000,
      oldPrice: 95000,
      isPopular: false,
      isNew: true,
      preparationTime: 18,
      customizations: PIZZA_CUSTOMIZATIONS,
    },
    {
      slug: 'hot-dog',
      name: 'Hot Dog',
      description: 'Yumshoq brioche bulochkasida grillda pishirilgan mol go’shtli sosiska, xantal, firmali sous va qarsildoq piyoz.',
      ingredients: ['Mol go’shtli sosiska', 'Brioche bulochka', 'Xantal', 'Qarsildoq piyoz', 'Tuzlangan bodring'],
      calories: 480,
      imageUrl: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'hot-dogs',
      price: 26000,
      oldPrice: null,
      isPopular: false,
      isNew: false,
      preparationTime: 10,
      customizations: BURGER_CUSTOMIZATIONS,
    },
    {
      slug: 'club-sandwich',
      name: 'Club Sandwich',
      description: 'Qovurilgan tost noni orasida grill tovuq filesi, Cheddar pishlog’i, yangi sabzavotlar va kartoshka fri gariri bilan.',
      ingredients: ['Tost non', 'Grill tovuq filesi', 'Cheddar', 'Pomidor', 'Aysberg', 'Kartoshka fri'],
      calories: 690,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'sandwiches',
      price: 41000,
      oldPrice: 46000,
      isPopular: true,
      isNew: false,
      preparationTime: 12,
      customizations: BURGER_CUSTOMIZATIONS,
    },
    {
      slug: 'caesar-salad',
      name: 'Caesar Salad',
      description: 'Qarsildoq Romano salati, grillda pishirilgan tovuq ko’kragi, Parmesan pishlog’i, sarimsoqli krutonlar va klassik Sezar sousi.',
      ingredients: ['Romano salati', 'Grill tovuq', 'Parmesan pishlog’i', 'Krutonlar', 'Sezar sousi', 'Cherry pomidor'],
      calories: 380,
      imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'salads',
      price: 35000,
      oldPrice: null,
      isPopular: false,
      isNew: false,
      preparationTime: 10,
      customizations: null,
    },
    {
      slug: 'coca-cola',
      name: 'Coca-Cola',
      description: 'Muzdek tetiklantiruvchi klassik Coca-Cola (0.5 L) — taomlaringizning ajralmas hamrohi.',
      ingredients: ['Gazlangan ichimlik 0.5 L'],
      calories: 210,
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'drinks',
      price: 12000,
      oldPrice: null,
      isPopular: true,
      isNew: false,
      preparationTime: 2,
      customizations: null,
    },
    {
      slug: 'fanta',
      name: 'Fanta',
      description: 'Apelsin ta’mli yorqin va muzdek salqin ichimlik (0.5 L).',
      ingredients: ['Apelsinli gazlangan ichimlik 0.5 L'],
      calories: 220,
      imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'drinks',
      price: 12000,
      oldPrice: null,
      isPopular: false,
      isNew: false,
      preparationTime: 2,
      customizations: null,
    },
    {
      slug: 'sprite',
      name: 'Sprite',
      description: 'Limon va laym ta’mli sof va tetiklantiruvchi muzdek ichimlik (0.5 L).',
      ingredients: ['Limon-laym gazlangan ichimlik 0.5 L'],
      calories: 190,
      imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'drinks',
      price: 12000,
      oldPrice: null,
      isPopular: false,
      isNew: false,
      preparationTime: 2,
      customizations: null,
    },
    {
      slug: 'milkshake',
      name: 'Milkshake',
      description: 'Tabiiy qaymoqli muzqaymoq, Belgiya shokoladi va vanil asosida tayyorlangan quyuq premium sutli kokteyl.',
      ingredients: ['Qaymoqli muzqaymoq', 'Yangi sut', 'Belgiya shokoladi', 'Ko’pirtirilgan qaymoq'],
      calories: 520,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'desserts',
      price: 29000,
      oldPrice: 34000,
      isPopular: true,
      isNew: true,
      preparationTime: 6,
      customizations: null,
    },
    {
      slug: 'combo-meals',
      name: 'Combo Meals',
      description: 'Double Cheeseburger + o’rtacha Kartoshka Fri + muzdek Coca-Cola (0.5 L) va pishloqli sous — 15% tejamkorlik bilan!',
      ingredients: ['Double Cheeseburger', 'French Fries (Medium)', 'Coca-Cola 0.5 L', 'Pishloqli sous'],
      calories: 1440,
      imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'combo',
      price: 69000,
      oldPrice: 84000,
      isPopular: true,
      isNew: false,
      preparationTime: 15,
      customizations: BURGER_CUSTOMIZATIONS,
    },
    {
      slug: 'special-menu',
      name: 'Special Menu',
      description: 'THE FAST FOOD Chef-povaridan eksklyuziv set: Pepperoni Pizza (30 sm), Crispy Chicken (4 dona), Loaded Fries va 2 ta ichimlik.',
      ingredients: ['Pepperoni Pizza', 'Crispy Chicken', 'Loaded Fries', '2x Coca-Cola 0.5 L'],
      calories: 2450,
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85',
      categorySlug: 'combo',
      price: 145000,
      oldPrice: 175000,
      isPopular: true,
      isNew: true,
      preparationTime: 20,
      customizations: PIZZA_CUSTOMIZATIONS,
    },
  ];

  for (const prod of productsData) {
    const { categorySlug, ...rest } = prod;
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        ...rest,
        categoryId: categoriesMap[categorySlug],
      },
      create: {
        ...rest,
        categoryId: categoriesMap[categorySlug],
      },
    });
  }

  // 6. Promo-kodlar
  await prisma.promotion.upsert({
    where: { code: 'WELCOME15' },
    update: {},
    create: {
      code: 'WELCOME15',
      title: 'Birinchi buyurtma uchun 15% chegirma',
      description: 'THE FAST FOOD ilovasidagi ilk buyurtmangizga maxsus sovg’a',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      minOrderAmount: 50000,
      maxDiscount: 30000,
      isActive: true,
    },
  });

  await prisma.promotion.upsert({
    where: { code: 'LUXURY20' },
    update: {},
    create: {
      code: 'LUXURY20',
      title: '20 000 so’m vaucher',
      description: '100 000 so’mdan yuqori buyurtmalar uchun',
      discountType: DiscountType.FIXED,
      discountValue: 20000,
      minOrderAmount: 100000,
      isActive: true,
    },
  });

  console.log(`Seed muvaffaqiyatli yakunlandi! Filial: ${branch.name}`);
}

main()
  .catch((e) => {
    console.error('Seed xatoligi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });