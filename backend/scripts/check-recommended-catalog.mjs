import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "..");
const catalogPath = resolve(backendRoot, "content/recommended-articles.json");
const minimumReadableSourceChars = 1000;

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const errors = [];

if (!Array.isArray(catalog.articles) || catalog.articles.length === 0) {
  errors.push("recommended-articles.json must contain at least one published article");
}

for (const article of catalog.articles || []) {
  const label = article?.id || "(missing id)";
  if (!containsChinese(article.title)) {
    errors.push(`${label}: title must be localized for Chinese beta users`);
  }
  if (!article.coverImagePath) {
    errors.push(`${label}: coverImagePath is required`);
  } else {
    await expectFile(resolve(backendRoot, "content", article.coverImagePath), `${label}: cover image not found`);
  }

  if (!article.preparedChapterPath) {
    errors.push(`${label}: preparedChapterPath is required`);
    continue;
  }

  const preparedPath = resolve(backendRoot, "content", article.preparedChapterPath);
  await expectFile(preparedPath, `${label}: prepared chapter not found`);

  let chapter;
  try {
    chapter = JSON.parse(await readFile(preparedPath, "utf8"));
  } catch (error) {
    errors.push(`${label}: prepared chapter is not valid JSON: ${error.message}`);
    continue;
  }

  const sourceBlocks = Array.isArray(chapter.source?.blocks) ? chapter.source.blocks : [];
  const sourceText = sourceBlocks.map((block) => String(block.text || "")).join("\n");
  if (sourceText.length < minimumReadableSourceChars) {
    errors.push(`${label}: readable source is too short (${sourceText.length} chars, minimum ${minimumReadableSourceChars})`);
  }
  if (!containsChinese(sourceText)) {
    errors.push(`${label}: readable source should be localized or curated in Chinese`);
  }
  if (!Array.isArray(chapter.units) || chapter.units.length === 0) {
    errors.push(`${label}: prepared chapter must contain units`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Recommended catalog OK: ${catalog.articles.length} published articles`);

async function expectFile(path, message) {
  try {
    await access(path);
  } catch {
    errors.push(message);
  }
}

function containsChinese(value) {
  return /[\u3400-\u9FFF]/.test(String(value || ""));
}
