#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

const DEFAULT_URL = "http://localhost:3000";
const REPORTS_DIR = resolve("reports", "lighthouse");

const parseCommandLine = () => {
  const cliArgs = process.argv.slice(2);
  let urlArg = null;

  const pairs = cliArgs.flatMap((item) => {
    if (!item.startsWith("--")) return [];
    const [key, value] = item.split("=", 2);
    return [[key.replace(/^--/, ""), value ?? null]];
  });

  for (const [key, value] of pairs) {
    if (key === "url" || key === "target") {
      urlArg = value;
    }
  }

  if (!urlArg && cliArgs.length === 1 && !cliArgs[0].startsWith("--")) {
    urlArg = cliArgs[0];
  }

  return {
    url: urlArg,
  };
};

const promptForUrl = async () => {
  if (!input.isTTY || !output.isTTY) {
    return DEFAULT_URL;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `أدخل رابط الاختبار (اضغط Enter للاستخدام الافتراضي ${DEFAULT_URL}): `,
    );
    return answer.trim() || DEFAULT_URL;
  } finally {
    rl.close();
  }
};

const ensureValidUrl = (value) => {
  if (URL.canParse(value)) {
    return value;
  }

  throw new Error(`الرابط غير صالح: ${value}.`);
};

const checkReachability = async (url) => {
  output.write(`\n🔍 التحقق من الوصول إلى ${url} ...\n`);
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) {
      throw new Error(`الخادم أعاد الحالة ${response.status}`);
    }
    output.write("✅ الاتصال بالواجهة نجح.\n");
  } catch (error) {
    throw new Error(`تعذّر الوصول إلى ${url}: ${error.message}`);
  }
};

const runCommand = (command, args, label) => {
  output.write(`\n▶️  ${label}\n`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`${label} فشل (كود الخروج ${result.status ?? "غير معروف"}).`);
  }
  output.write(`✅ ${label} اكتمل بنجاح.\n`);
};

const runLighthouse = (url) => {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const args = [
    "@lhci/cli@0.14.0",
    "autorun",
    `--collect.url=${url}`,
    "--collect.numberOfRuns=1",
    "--upload.target=filesystem",
    `--upload.outputDir=${REPORTS_DIR}`,
  ];

  runCommand("npx", args, "تشغيل Lighthouse CI");
  output.write(`📁 تم حفظ التقارير داخل ${REPORTS_DIR}\n`);
};

const main = async () => {
  try {
    const { url: cliUrl } = parseCommandLine();
    const targetUrl = ensureValidUrl(cliUrl ?? (await promptForUrl()));

    await checkReachability(targetUrl);

    runCommand("npm", ["run", "lint"], "تشغيل ESLint");
    runCommand("npm", ["run", "test", "--", "--run"], "تشغيل اختبارات Vitest");

    runLighthouse(targetUrl);

    output.write("\n🎉 اكتملت فحوصات الجودة بنجاح.\n");
  } catch (error) {
    output.write(`\n❌ توقف السكربت بسبب خطأ: ${error.message}\n`);
    process.exitCode = 1;
  }
};

void main();
