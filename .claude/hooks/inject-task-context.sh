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

# Parse constraints section (multiline YAML between constraints: and next top-level key)
constraints_section=""
in_constraints=0
while IFS= read -r line; do
  if [[ "$line" == "constraints:" ]]; then
    in_constraints=1
    continue
  fi
  if [[ $in_constraints -eq 1 ]]; then
    # Stop at next top-level key (no leading space)
    if [[ "$line" =~ ^[a-zA-Z] ]]; then
      break
    fi
    constraints_section="${constraints_section}${line}\n"
  fi
done < "$STATE_FILE"

# Emit banner to stderr (visible in terminal, not sent to Claude)
echo "📌 Active task: $active_task (status: $status)" >&2

# Build constraints block for context
constraints_block=""
if [[ -n "$constraints_section" ]]; then
  constraints_block="\n\nCONSTRAINTS:\n${constraints_section}"
fi

# Emit context injection as JSON to stdout (Claude Code reads this)
cat <<JSON
{
  "additionalContext": "ACTIVE TASK CONTEXT:\n- Task: ${active_task}\n- Status: ${status}\n- Path: ${task_path}\n- PRD: ${task_path}/prd.md\n- Plan: ${task_path}/plan.md\n- Context: ${task_path}/context.md${constraints_block}\nAlways read state.yml and relevant task files before acting on any /task-* command.\n\nIMPORTANT: Check constraints before making changes. Invariants must NEVER be violated."
}
JSON
