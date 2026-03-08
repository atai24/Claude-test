/**
 * download-images.ts
 *
 * Downloads all card and set images from images.pokemontcg.io, mirroring
 * the same path structure so switching to cloud storage later is trivial:
 *
 *   pokemontcg.io:  https://images.pokemontcg.io/base1/4.png
 *   local:          {dest}/base1/4.png          (default ./public/images)
 *   cloud later:    upload {dest}/ to S3/R2 → set IMAGES_BASE_URL and done
 *
 * Usage:
 *   npx tsx scripts/download-images.ts
 *   npx tsx scripts/download-images.ts --dest ./public/images --concurrency 8
 *
 * Flags:
 *   --dest          Output directory (default: ./public/images)
 *   --concurrency   Parallel downloads (default: 8, max: 20)
 *   --force         Re-download even if file already exists on disk
 *   --sets-only     Only download set logos and symbols, skip card images
 *
 * Resume-safe: existing files are skipped unless --force is passed.
 * Errors are collected and printed at the end — a single 404 won't abort the run.
 */

import { PrismaClient } from "@prisma/client";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { imageRelativePath } from "../src/image-url";

// ─────────────────────────────────────────────
// CLI flags
// ─────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name: string, fallback: string): string {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1]! : fallback;
}

const DEST = path.resolve(flag("--dest", "./public/images"));
const CONCURRENCY = Math.min(20, Math.max(1, parseInt(flag("--concurrency", "8"), 10)));
const FORCE = args.includes("--force");
const SETS_ONLY = args.includes("--sets-only");

// ─────────────────────────────────────────────
// Concurrency pool
// ─────────────────────────────────────────────

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ─────────────────────────────────────────────
// HTTP download
// ─────────────────────────────────────────────

function downloadFile(url: string, dest: string): Promise<"downloaded" | "skipped" | "error"> {
  return new Promise((resolve) => {
    if (!FORCE && fs.existsSync(dest)) {
      resolve("skipped");
      return;
    }

    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });

    const tmp = `${dest}.tmp`;
    const file = fs.createWriteStream(tmp);

    function cleanup(err: unknown) {
      file.destroy();
      try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      if (err instanceof Error && err.message.includes("404")) {
        resolve("error"); // surface 404s as errors but don't throw
      } else {
        resolve("error");
      }
    }

    function request(reqUrl: string, redirects = 0): void {
      if (redirects > 5) { cleanup(new Error("Too many redirects")); return; }

      const protocol = reqUrl.startsWith("https") ? https : http;
      protocol.get(reqUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) {
          cleanup(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            try {
              fs.renameSync(tmp, dest);
              resolve("downloaded");
            } catch (e) {
              cleanup(e);
            }
          });
        });
      }).on("error", cleanup).setTimeout(30_000, function () {
        this.destroy(new Error("Timeout"));
      });
    }

    request(url);
  });
}

// ─────────────────────────────────────────────
// Collect image URLs from DB
// ─────────────────────────────────────────────

interface ImageTask {
  url: string;
  dest: string;
  label: string; // for error reporting
}

async function collectTasks(prisma: PrismaClient): Promise<ImageTask[]> {
  const tasks: ImageTask[] = [];

  // Set logos and symbols
  const sets = await prisma.set.findMany({
    select: { id: true, name: true, logoUrl: true, symbolUrl: true },
  });

  for (const set of sets) {
    for (const url of [set.logoUrl, set.symbolUrl]) {
      if (!url) continue;
      const rel = imageRelativePath(url);
      if (!rel) continue;
      tasks.push({ url, dest: path.join(DEST, rel), label: `set:${set.id} ${path.basename(rel)}` });
    }
  }

  if (SETS_ONLY) return tasks;

  // Card images — stream in batches to avoid loading 15k records at once
  const BATCH = 500;
  let cursor: string | undefined;
  let total = 0;

  while (true) {
    const cards = await prisma.card.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, imageSmall: true, imageLarge: true },
    });

    if (cards.length === 0) break;
    cursor = cards[cards.length - 1]!.id;
    total += cards.length;

    for (const card of cards) {
      for (const url of [card.imageSmall, card.imageLarge]) {
        if (!url) continue;
        const rel = imageRelativePath(url);
        if (!rel) continue;
        tasks.push({ url, dest: path.join(DEST, rel), label: `card:${card.id} ${path.basename(rel)}` });
      }
    }
  }

  process.stdout.write(`\n`);
  console.log(`  Collected tasks from ${sets.length} sets, ${total} cards`);
  return tasks;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

const prisma = new PrismaClient({ log: ["error"] });

async function main(): Promise<void> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" Pokémon TCG — Image Downloader");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Destination:  ${DEST}`);
  console.log(`  Concurrency:  ${CONCURRENCY}`);
  console.log(`  Force:        ${FORCE}`);
  console.log(`  Sets only:    ${SETS_ONLY}`);
  console.log();

  // Mirrors pokemontcg.io path structure:
  //   images.pokemontcg.io/base1/4.png      → {DEST}/base1/4.png
  //   images.pokemontcg.io/base1/4_hires.png → {DEST}/base1/4_hires.png
  //   images.pokemontcg.io/base1/logo.png    → {DEST}/base1/logo.png
  //   images.pokemontcg.io/base1/symbol.png  → {DEST}/base1/symbol.png
  //
  // To serve locally, point Express static middleware at DEST.
  // To move to cloud: upload DEST contents to S3/R2/B2 preserving paths,
  //   then set IMAGES_BASE_URL=https://your-bucket.example.com — done.

  console.log("[1/2] Collecting image URLs from database…");
  const tasks = await collectTasks(prisma);
  console.log(`      ${tasks.length} images total\n`);

  if (tasks.length === 0) {
    console.log("Nothing to download. Run pnpm db:seed first.");
    return;
  }

  console.log("[2/2] Downloading…");

  let downloaded = 0;
  let skipped = 0;
  const errors: string[] = [];
  let done = 0;

  function printProgress() {
    const pct = Math.round((done / tasks.length) * 100);
    process.stdout.write(
      `\r      ${done}/${tasks.length} (${pct}%) — ✓ ${downloaded} new  ⏭  ${skipped} skipped  ✗ ${errors.length} errors   `
    );
  }

  await pool(tasks, CONCURRENCY, async (task) => {
    const result = await downloadFile(task.url, task.dest);
    done++;
    if (result === "downloaded") downloaded++;
    else if (result === "skipped") skipped++;
    else errors.push(`${task.label}: ${task.url}`);
    printProgress();
  });

  process.stdout.write("\n\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" Done");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Downloaded:  ${downloaded}`);
  console.log(`  Skipped:     ${skipped}  (already existed)`);
  console.log(`  Errors:      ${errors.length}`);
  console.log(`  Location:    ${DEST}`);

  if (errors.length > 0) {
    console.log("\nFailed downloads:");
    errors.slice(0, 30).forEach((e) => console.log(`  - ${e}`));
    if (errors.length > 30) console.log(`  … and ${errors.length - 30} more`);
  }

  console.log(`
Next steps:
  • Serve locally: add  app.use('/images', express.static('${DEST}'))  to your server
    and set  IMAGES_BASE_URL=http://localhost:3001/images

  • Move to cloud: upload ${DEST}/ to S3/R2/B2 preserving paths, then
    set  IMAGES_BASE_URL=https://your-bucket.example.com
`);
}

main()
  .catch((err) => { console.error("Fatal:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
