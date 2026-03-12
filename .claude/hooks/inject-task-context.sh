#!/usr/bin/env bash
# UserPromptSubmit hook — injects active task context into Claude's session.
# Reads state.yml and outputs JSON with additionalContext.

STATE_FILE=".temp/tasks/state.yml"

if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Parse state.yml (simple key: value format)
active_task=$(grep "^active_task:" "$STATE_FILE" | awk '{print $2}' | tr -d '"')
status=$(grep "^status:" "$STATE_FILE" | awk '{print $2}' | tr -d '"')
task_path=$(grep "^task_path:" "$STATE_FILE" | awk '{print $2}' | tr -d '"')

if [[ -z "$active_task" || "$active_task" == "null" || "$active_task" == "none" ]]; then
  exit 0
fi

# Emit banner to stderr (visible in terminal, not sent to Claude)
echo "📌 Active task: $active_task (status: $status)" >&2

# Emit context injection as JSON to stdout (Claude Code reads this)
cat <<JSON
{
  "additionalContext": "ACTIVE TASK CONTEXT:\n- Task: ${active_task}\n- Status: ${status}\n- Path: ${task_path}\n- PRD: ${task_path}/prd.md\n- Plan: ${task_path}/plan.md\n- Context: ${task_path}/context.md\n\nAlways read state.yml and relevant task files before acting on any /task-* command."
}
JSON
