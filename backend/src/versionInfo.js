import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadRecommendedArticleCatalog,
  serializeRecommendedArticleCatalogForClient
} from "./v2/recommended/recommendedArticles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RECOMMENDED_CATALOG_PATH = resolve(__dirname, "../content/recommended-articles.json");

export async function buildVersionInfo({
  startedAt = "",
  env = process.env,
  catalogPath = env.SHIBEI_RECOMMENDED_ARTICLES_PATH || DEFAULT_RECOMMENDED_CATALOG_PATH
} = {}) {
  const recommendedCatalog = await buildRecommendedCatalogVersion({ catalogPath });

  return {
    service: "recallo-api",
    startedAt,
    nodeEnv: env.NODE_ENV || "",
    git: {
      commit: firstPresent(
        env.RAILWAY_GIT_COMMIT_SHA,
        env.GIT_COMMIT_SHA,
        env.GITHUB_SHA,
        env.VERCEL_GIT_COMMIT_SHA
      ),
      branch: firstPresent(
        env.RAILWAY_GIT_BRANCH,
        env.GIT_BRANCH,
        env.GITHUB_REF_NAME,
        env.VERCEL_GIT_COMMIT_REF
      )
    },
    railway: {
      environment: env.RAILWAY_ENVIRONMENT_NAME || "",
      deploymentId: env.RAILWAY_DEPLOYMENT_ID || "",
      serviceId: env.RAILWAY_SERVICE_ID || "",
      projectId: env.RAILWAY_PROJECT_ID || ""
    },
    recommendedCatalog
  };
}

export async function buildRecommendedCatalogVersion({ catalogPath = DEFAULT_RECOMMENDED_CATALOG_PATH } = {}) {
  const raw = await readFile(catalogPath, "utf8");
  const catalog = await loadRecommendedArticleCatalog({ catalogPath });
  const clientCatalog = serializeRecommendedArticleCatalogForClient(catalog);

  return {
    schemaVersion: catalog.schemaVersion,
    hash: createHash("sha256").update(raw).digest("hex"),
    path: catalogPath,
    articleCount: clientCatalog.articles.length,
    filters: clientCatalog.filters.map((filter) => filter.title),
    articleIds: clientCatalog.articles.map((article) => article.id)
  };
}

function firstPresent(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}
