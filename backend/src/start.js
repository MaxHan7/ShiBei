import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import "./env.js";
import {
  hasDatabase,
  initDatabase
} from "./db.js";

const processes = new Map();
const workerRestarts = [];
let shuttingDown = false;

const workerRestartLimit = readPositiveInt(process.env.GENERATION_WORKER_RESTART_LIMIT, 5);
const workerRestartWindowMs = readPositiveInt(
  process.env.GENERATION_WORKER_RESTART_WINDOW_MS,
  10 * 60 * 1000
);
const workerRestartDelayMs = readPositiveInt(process.env.GENERATION_WORKER_RESTART_DELAY_MS, 2_000);

async function main() {
  if (hasDatabase) {
    await initDatabase();
    process.env.SHIBEI_DB_INITIALIZED_BY_PARENT = "1";
  }

  startProcess("server", ["src/server.js"]);

  if (hasDatabase && process.env.GENERATION_WORKER_DISABLED !== "1") {
    startWorker();
  } else {
    console.log("Generation worker not started: DATABASE_URL missing or GENERATION_WORKER_DISABLED=1.");
  }

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => shutdown(signal));
  }
}

function startWorker() {
  startProcess("worker", ["src/worker.js"], { restartOnExit: true });
}

function startProcess(name, args, options = {}) {
  const child = spawn(process.execPath, args, {
    cwd: new URL("..", import.meta.url),
    env: process.env,
    stdio: "inherit"
  });

  processes.set(name, child);

  child.on("exit", (code, signal) => {
    processes.delete(name);
    if (shuttingDown) return;
    console.error(`${name} process exited`, { code, signal });

    if (options.restartOnExit) {
      restartWorkerOrShutdown(code, signal);
      return;
    }

    shutdown(`${name}_exit`, code ?? 1);
  });
}

function restartWorkerOrShutdown(code, signal) {
  const now = Date.now();
  while (workerRestarts.length && now - workerRestarts[0] > workerRestartWindowMs) {
    workerRestarts.shift();
  }
  workerRestarts.push(now);

  if (workerRestarts.length > workerRestartLimit) {
    console.error("Generation worker exceeded restart limit; shutting down backend.", {
      code,
      signal,
      restartCount: workerRestarts.length,
      windowMs: workerRestartWindowMs
    });
    shutdown("worker_restart_limit", code ?? 1);
    return;
  }

  console.log(
    `Restarting generation worker in ${workerRestartDelayMs}ms ` +
      `(${workerRestarts.length}/${workerRestartLimit}).`
  );
  setTimeout(() => {
    if (!shuttingDown) startWorker();
  }, workerRestartDelayMs).unref();
}

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Shutting down Shibei backend (${reason}).`);

  for (const child of processes.values()) {
    if (!child.killed) child.kill("SIGTERM");
  }

  setTimeout(() => {
    for (const child of processes.values()) {
      if (!child.killed) child.kill("SIGKILL");
    }
    process.exit(exitCode);
  }, 10_000).unref();
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Shibei backend startup failed", error);
    process.exit(1);
  });
}
