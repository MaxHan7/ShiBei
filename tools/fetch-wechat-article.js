const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const url = process.argv[2];
const output = process.argv[3] || path.join("articles", "wechat-article.md");

if (!url) {
  console.error("Usage: node tools/fetch-wechat-article.js <url> [output.md]");
  process.exit(1);
}

function cleanText(text) {
  return (text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 1600 },
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    for (let i = 0; i < 5; i += 1) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(500);
    }

    const data = await page.evaluate(() => {
      const title =
        document.querySelector("#activity-name")?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title?.trim() ||
        "未命名公众号文章";
      const author =
        document.querySelector("#js_name")?.textContent?.trim() ||
        document.querySelector(".rich_media_meta_text")?.textContent?.trim() ||
        "";
      const contentNode =
        document.querySelector("#js_content") ||
        document.querySelector(".rich_media_content") ||
        document.body;
      const content = contentNode?.innerText || "";
      return { title, author, content };
    });

    const content = cleanText(data.content);
    const title = cleanText(data.title);
    const author = cleanText(data.author);

    if (!content || content.length < 200) {
      throw new Error(`Fetched content is too short (${content.length} chars).`);
    }

    const markdown = [
      `# ${title}`,
      "",
      author ? `> 作者/来源：${author}` : "",
      `> 原文链接：${url}`,
      "",
      "---",
      "",
      content,
      "",
    ]
      .filter((line) => line !== "")
      .join("\n");

    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, markdown, "utf8");
    console.log(JSON.stringify({ title, author, output, length: content.length }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
