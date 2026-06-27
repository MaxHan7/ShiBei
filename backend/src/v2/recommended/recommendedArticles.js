import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createId } from "../../chapterGeneration.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CATALOG_PATH = resolve(__dirname, "../../../content/recommended-articles.json");

export async function loadRecommendedArticleCatalog({
  catalogPath = process.env.SHIBEI_RECOMMENDED_ARTICLES_PATH || DEFAULT_CATALOG_PATH
} = {}) {
  const raw = await readFile(catalogPath, "utf8");
  const parsed = JSON.parse(raw);
  return normalizeRecommendedArticleCatalog(parsed, { catalogPath });
}

export function normalizeRecommendedArticleCatalog(catalog, { catalogPath = DEFAULT_CATALOG_PATH } = {}) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("Recommended article catalog must be an object");
  }
  if (!Array.isArray(catalog.articles)) {
    throw new Error("Recommended article catalog must contain articles[]");
  }

  const seenIds = new Set();
  const articles = catalog.articles.map((article, index) =>
    normalizeRecommendedArticle(article, { index, seenIds, catalogPath })
  );

  return {
    schemaVersion: String(catalog.schemaVersion || "recommended_articles_seed_1"),
    filters: buildRecommendedArticleFilters(articles),
    articles
  };
}

export async function importRecommendedArticleChapter({
  articleId,
  deviceId,
  services,
  catalogPath,
  now = new Date().toISOString()
} = {}) {
  if (!articleId) throw new Error("recommended article id is required");
  if (!deviceId) throw new Error("device id is required");
  if (!services?.upsertChapter) throw new Error("upsertChapter service is required");

  const catalog = await loadRecommendedArticleCatalog({ catalogPath });
  const article = catalog.articles.find((candidate) => candidate.id === articleId);
  if (!article) {
    const error = new Error("推荐文章不存在。");
    error.statusCode = 404;
    error.errorCode = "recommended_article_not_found";
    throw error;
  }

  const preparedChapter = await loadPreparedRecommendedChapter(article);
  const chapter = cloneRecommendedArticleChapter(article, preparedChapter, { now });
  const savedChapter = await services.upsertChapter(deviceId, chapter);

  return {
    article,
    chapter: savedChapter
  };
}

export async function getRecommendedArticleDetail({
  articleId,
  catalogPath
} = {}) {
  if (!articleId) throw new Error("recommended article id is required");

  const catalog = await loadRecommendedArticleCatalog({ catalogPath });
  const article = catalog.articles.find((candidate) => candidate.id === articleId);
  if (!article) {
    const error = new Error("推荐文章不存在。");
    error.statusCode = 404;
    error.errorCode = "recommended_article_not_found";
    throw error;
  }

  const preparedChapter = await loadPreparedRecommendedChapter(article);

  return {
    article,
    chapter: cloneRecommendedArticleChapter(article, preparedChapter, {
      chapterId: preparedChapter.id || article.id,
      now: preparedChapter.updatedAt || preparedChapter.createdAt || new Date().toISOString()
    })
  };
}

export async function getRecommendedArticleCoverPath({
  articleId,
  catalogPath
} = {}) {
  if (!articleId) throw new Error("recommended article id is required");

  const catalog = await loadRecommendedArticleCatalog({ catalogPath });
  const article = catalog.articles.find((candidate) => candidate.id === articleId);
  if (!article) {
    const error = new Error("推荐文章不存在。");
    error.statusCode = 404;
    error.errorCode = "recommended_article_not_found";
    throw error;
  }
  if (!article.coverImagePath) {
    const error = new Error("推荐文章还没有配置封面。");
    error.statusCode = 404;
    error.errorCode = "recommended_article_cover_not_found";
    throw error;
  }

  return article.coverImagePath;
}

export function serializeRecommendedArticleCatalogForClient(catalog, options = {}) {
  return {
    filters: catalog.filters,
    articles: catalog.articles.map((article) => serializeRecommendedArticleForClient(article, options))
  };
}

