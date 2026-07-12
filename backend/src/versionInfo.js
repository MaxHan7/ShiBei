import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  loadRecommendedArticleCatalog,
  serializeRecommendedArticleCatalogForClient
} from "./v2/recommended/recommendedArticles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RECOMMENDED_CATALOG_PATH = resolve(__dirname, "../content/recommended-articles.json");
const execFileAsync = promisify(execFile);

export async function buildVersionInfo({
  startedAt = "",
  env = process.env,
  catalogPath = env.SHIBEI_RECOMMENDED_ARTICLES_PATH || DEFAULT_RECOMMENDED_CATALOG_PATH,
  readGitInfo = readLocalGitInfo
} = {}) {
  const recommendedCatalog = await buildRecommendedCatalogVersion({ catalogPath });
  const envGitCommit = firstPresent(
    env.SHIBEI_DEPLOY_GIT_COMMIT_SHA,
    env.SHIBEI_GIT_COMMIT_SHA,
    env.SOURCE_VERSION,
    env.COMMIT_SHA,
    env.RAILWAY_GIT_COMMIT_SHA,
    env.GIT_COMMIT_SHA,
    env.GITHUB_SHA,
    env.VERCEL_GIT_COMMIT_SHA
  );
  const envGitBranch = firstPresent(
    env.SHIBEI_DEPLOY_GIT_BRANCH,
    env.SHIBEI_GIT_BRANCH,
    env.SOURCE_BRANCH,
    env.BRANCH_NAME,
    env.RAILWAY_GIT_BRANCH,
    env.GIT_BRANCH,
    env.GITHUB_REF_NAME,
    env.VERCEL_GIT_COMMIT_REF
  );
  const fallbackGit = envGitCommit && envGitBranch
    ? { commit: "", branch: "" }
    : await safeReadGitInfo(readGitInfo);

  return {
    service: "recallo-api",
    startedAt,
    nodeEnv: env.NODE_ENV || "",
    git: {
      commit: firstPresent(envGitCommit, fallbackGit.commit),
      branch: firstPresent(envGitBranch, fallbackGit.branch)
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

async function safeReadGitInfo(readGitInfo) {
  try {
    return await readGitInfo();
  } catch {
    return { commit: "", branch: "" };
  }
}

async function readLocalGitInfo() {
  const [commit, branch] = await Promise.all([
    readGitValue(["rev-parse", "HEAD"]),
    readGitValue(["branch", "--show-current"])
  ]);
  return { commit, branch };
}

async function readGitValue(args) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: resolve(__dirname, "../.."),
      timeout: 2_000
    });
    return stdout.trim();
  } catch {
    return "";
  }
}
