import { createPublicKey, verify } from "node:crypto";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const JWKS_CACHE_MS = 60 * 60 * 1000;

let jwksCache = null;

export class AppleAuthError extends Error {
  constructor(message, statusCode = 401, errorCode = "apple_auth_invalid") {
    super(message);
    this.name = "AppleAuthError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export async function verifyAppleIdentityToken(identityToken, options = {}) {
  const expectedAudience = String(
    options.audience
      || process.env.RECALLO_APPLE_CLIENT_ID
      || process.env.APPLE_CLIENT_ID
      || process.env.IOS_BUNDLE_ID
      || "com.maxhan.shibei"
  ).trim();
  if (!expectedAudience) {
    throw new AppleAuthError("Apple 登录配置缺少客户端标识。", 500, "apple_auth_not_configured");
  }

  const token = String(identityToken || "").trim();
  if (!token) throw new AppleAuthError("缺少 Apple 登录凭证。", 400, "apple_identity_token_required");

  const parsed = parseJwt(token);
  if (parsed.header.alg !== "RS256") {
    throw new AppleAuthError("Apple 登录凭证签名算法不受支持。");
  }
  if (!parsed.header.kid) {
    throw new AppleAuthError("Apple 登录凭证缺少 key id。");
  }

  const jwk = await fetchAppleJwk(parsed.header.kid, options);
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const signatureIsValid = verify(
    "RSA-SHA256",
    Buffer.from(parsed.signingInput),
    publicKey,
    base64UrlToBuffer(parsed.signature)
  );
  if (!signatureIsValid) {
    throw new AppleAuthError("Apple 登录凭证签名校验失败。");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = parsed.payload;
  if (payload.iss !== APPLE_ISSUER) {
    throw new AppleAuthError("Apple 登录凭证来源无效。");
  }
  if (!audienceMatches(payload.aud, expectedAudience)) {
    throw new AppleAuthError("Apple 登录凭证客户端不匹配。");
  }
  if (!payload.sub) {
    throw new AppleAuthError("Apple 登录凭证缺少用户标识。");
  }
  if (Number(payload.exp || 0) <= now) {
    throw new AppleAuthError("Apple 登录凭证已过期。");
  }
  if (payload.nbf !== undefined && Number(payload.nbf) > now + 60) {
    throw new AppleAuthError("Apple 登录凭证尚未生效。");
  }

  return {
    provider: "apple",
    providerSubject: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : "",
    claims: payload
  };
}

export function parseJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new AppleAuthError("Apple 登录凭证格式无效。", 400, "apple_identity_token_malformed");
  }
  return {
    header: parseBase64UrlJson(parts[0], "header"),
    payload: parseBase64UrlJson(parts[1], "payload"),
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`
  };
}

async function fetchAppleJwk(kid, options = {}) {
  const jwks = options.jwks || await fetchAppleJwks(options);
  const key = Array.isArray(jwks.keys) ? jwks.keys.find((item) => item.kid === kid) : null;
  if (!key) throw new AppleAuthError("无法找到 Apple 登录凭证对应的公钥。");
  return key;
}

async function fetchAppleJwks(options = {}) {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.value;
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new AppleAuthError("当前运行环境不支持拉取 Apple 公钥。", 500, "apple_jwks_fetch_unavailable");
  }
  const response = await fetchImpl(APPLE_JWKS_URL);
  if (!response.ok) {
    throw new AppleAuthError("拉取 Apple 登录公钥失败。", 502, "apple_jwks_fetch_failed");
  }
  const value = await response.json();
  jwksCache = { value, expiresAt: now + JWKS_CACHE_MS };
  return value;
}

function audienceMatches(actual, expected) {
  if (Array.isArray(actual)) return actual.includes(expected);
  return actual === expected;
}

function parseBase64UrlJson(value, label) {
  try {
    return JSON.parse(base64UrlToBuffer(value).toString("utf8"));
  } catch {
    throw new AppleAuthError(`Apple 登录凭证 ${label} 无法解析。`, 400, "apple_identity_token_malformed");
  }
}

function base64UrlToBuffer(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}
