# /task-checkpoint

Create or restore a checkpoint of the current task state. Usage: `/task-checkpoint <create|restore|list> [name]`

## Purpose

Checkpoints allow you to save the current state of a task before risky changes, enabling rollback if something goes wrong.

## Commands

### `create [name]`

Create a checkpoint with an optional name (defaults to timestamp).

```bash
/task-checkpoint create before-refactor
```

**What gets saved:**
- `state.yml`
- `prd.md`
- `plan.md`
- `context.md`
- All handoff files
- All review files

**Storage location:** `.temp/tasks/<task-name>/checkpoints/<name|timestamp>/`

### `restore <name>`

Restore task state from a checkpoint.

```bash
/task-checkpoint restore before-refactor
```

**Warning:** This overwrites current task files. A backup of current state is created as `pre-restore-<timestamp>`.

### `list`

List all available checkpoints for the active task.

```bash
/task-checkpoint list
```

Output:
```
Checkpoints for task: <task-name>
| Name | Created | Files |
|------|---------|-------|
| before-refactor | 2024-01-15 10:30 | 5 files |
| checkpoint-20240115-091500 | 2024-01-15 09:15 | 4 files |
```

## Steps

1. Read `.temp/tasks/state.yml` to identify active task.
2. Parse `$ARGUMENTS` to determine command.
3. Execute the appropriate action.

### Create Checkpoint

1. Create directory: `.temp/tasks/<task-name>/checkpoints/<name>/`
2. Copy all task files to checkpoint directory
3. Write checkpoint manifest:
   ```yaml
   name: <name>
   created_at: <ISO timestamp>
   task_status: <current status>
   files:
     - state.yml
     - prd.md
     - plan.md
     - context.md
     - handoffs/*.yml
     - reviews/*.md
   ```
4. Confirm to user

### Restore Checkpoint

1. Verify checkpoint exists
2. Create backup: `.temp/tasks/<task-name>/checkpoints/pre-restore-<timestamp>/`
3. Copy current files to backup
4. Copy checkpoint files back to task directory
5. Confirm to user

### List Checkpoints

1. Read `.temp/tasks/<task-name>/checkpoints/` directory
2. For each checkpoint, read manifest
3. Display formatted table

## Automatic Checkpoints

The system can create automatic checkpoints:
- Before `/task-execute` starts (if enabled in settings)
- Before any phase marked as "high risk"
- After `/task-clarify` completes (optional)

Configure in `state.yml`:
```yaml
checkpoint_settings:
  auto_before_execute: true
  auto_after_clarify: false
  max_checkpoints: 10
```
