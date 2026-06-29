import "../src/env.js";
import { initDatabase, restoreChapter } from "../src/db.js";

const args = parseArgs(process.argv.slice(2));
const deviceId = args["device-id"] || args.device || "";
const chapterId = args["chapter-id"] || args.chapter || "";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!deviceId || !chapterId) {
  console.error("Usage: node scripts/restore-deleted-chapter.mjs --device-id <device-id> --chapter-id <chapter-id>");
  process.exit(1);
}

await initDatabase();
const chapter = await restoreChapter(deviceId, chapterId);
if (!chapter) {
  console.error(`No soft-deleted chapter found for device=${deviceId} chapter=${chapterId}.`);
  process.exit(2);
}

console.log(JSON.stringify({
  restored: true,
  deviceId,
  chapter: {
    id: chapter.id,
    title: chapter.title,
    status: chapter.status,
    unitCount: Array.isArray(chapter.units) ? chapter.units.length : 0
  }
}, null, 2));

process.exit(0);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
