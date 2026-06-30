import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { buildVersionInfo } from "../versionInfo.js";

test("builds deploy version info with git and recommended catalog fingerprint", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "recallo-version-info-"));
  const preparedChapterPath = join(tempDir, "prepared.json");
  const coverPath = join(tempDir, "cover.png");
  const catalogPath = join(tempDir, "recommended-articles.json");

  await writeFile(coverPath, "png");
  await writeFile(preparedChapterPath, JSON.stringify({ id: "prepared", units: [] }));
  await writeFile(
    catalogPath,
    JSON.stringify({
      schemaVersion: "test_catalog_1",
      filters: [{ id: "AI", title: "AI" }],
      articles: [{
        id: "article-001",
        title: "测试文章",
        source: "测试来源",
        sourceUrl: "https://example.test/article",
        sourceAuthor: "作者",
        tags: ["AI"],
        description: "描述",
        coverImagePath: coverPath,
        preparedChapterPath
      }]
    })
  );

  const version = await buildVersionInfo({
    startedAt: "2026-06-30T00:00:00.000Z",
    catalogPath,
    env: {
      NODE_ENV: "production",
      RAILWAY_GIT_COMMIT_SHA: "abc123",
      RAILWAY_GIT_BRANCH: "master",
      RAILWAY_ENVIRONMENT_NAME: "production",
      RAILWAY_DEPLOYMENT_ID: "deployment-001",
      RAILWAY_SERVICE_ID: "service-001",
      RAILWAY_PROJECT_ID: "project-001"
    }
  });

  assert.equal(version.service, "recallo-api");
  assert.equal(version.nodeEnv, "production");
  assert.equal(version.git.commit, "abc123");
  assert.equal(version.git.branch, "master");
  assert.equal(version.railway.deploymentId, "deployment-001");
  assert.equal(version.recommendedCatalog.schemaVersion, "test_catalog_1");
  assert.match(version.recommendedCatalog.hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(version.recommendedCatalog.filters, ["全部", "AI"]);
  assert.deepEqual(version.recommendedCatalog.articleIds, ["article-001"]);
  assert.equal(version.recommendedCatalog.articleCount, 1);
});
