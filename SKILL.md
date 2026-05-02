---
name: scheduler
description: Schedule recurring tasks that run pi with a prompt on a cron schedule. Manages jobs cross-platform (crontab on Linux/macOS, schtasks on Windows). Each job has a persistent memory file containing the task, schedule, instructions, and run history. Use when the user wants to schedule, list, or remove recurring automated tasks.
---

# Scheduler

Schedule recurring pi tasks using the system scheduler. Each job stores its full task description, schedule, and run history in a persistent memory file. The cron entry simply tells pi to read and execute that file — no prompts on the command line.

## Setup

```bash
cd ~/.pi/agent/skills/pi-scheduler && npm install
```

## Usage

### Add a job
```bash
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js add "<cron-expr>" "<label>" "<prompt>"
```

### List all jobs
```bash
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js list
```

### Remove a job
```bash
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js remove "<label>"
```

### View logs for a job
```bash
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js logs "<label>"
```

## Workflow

1. User describes what they want scheduled and how often, in natural language
2. You convert the schedule to a cron expression (e.g. "every 30 minutes" → `*/30 * * * *`)
3. You craft a clear, detailed prompt describing the task
4. You call `scheduler.js add` with the cron expression, a short kebab-case label, and the prompt
5. The script creates a memory file with the full task description and registers a cron entry that tells pi to execute it

## How the memory file works

Each job gets `~/.pi/scheduler/memory/<label>.md` containing:
- **Task**: the full prompt/instructions
- **Schedule**: the cron expression
- **Instructions**: tells pi to execute the task and update run history
- **Run History**: pi appends results here on each run, building up context over time

The cron entry is simply: `pi -p 'Execute the scheduled task described in <memory-file>'`

This means:
- No shell escaping issues
- Full prompt detail is preserved safely
- Pi builds up knowledge across runs via the history section

## Cron expression reference

| Expression | Meaning |
|---|---|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Daily at 9:00 |
| `0 9 * * 1` | Every Monday at 9:00 |
| `0 9,18 * * *` | Daily at 9:00 and 18:00 |
| `0 0 1 * *` | First day of every month |

## Notes

- Jobs are tagged in the system scheduler so only pi-managed jobs are listed/removed
- On Linux/macOS uses crontab, on Windows uses schtasks
- Logs are stored per job in `~/.pi/scheduler/logs/`
