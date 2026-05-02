#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE_DIR = path.join(os.homedir(), ".pi", "scheduler");
const JOBS_FILE = path.join(BASE_DIR, "jobs.json");
const MEMORY_DIR = path.join(BASE_DIR, "memory");
const LOGS_DIR = path.join(BASE_DIR, "logs");
const TAG = "pi-scheduler";
const PLATFORM = os.platform();

function ensureDirs() {
  for (const dir of [BASE_DIR, MEMORY_DIR, LOGS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, "{}");
  }
}

function loadJobs() {
  return JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"));
}

function saveJobs(jobs) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

function findPi() {
  try {
    const cmd = PLATFORM === "win32" ? "where pi" : "which pi";
    return execSync(cmd, { encoding: "utf-8" }).trim().split("\n")[0];
  } catch {
    return "pi";
  }
}

function initMemoryFile(label, prompt, cronExpr) {
  const memFile = path.join(MEMORY_DIR, `${label}.md`);
  const content = `# ${label}

## Task
${prompt}

## Schedule
${cronExpr}

## Instructions
You are running as a scheduled job. Your task is described above. Execute it, then update the Run History below with a short summary. Keep only the last 3 runs — remove older entries. Do not add any other sections to this file unless the user explicitly asks.

## Run History
No runs yet.
`;
  fs.writeFileSync(memFile, content);
  return memFile;
}

function memFilePath(label) {
  return path.join(MEMORY_DIR, `${label}.md`);
}

function logFilePath(label) {
  return path.join(LOGS_DIR, `${label}.log`);
}

// --- crontab (Linux/macOS) ---

function crontabList() {
  try {
    return execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
  } catch {
    return "";
  }
}

function crontabSet(content) {
  const tmp = path.join(os.tmpdir(), `pi-crontab-${Date.now()}`);
  fs.writeFileSync(tmp, content);
  execSync(`crontab ${tmp}`);
  fs.unlinkSync(tmp);
}

function crontabAdd(cronExpr, label) {
  const piPath = findPi();
  const memFile = memFilePath(label);
  const logFile = logFilePath(label);
  const line = `${cronExpr} ${piPath} -p 'Execute the scheduled task described in ${memFile}' >> ${logFile} 2>&1  #${TAG}:${label}`;

  const current = crontabList();
  const lines = current
    .split("\n")
    .filter((l) => l.trim() !== "" && !l.includes(`#${TAG}:${label}`));
  lines.push(line);
  crontabSet(lines.join("\n") + "\n");
}

function crontabRemove(label) {
  const current = crontabList();
  const filtered = current
    .split("\n")
    .filter((l) => l.trim() !== "" && !l.includes(`#${TAG}:${label}`));
  if (filtered.length === 0) {
    try { execSync("crontab -r 2>/dev/null"); } catch {}
    return;
  }
  crontabSet(filtered.join("\n") + "\n");
}

// --- schtasks (Windows) ---

function cronToSchtasks(cronExpr) {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron expression: ${cronExpr}`);
  const [min, hour, dom, mon, dow] = parts;

  if (min.startsWith("*/") && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return `/sc MINUTE /mo ${min.slice(2)}`;
  }
  if (min !== "*" && hour.startsWith("*/") && dom === "*" && mon === "*" && dow === "*") {
    return `/sc HOURLY /mo ${hour.slice(2)} /st 00:${min.padStart(2, "0")}`;
  }
  if (min !== "*" && hour !== "*" && !hour.includes("/") && !min.includes("/") && dom === "*" && mon === "*" && dow === "*") {
    return `/sc DAILY /st ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  }
  if (min !== "*" && hour !== "*" && dom === "*" && mon === "*" && dow !== "*") {
    const days = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };
    const dayName = days[dow] || dow.toUpperCase().slice(0, 3);
    return `/sc WEEKLY /d ${dayName} /st ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  }
  if (min !== "*" && hour !== "*" && dom !== "*" && mon === "*" && dow === "*") {
    return `/sc MONTHLY /d ${dom} /st ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  }

  throw new Error(`Cannot convert cron expression to schtasks: ${cronExpr}. Use a simpler schedule.`);
}

