import { config } from "@/config";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { log } from "./logger";

export async function run(
  command: string,
  args: string[],
  timeoutMs = 60_000,
): Promise<string> {
  const executable = resolveBinary(command);
  log.debug(executable);
  let child: Bun.Subprocess<"ignore", "pipe", "pipe">;
  try {
    child = Bun.spawn([executable, ...args], {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(
      `${executable} is not installed or is unavailable on PATH: ${String(error)}`,
    );
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `${executable} exited with code ${exitCode}: ${stderr.trim().slice(-1200)}`,
    );
  }
  return stdout.trim();
}

function getBinaryDirectory(): string | null {
  const directory = config.binary_path.trim();
  if (!directory) return null;

  const path = resolve(directory);

  try {
    if (!statSync(path).isDirectory()) return null;
    return path;
  } catch {
    return null;
  }
}

export function findBinary(name: string): string | null {
  const systemPath = Bun.which(name);
  if (systemPath) return systemPath;

  const directory = getBinaryDirectory();
  if (!directory) return null;

  return Bun.which(name, { PATH: directory });
}

export function resolveBinary(name: string): string {
  const path = findBinary(name);
  if (path) return path;

  const configured = config.binary_path.trim();
  const directory = getBinaryDirectory();

  let detail: string;
  if (!configured) {
    detail = "PATH sistem (binary_path belum diisi)";
  } else if (!directory) {
    detail = `PATH sistem; binary_path "${resolve(configured)}" tidak bisa diakses atau bukan direktori`;
  } else {
    detail = `PATH sistem maupun folder "${directory}"`;
  }

  throw new Error(`Binary "${name}" tidak ditemukan di ${detail}.`);
}
