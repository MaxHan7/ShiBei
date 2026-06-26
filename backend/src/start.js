import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import "./env.js";
import {
  hasDatabase,
  initDatabase
} from "./db.js";

const processes = new Map();
let shuttingDown = false;

async function main() {
  if (hasDatabase) {
    await initDatabase();
    process.env.SHIBEI_DB_INITIALIZED_BY_PARENT = "1";
  }

  startProcess("server", ["src/server.js"]);

  if (hasDatabase && process.env.GENERATION_WORKER_DISABLED !== "1") {
    startProcess("worker", ["src/worker.js"]);
  } else {
    console.log("Generation worker not started: DATABASE_URL missing or GENERATION_WORKER_DISABLED=1.");
  }

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => shutdown(signal));
  }
}

function startProcess(name, args) {
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
    shutdown(`${name}_exit`, code ?? 1);
  });
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Shibei backend startup failed", error);
    process.exit(1);
  });
}
