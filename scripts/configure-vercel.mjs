import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
for (const line of readFileSync(".env.local", "utf8").trim().split("\n")) {
  const i = line.indexOf("=");
  const name = line.slice(0, i),
    value = line.slice(i + 1);
  for (const target of ["production", "preview"]) {
    const args = ["env", "add", name, target, "--yes"];
    if (!name.startsWith("NEXT_PUBLIC_")) args.push("--sensitive");
    const r = spawnSync("vercel", args, { input: value, encoding: "utf8" });
    console.log(
      `${name} (${target}): ${r.status === 0 ? "configured" : "FAILED"}`,
    );
    if (r.status !== 0) {
      console.error(r.stderr);
      process.exit(1);
    }
  }
}
