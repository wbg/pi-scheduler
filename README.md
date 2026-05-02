# pi-scheduler

⚠️ **WARNING: Pure slop, only for my personal use. You have been warned.** ⚠️

A [pi](https://github.com/badlogic/pi) agent skill for scheduling recurring tasks. Uses the system scheduler (crontab on Linux/macOS, schtasks on Windows) to run `pi -p` on a schedule. Each job has a persistent memory file so pi can track state across runs.

## Install

Clone into your pi skills directory:

```bash
git clone git@github.com:wbg/pi-scheduler.git ~/.pi/agent/skills/pi-scheduler
cd ~/.pi/agent/skills/pi-scheduler && npm install
```

## Usage

Talk to pi naturally:

> "Check disk space every hour and warn me if anything is above 90%"

Pi will create a scheduled job that runs automatically.

### How it works

1. Each job gets a memory file (`~/.pi/scheduler/memory/<label>.md`) containing the full task description, schedule, and run history
2. The system scheduler runs `pi -p 'Execute the scheduled task described in <memory-file>'`
3. Pi reads the memory file, executes the task, and updates the run history section
4. Over time, pi builds up context from previous runs

### Manual usage

```bash
# List jobs
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js list

# Add a job
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js add "0 * * * *" "disk-check" "Check disk space and warn if any partition exceeds 90%"

# Remove a job
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js remove "disk-check"

# View logs
node ~/.pi/agent/skills/pi-scheduler/scripts/scheduler.js logs "disk-check"
```

## License

MIT
