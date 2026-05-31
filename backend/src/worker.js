import "./env.js";
import { pathToFileURL } from "node:url";
import {
  claimNextGenerationJob,
  hasDatabase,
  initDatabase
} from "./db.js";
import { runGenerationJob } from "./generationJobRunner.js";

const workerId = process.env.GENERATION_WORKER_ID || `worker-${process.pid}-${Date.now()}`;
const concurrency = readPositiveInt(process.env.GENERATION_WORKER_CONCURRENCY, 1);
const pollMs = readPositiveInt(process.env.GENERATION_WORKER_POLL_MS, 1_000);
const lockMs = readPositiveInt(process.env.GENERATION_JOB_LOCK_MS, 420_000);
const shutdownTimeoutMs = readPositiveInt(process.env.GENERATION_WORKER_SHUTDOWN_MS, 30_000);

let shuttingDown = false;
const active = new Set();

async function main() {
  if (!hasDatabase) {
    console.error("Generation worker requires DATABASE_URL.");
    process.exitCode = 1;
    return;
  }

  await initDatabase();
  console.log(`Generation worker started: ${workerId} concurrency=${concurrency}`);
  installShutdownHandlers();
  await Promise.all(Array.from({ length: concurrency }, (_, index) => workerLoop(index + 1)));
}

async function workerLoop(slot) {
  while (!shuttingDown) {
    const job = await claimNextGenerationJob(workerId, { lockMs });
    if (!job) {
      await sleep(pollMs);
      continue;
    }
    const running = runJob(job, slot);
    active.add(running);
    running.finally(() => active.delete(running));
    await running;
  }
}

async function runJob(job, slot) {
  console.log(`Generation worker ${workerId} slot=${slot} claimed job=${job.id} chapter=${job.chapterId} type=${job.jobType}`);
  try {
    await runGenerationJob(job);
    console.log(`Generation worker ${workerId} completed job=${job.id}`);
  } catch (error) {
    console.error(`Generation worker ${workerId} failed job=${job.id}`, error);
  }
}

function installShutdownHandlers() {
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Generation worker ${workerId} received ${signal}; waiting for ${active.size} active job(s).`);
    await Promise.race([
      Promise.allSettled([...active]),
      sleep(shutdownTimeoutMs)
    ]);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Generation worker crashed", error);
    process.exit(1);
  });
}
