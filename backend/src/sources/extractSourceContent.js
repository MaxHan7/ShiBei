const MIN_ARTICLE_TEXT_LENGTH = 200;

export async function extractSourceContent(input) {
  const sourceType = input?.sourceType;
  if (sourceType === "text") {
    return {
      sourceType: "text",
      sourceTitle: input.sourceTitle || "",
      sourceUrl: input.sourceUrl || "",
      sourceAccount: input.sourceAccount || "",
      rawText: String(input.rawText || "").trim()
    };
  }

  if (sourceType === "video_link") {
    throw sourceFailure(
      "failed_extract_video",
      "当前 Demo 暂未接入视频文本提取。请先粘贴视频摘要、字幕或笔记文本。"
    );
  }

  if (sourceType !== "article_link") {
    throw sourceFailure("failed_extract_article", "暂不支持这种内容来源。请粘贴文字或文章链接。");
  }

  const sourceUrl = normalizeUrl(input.sourceUrl || input.rawText);
  if (isWechatArticleUrl(sourceUrl)) {
    return extractWechatArticle(sourceUrl);
  }
  return extractWebArticle(sourceUrl);
}

export function isLikelyUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isVideoUrl(value) {
  if (!isLikelyUrl(value)) return false;
  const hostname = new URL(String(value).trim()).hostname.toLowerCase();
  return [
    "bilibili.com",
    "www.bilibili.com",
    "m.bilibili.com",
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "v.douyin.com",
    "douyin.com",
    "www.douyin.com",
    "xiaohongshu.com",
    "www.xiaohongshu.com"
  ].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  if (!isLikelyUrl(text)) {
    throw sourceFailure("failed_extract_article", "这不是有效的文章链接。请粘贴 http 或 https 开头的链接。");
  }
  return text;
}

function isWechatArticleUrl(value) {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname === "mp.weixin.qq.com";
}

async function extractWebArticle(sourceUrl) {
  let response;
  try {
    response = await fetch(sourceUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow"
    });
  } catch (error) {
    throw sourceFailure("failed_extract_article", `文章链接无法访问：${error.message}`);
  }

  if (!response.ok) {
    throw sourceFailure("failed_extract_article", `文章链接无法访问：HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw sourceFailure("failed_extract_article", "这个链接不像可提取正文的网页文章。");
  }

  const html = await response.text();
  const extracted = extractArticleFromHtml(html, sourceUrl);
  ensureArticleText(extracted.rawText);
  return extracted;
}

async function extractWechatArticle(sourceUrl) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw sourceFailure("failed_extract_article", "当前环境没有可用的 Playwright，暂时无法抓取公众号正文。");
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined
    });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 1600 }
    });

    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      const title =
        document.querySelector("#activity-name")?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title?.trim() ||
        "";
      const account =
        document.querySelector("#js_name")?.textContent?.trim() ||
        document.querySelector(".rich_media_meta_text")?.textContent?.trim() ||
        "";
      const contentNode =
        document.querySelector("#js_content") ||
        document.querySelector(".rich_media_content") ||
        document.body;
      return {
        title,
        account,
        rawText: contentNode?.innerText || ""
      };
    });

    const rawText = cleanExtractedText(data.rawText);
    ensureArticleText(rawText);
    return {
      sourceType: "article_link",
      sourceTitle: cleanExtractedText(data.title) || "公众号文章",
      sourceUrl,
      sourceAccount: cleanExtractedText(data.account) || "mp.weixin.qq.com",
      rawText
    };
  } catch (error) {
    if (error?.code) throw error;
    throw sourceFailure("failed_extract_article", `公众号文章正文提取失败：${error.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export function extractArticleFromHtml(html, sourceUrl) {
  const withoutNoise = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const title = decodeHtml(
    firstMatch(withoutNoise, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      firstMatch(withoutNoise, /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      firstMatch(withoutNoise, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
      ""
  );
  const account = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const articleHtml =
    firstMatch(withoutNoise, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
    firstMatch(withoutNoise, /<main[^>]*>([\s\S]*?)<\/main>/i) ||
    firstMatch(withoutNoise, /<body[^>]*>([\s\S]*?)<\/body>/i) ||
    withoutNoise;
  const text = htmlToText(articleHtml);

  return {
    sourceType: "article_link",
    sourceTitle: cleanExtractedText(title) || account,
    sourceUrl,
    sourceAccount: account,
    rawText: text
  };
}

function htmlToText(html) {
  return cleanExtractedText(
    decodeHtml(
      String(html || "")
        .replace(/<(h[1-6]|p|div|section|article|li|br|blockquote)[^>]*>/gi, "\n")
        .replace(/<\/(h[1-6]|p|div|section|article|li|blockquote)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function cleanExtractedText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1] || "";
}

function ensureArticleText(rawText) {
  if (String(rawText || "").trim().length < MIN_ARTICLE_TEXT_LENGTH) {
    throw sourceFailure("failed_extract_article", "文章正文提取失败：可用正文太短，暂时无法生成复习题。");
  }
}

function sourceFailure(status, message) {
  const error = new Error(message);
  error.code = status;
  error.status = status;
  return error;
}