function schtasksAdd(cronExpr, label) {
  const piPath = findPi();
  const memFile = memFilePath(label);
  const logFile = logFilePath(label);
  const taskName = `${TAG}-${label}`;
  const schedule = cronToSchtasks(cronExpr);
  const cmd = `schtasks /create /tn "${taskName}" ${schedule} /tr "cmd /c ${piPath} -p \\"Execute the scheduled task described in ${memFile}\\" >> \\"${logFile}\\" 2>&1" /f`;
  execSync(cmd, { encoding: "utf-8" });
}

function schtasksRemove(label) {
  const taskName = `${TAG}-${label}`;
  try {
    execSync(`schtasks /delete /tn "${taskName}" /f`, { encoding: "utf-8" });
  } catch {}
}

// --- Platform dispatch ---

function addJob(cronExpr, label, prompt) {
  ensureDirs();
  const jobs = loadJobs();
  const memFile = initMemoryFile(label, prompt, cronExpr);

  if (PLATFORM === "win32") {
    schtasksAdd(cronExpr, label);
  } else {
    crontabAdd(cronExpr, label);
  }

  jobs[label] = { cron: cronExpr, prompt, created: new Date().toISOString() };
  saveJobs(jobs);
  console.log(`✓ Job "${label}" added: ${cronExpr}`);
  console.log(`  Memory: ${memFile}`);
  console.log(`  Logs:   ${logFilePath(label)}`);
}

function removeJob(label) {
  ensureDirs();
  const jobs = loadJobs();

  if (!jobs[label]) {
    console.error(`✗ Job "${label}" not found`);
    process.exit(1);
  }

  if (PLATFORM === "win32") {
    schtasksRemove(label);
  } else {
    crontabRemove(label);
  }

  delete jobs[label];
  saveJobs(jobs);

  const memFile = memFilePath(label);
  if (fs.existsSync(memFile)) fs.unlinkSync(memFile);

  console.log(`✓ Job "${label}" removed`);
}

function listJobs() {
  ensureDirs();
  const jobs = loadJobs();
  const labels = Object.keys(jobs);

  if (labels.length === 0) {
    console.log("No scheduled jobs.");
    return;
  }

  console.log(`${"Label".padEnd(20)} ${"Schedule".padEnd(20)} Prompt`);
  console.log(`${"─".repeat(20)} ${"─".repeat(20)} ${"─".repeat(40)}`);
  for (const [label, job] of Object.entries(jobs)) {
    const promptShort = job.prompt.length > 60 ? job.prompt.slice(0, 57) + "..." : job.prompt;
    console.log(`${label.padEnd(20)} ${job.cron.padEnd(20)} ${promptShort}`);
  }
}

function showLogs(label) {
  ensureDirs();
  const logFile = logFilePath(label);
  if (!fs.existsSync(logFile)) {
    console.log(`No logs for "${label}".`);
    return;
  }
  const content = fs.readFileSync(logFile, "utf-8");
  const lines = content.split("\n");
  const tail = lines.slice(-50).join("\n");
  console.log(tail);
}

// --- CLI ---

const [, , command, ...args] = process.argv;

switch (command) {
  case "add": {
    if (args.length < 3) {
      console.error('Usage: scheduler.js add "<cron-expr>" "<label>" "<prompt>"');
      process.exit(1);
    }
    const [cronExpr, label, ...rest] = args;
    const prompt = rest.join(" ");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(label)) {
      console.error("Label must be kebab-case (lowercase, hyphens, no spaces)");
      process.exit(1);
    }
    addJob(cronExpr, label, prompt);
    break;
  }
  case "remove": {
    if (args.length < 1) {
      console.error('Usage: scheduler.js remove "<label>"');
      process.exit(1);
    }
    removeJob(args[0]);
    break;
  }
  case "list": {
    listJobs();
    break;
  }
  case "logs": {
    if (args.length < 1) {
      console.error('Usage: scheduler.js logs "<label>"');
      process.exit(1);
    }
    showLogs(args[0]);
    break;
  }
  default:
    console.log("Usage: scheduler.js <add|remove|list|logs> [args...]");
    process.exit(1);
}
