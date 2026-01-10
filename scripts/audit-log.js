const fs = require("fs");
const path = require("path");

const logPath = path.join(__dirname, "../logs/audit.json");

const logData = {
  timestamp: new Date().toISOString(),
  action: process.argv[2] ?? "unknown",
  user: process.env.GITHUB_ACTOR ?? "local",
  files: process.argv.slice(3),
  commit: process.env.GITHUB_SHA ?? "local",
};

const logDir = path.dirname(logPath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

let logs = [];
if (fs.existsSync(logPath)) {
  try {
    logs = JSON.parse(fs.readFileSync(logPath, "utf8"));
    if (!Array.isArray(logs)) {
      logs = [];
    }
  } catch (error) {
    logs = [];
  }
}

logs.push(logData);

fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
