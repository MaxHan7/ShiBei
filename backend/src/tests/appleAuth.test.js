import { generateKeyPairSync, sign } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { AppleAuthError, parseJwt, verifyAppleIdentityToken } from "../appleAuth.js";

test("parseJwt rejects malformed identity tokens", () => {
  assert.throws(() => parseJwt("not-a-jwt"), AppleAuthError);
});

test("verifyAppleIdentityToken validates a signed Apple-style JWT", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kid = "local-test-key";
  const aud = "com.maxhan.shibei";
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid, typ: "JWT" };
  const payload = {
    iss: "https://appleid.apple.com",
    aud,
    sub: "apple-user-123",
    email: "reader@example.com",
    iat: now,
    exp: now + 600
  };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey);
  const token = `${signingInput}.${base64Url(signature)}`;
  const result = await verifyAppleIdentityToken(token, {
    audience: aud,
    jwks: {
      keys: [{ ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" }]
    }
  });

  assert.equal(result.provider, "apple");
  assert.equal(result.providerSubject, "apple-user-123");
  assert.equal(result.email, "reader@example.com");
});

test("verifyAppleIdentityToken rejects audience mismatch", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kid = "local-test-key";
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${base64UrlJson({ alg: "RS256", kid })}.${base64UrlJson({
    iss: "https://appleid.apple.com",
    aud: "wrong.audience",
    sub: "apple-user-123",
    exp: now + 600
  })}`;
  const token = `${signingInput}.${base64Url(sign("RSA-SHA256", Buffer.from(signingInput), privateKey))}`;

  await assert.rejects(
    verifyAppleIdentityToken(token, {
      audience: "com.maxhan.shibei",
      jwks: {
        keys: [{ ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" }]
      }
    }),
    AppleAuthError
  );
});

function base64UrlJson(value) {
  return base64Url(Buffer.from(JSON.stringify(value), "utf8"));
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
