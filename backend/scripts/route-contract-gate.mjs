#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const serverSource = readFileSync(resolve(backendRoot, "src/server.js"), "utf8");

const requiredRoutes = [
  {
    name: "health",
    pattern: /req\.method === "GET" && req\.url === "\/api\/health"/,
    detail: "GET /api/health"
  },
  {
    name: "create_v2_chapter",
    pattern: /req\.method === "POST" && req\.url === "\/api\/v2\/chapters"[\s\S]*handleCreateV2Chapter/,
    detail: "POST /api/v2/chapters"
  },
  {
    name: "list_chapters",
    pattern: /req\.method === "GET" && req\.url === "\/api\/chapters"/,
    detail: "GET /api/chapters"
  },
  {
    name: "get_chapter",
    pattern: /const chapterMatch = req\.url\?\.match\([^;]*api\\\/chapters[\s\S]*if \(chapterMatch && req\.method === "GET"\)/,
    detail: "GET /api/chapters/:id"
  },
  {
    name: "v2_review_session_get_post",
    pattern: /v2ReviewSessionMatch[\s\S]*\/api\\\/v2\\\/chapters\\\/\(\[\^\/\]\+\)\\\/review-session[\s\S]*req\.method === "GET" \|\| req\.method === "POST"/,
    detail: "GET/POST /api/v2/chapters/:id/review-session"
  },
  {
    name: "v2_review_session_actions",
    pattern: /v2ReviewSessionActionMatch[\s\S]*advance\|answer\|feedback-visibility\|source-open\|source-return[\s\S]*req\.method === "POST"/,
    detail: "POST /api/v2/review-sessions/:id/(advance|answer|feedback-visibility|source-open|source-return)"
  },
  {
    name: "v2_source_open_mutation",
    pattern: /case "source-open":[\s\S]*openSourceFromReviewV2/,
    detail: "V2 source-open mutation"
  },
  {
    name: "v2_source_return_mutation",
    pattern: /case "source-return":[\s\S]*returnFromSourceToReviewV2/,
    detail: "V2 source-return mutation"
  },
  {
    name: "list_favorites",
    pattern: /req\.method === "GET" && req\.url === "\/api\/favorites\/questions"/,
    detail: "GET /api/favorites/questions"
  },
  {
    name: "create_favorite",
    pattern: /req\.method === "POST" && req\.url === "\/api\/favorites\/questions"/,
    detail: "POST /api/favorites/questions"
  },
  {
    name: "delete_favorite",
    pattern: /favoriteQuestionMatch[\s\S]*\/api\\\/favorites\\\/questions\\\/\(\[\^\/\]\+\)[\s\S]*req\.method === "DELETE"/,
    detail: "DELETE /api/favorites/questions/:id"
  },
  {
    name: "list_notifications",
    pattern: /req\.method === "GET" && req\.url === "\/api\/notifications"/,
    detail: "GET /api/notifications"
  },
  {
    name: "notification_actions",
    pattern: /notificationActionMatch[\s\S]*\/api\\\/notifications\\\/\(\[\^\/\]\+\)\\\/\(read\|dismiss\)[\s\S]*req\.method === "POST"/,
    detail: "POST /api/notifications/:id/(read|dismiss)"
  },
  {
    name: "push_token",
    pattern: /req\.method === "POST" && req\.url === "\/api\/devices\/push-token"/,
    detail: "POST /api/devices/push-token"
  },
  {
    name: "push_status",
    pattern: /req\.method === "GET" && req\.url === "\/api\/devices\/push-status"/,
    detail: "GET /api/devices/push-status"
  }
];

const checks = requiredRoutes.map((route) => ({
  ...route,
  ok: route.pattern.test(serverSource)
}));

console.log("# Shibei Backend Route Contract Gate");
console.log("");
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error("");
  console.error(`Route contract gate failed: ${failed.map((item) => item.name).join(", ")}`);
  process.exit(1);
}
