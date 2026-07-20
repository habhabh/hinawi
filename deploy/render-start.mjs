import { spawn } from "node:child_process";

const node = process.execPath;
const children = new Set();
let shuttingDown = false;

function start(script) {
  const child = spawn(node, [script], { env: process.env, stdio: "inherit" });
  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}

function run(script) {
  return new Promise((resolve, reject) => {
    const child = start(script);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with ${signal || code}`));
    });
    child.once("error", reject);
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function runWithRetry(script, attempts = 8) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await run(script);
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`${script} failed; retrying in 5 seconds (${attempt}/${attempts})`);
      await delay(5_000);
    }
  }
}

async function shutdown(signal, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  const activeChildren = [...children];
  const exits = activeChildren.map((child) =>
    child.exitCode !== null ? Promise.resolve() : new Promise((resolve) => child.once("exit", resolve)),
  );
  for (const child of activeChildren) child.kill(signal);

  const forceTimer = setTimeout(() => {
    for (const child of activeChildren) child.kill("SIGKILL");
  }, 25_000);
  forceTimer.unref();

  await Promise.allSettled(exits);
  process.exit(exitCode);
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => void shutdown(signal, 0));
}

await runWithRetry(".ops/migrate.mjs");
await runWithRetry(".ops/seed.mjs");
await runWithRetry(".ops/create-super-admin.mjs");

const worker = start(".ops/media-worker.cjs");
const web = start("server.js");

for (const [name, child] of [["media worker", worker], ["web server", web]]) {
  child.once("error", (error) => {
    console.error(`${name} failed to start`, error);
    void shutdown("SIGTERM", 1);
  });
  child.once("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${name} stopped unexpectedly (${signal || code})`);
    void shutdown("SIGTERM", code || 1);
  });
}
