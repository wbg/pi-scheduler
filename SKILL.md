---
name: scheduler
description: Schedule recurring pi tasks via system scheduler (crontab on Linux/macOS, schtasks on Windows). Each job has a persistent memory file with task details and run history. Use when the user wants to schedule, list, or remove recurring automated tasks.
---

# Scheduler

Runs `pi -p` on a cron schedule via the OS scheduler. Each job's full instructions live in a memory file — the cron entry just points pi at it.

## Commands
```bash
node scripts/scheduler.js add "<cron>" "<label>" "<prompt>"
node scripts/scheduler.js list
node scripts/scheduler.js remove "<label>"
node scripts/scheduler.js logs "<label>"
```

## Workflow
1. User describes task and frequency in natural language
2. Convert schedule to cron expression
3. Craft a clear prompt, call `scheduler.js add`
4. Script creates memory file + registers OS scheduler entry

## Memory file
- `~/.pi/scheduler/memory/<label>.md` — task, schedule, instructions, run history
- Pi reads it before executing, updates run history after
- **Only keep the last 3 runs** in history — older entries are removed
- Do not add extra sections unless the user explicitly asks
