import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  cloneRecommendedArticleChapter,
  getRecommendedArticleCoverPath,
  getRecommendedArticleDetail,
  importRecommendedArticleChapter,
  loadRecommendedArticleCatalog,
  normalizeRecommendedArticleCatalog,
  serializeRecommendedArticleCatalogForClient
} from "./recommendedArticles.js";

const NOW = "2026-06-27T00:00:00.000Z";

test("loads recommended articles with configured top-level filters", async () => {
  const { catalogPath } = await writeTempCatalog();
  const catalog = await loadRecommendedArticleCatalog({ catalogPath });
  const clientCatalog = serializeRecommendedArticleCatalogForClient(catalog, {
    baseUrl: "https://example.test"
  });

  assert.deepEqual(clientCatalog.filters, [
    { id: "all", title: "全部" },
    { id: "产品", title: "产品" },
    { id: "学习", title: "学习" }
  ]);
  assert.equal(clientCatalog.articles.length, 1);
  assert.equal(clientCatalog.articles[0].id, "article-001");
  assert.equal(clientCatalog.articles[0].hasPreparedChapter, true);
  assert.equal(
    clientCatalog.articles[0].coverImageUrl,
    "https://example.test/api/v2/recommended-articles/article-001/cover"
  );
});

test("rejects configured filters that do not match any article tag", () => {
  assert.throws(
    () =>
      normalizeRecommendedArticleCatalog({
        filters: [{ id: "不存在", title: "不存在" }],
        articles: [buildCatalogArticle()]
      }),
    /no matching article tag/
  );
});

test("loads recommended article cover path from the catalog", async () => {
  const { catalogPath, coverPath } = await writeTempCatalog();

  const result = await getRecommendedArticleCoverPath({
    articleId: "article-001",
    catalogPath
  });

  assert.equal(result, coverPath);
});

test("rejects duplicated recommended article ids", () => {
  assert.throws(
    () =>
      normalizeRecommendedArticleCatalog({
        articles: [
          buildCatalogArticle({ id: "same" }),
          buildCatalogArticle({ id: "same" })
        ]
      }),
    /duplicated/
  );
});

test("clones a prepared recommended chapter with fresh identity and no review session", () => {
  const article = buildCatalogArticle({ id: "article-001" });
  const chapter = buildPreparedChapter();
  const cloned = cloneRecommendedArticleChapter(article, chapter, {
    chapterId: "chapter-user-copy",
    now: NOW
  });

  assert.equal(cloned.id, "chapter-user-copy");
  assert.equal(cloned.status, "completed");
  assert.equal(cloned.title, chapter.title);
  assert.equal(cloned.v2ReviewSession, null);
  assert.equal(cloned.reviewSession, null);
  assert.equal(cloned.generationMeta.recommendedArticleId, "article-001");
  assert.equal(cloned.generationMeta.originalPreparedChapterId, chapter.id);
  assert.equal(cloned.createdAt, NOW);
  assert.equal(chapter.id, "prepared-chapter");
});

test("imports a recommended article chapter through the storage service", async () => {
  const { catalogPath } = await writeTempCatalog();
  const savedChapters = [];

  const result = await importRecommendedArticleChapter({
    articleId: "article-001",
    deviceId: "device-001",
    catalogPath,
    now: NOW,
    services: {
      async upsertChapter(deviceId, chapter) {
        savedChapters.push({ deviceId, chapter });
        return chapter;
      }
    }
  });

  assert.equal(result.article.id, "article-001");
  assert.equal(result.chapter.status, "completed");
  assert.equal(result.chapter.generationMeta.recommendedArticleId, "article-001");
  assert.equal(savedChapters[0].deviceId, "device-001");
});

test("loads recommended article detail with the prepared chapter preview", async () => {
  const { catalogPath } = await writeTempCatalog();

  const result = await getRecommendedArticleDetail({
    articleId: "article-001",
    catalogPath
  });

  assert.equal(result.article.id, "article-001");
  assert.equal(result.chapter.id, "prepared-chapter");
  assert.equal(result.chapter.status, "completed");
  assert.equal(result.chapter.generationMeta.recommendedArticleId, "article-001");
});

async function writeTempCatalog() {
  const dir = await mkdtemp(join(tmpdir(), "shibei-recommended-"));
  const chapterPath = join(dir, "prepared-chapter.json");
  const coverPath = join(dir, "cover.svg");
  const catalogPath = join(dir, "catalog.json");

  await writeFile(chapterPath, JSON.stringify(buildPreparedChapter()), "utf8");
  await writeFile(coverPath, "<svg xmlns=\"http://www.w3.org/2000/svg\"/>", "utf8");
  await writeFile(
    catalogPath,
    JSON.stringify({
      schemaVersion: "recommended_articles_seed_1",
      filters: [
        { id: "产品", title: "产品" },
        { id: "学习", title: "学习" }
      ],
      articles: [
        buildCatalogArticle({
          coverImagePath: "cover.svg",
          preparedChapterPath: "prepared-chapter.json"
        })
      ]
    }),
    "utf8"
  );

  return { catalogPath, chapterPath, coverPath };
}

function buildCatalogArticle(overrides = {}) {
  return {
    id: "article-001",
    title: "游戏化体验设计",
    source: "微信公众号",
    sourceUrl: "https://example.com/article",
    sourceAuthor: "作者",
    coverImagePath: "cover.svg",
    tags: ["产品", "学习"],
    description: "一篇适合预生成复习路径的好文。",
    preparedChapterPath: "prepared-chapter.json",
    ...overrides
  };
}

function buildPreparedChapter() {
  return {
    schemaVersion: "v2_review_path_1",
    id: "prepared-chapter",
    status: "completed",
    displayStatusText: "已生成",
    title: "游戏化体验设计",
    source: {
      type: "wechat_article",
      title: "游戏化体验设计",
      author: "作者",
      account: "作者",
      accountOrDomain: "作者",
      url: "https://example.com/article",
      rawInput: "https://example.com/article",
      blocks: [{ id: "b1", type: "paragraph", text: "正文" }]
    },
    summaryCard: { text: "章节概要" },
    units: [
      {
        id: "unit-1",
        title: "知识点",
        sourceAnchor: { id: "anchor-1", label: "正文", blockIds: ["b1"], quote: "正文" },
        overview: { text: "知识点概要" },
        questions: [],
        summary: { text: "单元完成" }
      }
    ],
    chapterSummary: {
      title: "章节完成",
      statsText: "共 1 个知识点",
      encouragementText: "完成得不错。"
    },
    generationMeta: {
      schemaVersion: "v2_review_path_queued_1"
    },
    v2ReviewSession: { id: "old-session" },
    reviewSession: { id: "old-legacy-session" },
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  };
}
