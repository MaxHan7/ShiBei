#!/usr/bin/env node

import { readFileSync } from "node:fs";

const input = readFileSync(0, "utf8").trim();

if (!input) {
  fail("Railway variables JSON is empty.");
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  fail("Railway variables output is not valid JSON.");
}

const candidate = findDatabaseUrl(payload);

if (!candidate) {
  fail("Could not find DATABASE_PUBLIC_URL, POSTGRES_PUBLIC_URL, DATABASE_URL, POSTGRES_URL, or DATABASE_PRIVATE_URL in Railway variables.");
}

if (!/^postgres(?:ql)?:\/\//i.test(candidate)) {
  fail("Matched database variable is not a PostgreSQL URL.");
}

process.stdout.write(candidate);

function findDatabaseUrl(value) {
  const preferredKeys = [
    "DATABASE_PUBLIC_URL",
    "POSTGRES_PUBLIC_URL",
    "DATABASE_TCP_PROXY_URL",
    "POSTGRES_TCP_PROXY_URL",
    "DATABASE_URL",
    "POSTGRES_URL",
    "DATABASE_PRIVATE_URL",
    "POSTGRES_PRIVATE_URL"
  ];

  if (Array.isArray(value)) {
    for (const key of preferredKeys) {
      const match = value.find((item) => {
        if (!item || typeof item !== "object") return false;
        const name = item.name || item.key || item.variable || item.variableName;
        return name === key && typeof (item.value || item.rawValue) === "string";
      });
      if (match) return match.value || match.rawValue;
    }
    for (const item of value) {
      const nested = findDatabaseUrl(item);
      if (nested) return nested;
    }
    return "";
  }

  if (!value || typeof value !== "object") return "";

  for (const key of preferredKeys) {
    if (typeof value[key] === "string") return value[key];
  }

  for (const item of Object.values(value)) {
    const nested = findDatabaseUrl(item);
    if (nested) return nested;
  }

  return "";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
