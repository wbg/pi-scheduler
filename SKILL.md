---
name: scheduler
description: Schedule recurring pi tasks via system scheduler (crontab on Linux/macOS, schtasks on Windows). Each job has a persistent memory file with task details and run history. Use when the user wants to schedule, list, or remove recurring automated tasks.
---

# Scheduler

Runs `pi -p` on a cron schedule via the OS scheduler. Each job's full instructions live in a memory file — the cron entry just points pi at it.

## Setup
```bash
cd ~/.pi/agent/skills/pi-scheduler && npm install
```

## Commands
```bash
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js add "<cron>" "<label>" "<prompt>"
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js list
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js remove "<label>"
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js logs "<label>"
```

## Workflow
1. User describes task and frequency in natural language
2. Convert schedule to cron (e.g. "every 30 minutes" → `*/30 * * * *`)
3. Craft a clear prompt, call `scheduler.js add`
4. Script creates memory file + registers OS scheduler entry

## Cron quick reference
| Expression | Meaning |
|---|---|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Daily at 9:00 |
| `0 9 * * 1` | Every Monday at 9:00 |
| `0 0 1 * *` | First of every month |

## Memory file
- `~/.pi/scheduler/memory/<label>.md` contains task, schedule, instructions, and run history
- Pi reads it before executing, updates run history after
- **Only keep the last 3 runs** in history — older entries are removed
- Do not add extra sections to the memory file unless the user explicitly asks
