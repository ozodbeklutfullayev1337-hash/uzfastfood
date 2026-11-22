import { Request } from "express";

export function extractTelegramUser(req: Request) {
  const initData = req.header("x-telegram-init-data");
  if (initData) {
    try {
      const params = new URLSearchParams(initData);
      const userRaw = params.get("user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        return {
          telegramId: String(u.id),
          firstName: u.first_name || "Mijoz",
          lastName: u.last_name || null,
          username: u.username || null,
        };
      }
    } catch {}
  }
  return {
    telegramId: String(req.header("x-dev-telegram-id") || "777000111"),
    firstName: req.header("x-dev-first-name") || "Ozodbek",
    lastName: null,
    username: null,
  };
}
