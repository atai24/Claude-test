import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { setsRouter } from "./routes/sets";
import { cardsRouter } from "./routes/cards";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "@pokemon-tcg/db";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/sets", setsRouter);
app.use("/api/cards", cardsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
