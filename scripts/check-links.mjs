import fs from "fs";
import path from "path";

const contentPath = path.resolve("server/game/content.ts");
const text = fs.readFileSync(contentPath, "utf8");

const urls = Array.from(text.matchAll(/sourceUrl:\s*"([^"]+)"/g), (m) => m[1]);

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 CAP-link-checker/1.0",
};

const results = [];
for (const url of urls) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { method: "GET", headers, redirect: "follow", signal: controller.signal });
    clearTimeout(timer);
    // 403 is typically bot protection, not a dead link; only hard failures count.
    results.push({ url, status: response.status, ok: response.status < 400 || response.status === 403 });
  } catch (error) {
    clearTimeout(timer);
    results.push({ url, status: null, ok: false, error: String(error?.message ?? error) });
  }
}

const failures = results.filter((r) => !r.ok);
console.log(`Checked ${results.length} source URLs. ${failures.length} failed.`);
for (const result of results) {
  const flag = result.ok ? "OK " : "FAIL";
  console.log(`${flag} ${result.status ?? "-"}  ${result.url}`);
  if (result.error) console.log(`      ${result.error}`);
}

process.exitCode = failures.length ? 1 : 0;
