import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import publicRoutes from "./routes/publicRoutes";
import adminRoutes from "./routes/adminRoutes";
import { startTelegramBot } from "./bot/telegramBot";
import { startHumoListener } from "./bot/humoListener";

const app = express();
const server = http.createServer(app);
export const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log("Backend running on http://localhost:" + PORT);
  startTelegramBot();
  startHumoListener();
});
