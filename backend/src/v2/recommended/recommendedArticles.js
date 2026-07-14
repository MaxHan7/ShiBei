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
    filters: buildRecommendedArticleFilters(articles, catalog.filters),
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
    localizedTitle: article.localizedTitle,
    source: article.source,
    localizedSource: article.localizedSource,
    sourceUrl: article.sourceUrl,
    sourceAuthor: article.sourceAuthor,
    coverImageUrl,
    tags: article.tags,
    tagIds: article.tagIds,
    description: article.description,
    localizedDescription: article.localizedDescription,
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

  const localizedTitle = localizedStrings(article.localizedTitle, article.title);
  const title = localizedTitle["zh-Hans"] || stringValue(article.title) || localizedTitle.en;
  if (!title) throw new Error(`Recommended article ${id} must have title`);

  const tagIds = Array.isArray(article.tagIds)
    ? article.tagIds.map(stringValue).filter(Boolean)
    : Array.isArray(article.tags)
      ? article.tags.map(stringValue).filter(Boolean)
      : [];
  if (tagIds.length === 0) throw new Error(`Recommended article ${id} must have tagIds`);

  const tags = Array.isArray(article.tags)
    ? article.tags.map(stringValue).filter(Boolean)
    : [];
  const localizedSource = localizedStrings(article.localizedSource, article.source);
  const localizedDescription = localizedStrings(article.localizedDescription, article.description);

  const preparedChapterPath = stringValue(article.preparedChapterPath);
  const coverImagePath = stringValue(article.coverImagePath);

  return {
    id,
    title,
    localizedTitle,
    source: localizedSource["zh-Hans"] || stringValue(article.source) || "推荐阅读",
    localizedSource,
    sourceUrl: stringValue(article.sourceUrl),
    sourceAuthor: stringValue(article.sourceAuthor),
    tagIds: [...new Set(tagIds)],
    tags: [...new Set(tags.length > 0 ? tags : tagIds)],
    description: localizedDescription["zh-Hans"] || stringValue(article.description),
    localizedDescription,
    coverImagePath: coverImagePath
      ? resolve(dirname(catalogPath), coverImagePath)
      : "",
    preparedChapterPath: preparedChapterPath
      ? resolve(dirname(catalogPath), preparedChapterPath)
      : ""
  };
}

function buildRecommendedArticleFilters(articles, configuredFilters) {
  if (Array.isArray(configuredFilters) && configuredFilters.length > 0) {
    const seen = new Set();
    const filters = configuredFilters.map((filter, index) => {
      const id = stringValue(filter?.id);
      const localizedTitle = localizedStrings(filter?.localizedTitle, filter?.title || id);
      const title = localizedTitle["zh-Hans"] || stringValue(filter?.title) || id;
      if (!id) throw new Error(`Recommended article filter at index ${index} must have id`);
      if (seen.has(id)) throw new Error(`Recommended article filter duplicated: ${id}`);
      seen.add(id);
      return { id, title, localizedTitle };
    });

    const articleTags = new Set(articles.flatMap((article) => article.tagIds));
    for (const filter of filters) {
      if (!articleTags.has(filter.id)) {
        throw new Error(`Recommended article filter has no matching article tag: ${filter.id}`);
      }
    }

    return [
      { id: "all", title: "全部", localizedTitle: { "zh-Hans": "全部", en: "All" } },
      ...filters
    ];
  }

  const tags = [];
  const seen = new Set();

  for (const article of articles) {
    for (const tagId of article.tagIds) {
      if (seen.has(tagId)) continue;
      seen.add(tagId);
      tags.push({ id: tagId, title: tagId, localizedTitle: { "zh-Hans": tagId, en: tagId } });
    }
  }

  return [
    { id: "all", title: "全部", localizedTitle: { "zh-Hans": "全部", en: "All" } },
    ...tags
  ];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function localizedStrings(value, fallback = "") {
  const entries = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [language, text] of Object.entries(value)) {
      const normalizedLanguage = stringValue(language);
      const normalizedText = stringValue(text);
      if (normalizedLanguage && normalizedText) {
        entries[normalizedLanguage] = normalizedText;
      }
    }
  }
  const fallbackText = stringValue(fallback);
  if (fallbackText && !entries["zh-Hans"]) {
    entries["zh-Hans"] = fallbackText;
  }
  return entries;
}
