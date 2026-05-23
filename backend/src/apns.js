import http2 from "node:http2";
import { sign } from "node:crypto";

const TOKEN_TTL_MS = 45 * 60 * 1000;

let cachedAuthToken = "";
let cachedAuthTokenCreatedAt = 0;

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function normalizedPrivateKey() {
  const raw = process.env.APNS_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.APNS_PRIVATE_KEY_BASE64, "base64").toString("utf8")
    : process.env.APNS_PRIVATE_KEY;
  return raw ? raw.replaceAll("\\n", "\n") : "";
}

function apnsConfig() {
  return {
    teamId: process.env.APNS_TEAM_ID || "",
    keyId: process.env.APNS_KEY_ID || "",
    bundleId: process.env.APNS_BUNDLE_ID || "com.maxhan.shibei",
    privateKey: normalizedPrivateKey(),
    environment: process.env.APNS_ENV === "sandbox" ? "sandbox" : "production"
  };
}

export function isAPNSConfigured() {
  const config = apnsConfig();
  return Boolean(config.teamId && config.keyId && config.bundleId && config.privateKey);
}

function makeAuthToken() {
  const config = apnsConfig();
  const now = Date.now();
  if (cachedAuthToken && now - cachedAuthTokenCreatedAt < TOKEN_TTL_MS) {
    return cachedAuthToken;
  }

  const header = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const payload = base64url(JSON.stringify({
    iss: config.teamId,
    iat: Math.floor(now / 1000)
  }));
  const signingInput = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: config.privateKey,
    dsaEncoding: "ieee-p1363"
  });
  cachedAuthToken = `${signingInput}.${base64url(signature)}`;
  cachedAuthTokenCreatedAt = now;
  return cachedAuthToken;
}

function apnsHost(environment) {
  return environment === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
}

function notificationBody(notification, chapter) {
  if (notification.type === "generation_failed") {
    return chapter?.failureReason
      ? `${chapter.title} 生成失败，点击查看原因。`
      : `${chapter?.title || "内容"} 生成失败，点击查看原因。`;
  }
  return `${chapter?.title || "内容"} 已生成，可以开始复习。`;
}

export async function sendGenerationNotification({ token, notification, chapter }) {
  if (!isAPNSConfigured()) return { skipped: true, reason: "apns_not_configured" };
  if (!token?.token || token.platform !== "ios") return { skipped: true, reason: "unsupported_token" };

  const config = apnsConfig();
  const environment = token.environment === "sandbox" ? "sandbox" : config.environment;
  const client = http2.connect(apnsHost(environment));
  const payload = {
    aps: {
      alert: {
        title: notification.type === "generation_failed" ? "生成失败" : "生成完成",
        body: notificationBody(notification, chapter)
      },
      sound: "default",
      "thread-id": chapter?.id || notification.chapterId
    },
    notificationId: notification.id,
    chapterId: notification.chapterId,
    type: notification.type
  };

  return new Promise((resolve) => {
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${token.token}`,
      authorization: `bearer ${makeAuthToken()}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10"
    });

    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("response", (headers) => {
      request.on("end", () => {
        client.close();
        const status = Number(headers[":status"] || 0);
        resolve({
          ok: status >= 200 && status < 300,
          status,
          body
        });
      });
    });
    request.on("error", (error) => {
      client.close();
      resolve({ ok: false, status: 0, body: error instanceof Error ? error.message : "apns_request_failed" });
    });
    request.end(JSON.stringify(payload));
  });
}