export function serializeRecommendedArticleForClient(article, { baseUrl = "" } = {}) {
  const coverImageUrl = article.coverImagePath && baseUrl
    ? `${baseUrl}/api/v2/recommended-articles/${encodeURIComponent(article.id)}/cover`
    : "";

  return {
    id: article.id,
    title: article.title,
    source: article.source,
    sourceUrl: article.sourceUrl,
    sourceAuthor: article.sourceAuthor,
    coverImageUrl,
    tags: article.tags,
    description: article.description,
    hasPreparedChapter: Boolean(article.preparedChapterPath)
  };
}

export function cloneRecommendedArticleChapter(
  article,
  preparedChapter,
  { chapterId = createId("chapter"), now = new Date().toISOString() } = {}
) {
  if (!preparedChapter || typeof preparedChapter !== "object" || Array.isArray(preparedChapter)) {
    throw new Error("Prepared recommended article chapter must be an object");
  }

  const source = {
    ...(preparedChapter.source || {}),
    title: preparedChapter.source?.title || article.title,
    author: preparedChapter.source?.author || article.sourceAuthor || "",
    account: preparedChapter.source?.account || article.sourceAuthor || "",
    accountOrDomain: preparedChapter.source?.accountOrDomain || article.sourceAuthor || "",
    url: preparedChapter.source?.url || article.sourceUrl || "",
    rawInput: preparedChapter.source?.rawInput || article.sourceUrl || ""
  };

  return {
    ...structuredClone(preparedChapter),
    id: chapterId,
    title: preparedChapter.title || article.title,
    status: "completed",
    displayStatusText: "已生成",
    source,
    sourceType: source.type || "wechat_article",
    v2ReviewSession: null,
    reviewSession: null,
    generationProgress: null,
    generationMeta: {
      ...(preparedChapter.generationMeta || {}),
      importedFromRecommendedArticle: true,
      recommendedArticleId: article.id,
      originalPreparedChapterId: preparedChapter.id || "",
      importedAt: now
    },
    createdAt: now,
    updatedAt: now
  };
}

async function loadPreparedRecommendedChapter(article) {
  if (!article.preparedChapterPath) {
    const error = new Error("推荐文章还没有准备好的复习章节。");
    error.statusCode = 422;
    error.errorCode = "recommended_article_not_prepared";
    throw error;
  }

  const raw = await readFile(article.preparedChapterPath, "utf8");
  return JSON.parse(raw);
}

function normalizeRecommendedArticle(article, { index, seenIds, catalogPath }) {
  if (!article || typeof article !== "object" || Array.isArray(article)) {
    throw new Error(`Recommended article at index ${index} must be an object`);
  }

  const id = stringValue(article.id);
  if (!id) throw new Error(`Recommended article at index ${index} must have id`);
  if (seenIds.has(id)) throw new Error(`Recommended article id duplicated: ${id}`);
  seenIds.add(id);

  const title = stringValue(article.title);
  if (!title) throw new Error(`Recommended article ${id} must have title`);

  const tags = Array.isArray(article.tags)
    ? article.tags.map(stringValue).filter(Boolean)
    : [];
  if (tags.length === 0) throw new Error(`Recommended article ${id} must have tags`);

  const preparedChapterPath = stringValue(article.preparedChapterPath);
  const coverImagePath = stringValue(article.coverImagePath);

  return {
    id,
    title,
    source: stringValue(article.source) || "推荐阅读",
    sourceUrl: stringValue(article.sourceUrl),
    sourceAuthor: stringValue(article.sourceAuthor),
    tags: [...new Set(tags)],
    description: stringValue(article.description),
    coverImagePath: coverImagePath
      ? resolve(dirname(catalogPath), coverImagePath)
      : "",
    preparedChapterPath: preparedChapterPath
      ? resolve(dirname(catalogPath), preparedChapterPath)
      : ""
  };
}

function buildRecommendedArticleFilters(articles) {
  const tags = [];
  const seen = new Set();

  for (const article of articles) {
    for (const tag of article.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      tags.push({ id: tag, title: tag });
    }
  }

  return [{ id: "all", title: "全部" }, ...tags];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
