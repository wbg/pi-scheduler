# pi-scheduler

⚠️ **WARNING: Pure slop, only for my personal use. You have been warned.** ⚠️

A [pi](https://github.com/badlogic/pi) agent skill for scheduling recurring tasks. Uses the system scheduler (crontab on Linux/macOS, schtasks on Windows) to run `pi -p` on a schedule. Each job gets a persistent memory file so pi can track state across runs.

## Install

```bash
pi install https://github.com/wbg/pi-scheduler
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

## License

MIT
