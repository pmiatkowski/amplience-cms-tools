---
agent: agent
description:
  Create a pull request for the current feature or bug with auto-generated title and body.
---

## Important: User Confirmation Required

⚠️ **ALWAYS ASK FOR USER CONFIRMATION BEFORE CREATING PR**

This command generates PR details and presents them for review. Never execute the PR creation command without explicit user approval.

## Usage

```
User: /ai.create-pull-request                    # Uses current context
User: /ai.create-pull-request {workflow-name}   # Explicit workflow
User: /ai.create-pull-request --custom          # User provides custom title/body
```

---

## Instructions

You are a PR creation assistant. Your goal is to generate a pull request with an appropriate title and body based on the workflow configuration, then present it for user approval.

### 1. Determine Workflow Name

**Parameter resolution:**

1. If user provided explicit name (`/ai.create-pull-request feature-name`), use it
2. Otherwise, read current context from `.ai-workflow/memory/global-state.yml`
3. If no current context:

```
⚠ No workflow specified and no current context set.

Please either:
  1. Specify the workflow name: /ai.create-pull-request {name}
  2. Set current context: /ai.set-current {name}
```

### 2. Run PR Script in Dry-Run Mode

Execute the script to generate PR details:

```bash
python .ai-workflow/scripts/create-pr.py --dry-run
```

Or with explicit workflow name:

```bash
python .ai-workflow/scripts/create-pr.py --dry-run --name {workflow-name}
```

The script outputs JSON:

```json
{
  "status": "preview",
  "workflow": {
    "name": "user-authentication",
    "type": "feature",
    "path": ".ai-workflow/features/user-authentication"
  },
  "pr": {
    "title": "feat: user authentication",
    "body": "## Summary\n\n...",
    "base_branch": "main"
  },
  "ticket": {
    "id": "JIRA-123",
    "source": "workflow_name",
    "required": false
  },
  "config": {
    "tool": "gh",
    "commit_convention": "conventional",
    "branch_format": "conventional"
  },
  "command": ["gh", "pr", "create", "--title", "...", "--body", "...", "--base", "main"],
  "command_string": "gh pr create --title \"...\" --body \"...\" --base main"
}
```

### 3. Handle Ticket ID (for ticket-prefix convention)

If `ticket.required` is `true` AND `ticket.id` is `null`:

```markdown
⚠ **Ticket ID Required**

Your PR configuration uses ticket-prefix convention but no ticket ID was found.

I checked:
1. Workflow folder name: `{workflow_name}` - no ticket pattern found
2. Current branch: `{branch_name}` - no ticket pattern found

**Please provide the ticket ID:**
- Example: `JIRA-123`, `ABC-456`

Or you can switch to conventional commits in `.ai-workflow/config.yml`:
```yaml
pull_request:
  commit_convention: conventional
```

```

Once user provides ticket ID, re-run with `--ticket-id`:

```bash
python .ai-workflow/scripts/create-pr.py --dry-run --ticket-id {TICKET-ID}
```

### 4. Handle Custom Title/Body Request

If user requested `--custom` or wants to provide custom content:

```markdown
Please provide your custom PR details:

**Title:** (leave blank to use auto-generated)
> Auto-generated: {generated_title}

**Body:** (leave blank to use auto-generated, or type your message)
```

Then run with custom values:

```bash
python .ai-workflow/scripts/create-pr.py --dry-run --title "Custom title" --body "Custom body"
```

### 5. Present PR Preview for Approval

Format the generated PR for user review:

````markdown
# Pull Request Preview

## Title
```
{title}
```

## Body
```markdown
{body}
```

## Details
| Setting | Value |
|---------|-------|
| Base Branch | `{base_branch}` |
| Tool | `{tool}` (`gh` = GitHub CLI, `az` = Azure DevOps) |
| Convention | `{commit_convention}` |
| Ticket ID | `{ticket_id}` (from: {ticket_source}) |

## Command to Execute
```bash
{command_string}
```

---

**Do you want to create this pull request?**

- Type `yes` or `y` to create the PR
- Type `edit` to modify title or body
- Type `no` or `n` to cancel
````

### 6. Execute or Modify Based on Response

**If user confirms (`yes`, `y`):**

Run the command without `--dry-run`:

```bash
python .ai-workflow/scripts/create-pr.py
```

Or with any overrides:

```bash
python .ai-workflow/scripts/create-pr.py --title "..." --body "..." --ticket-id "..."
```

Then display:

```markdown
✅ **Pull Request Created**

The PR has been created successfully.

## Next Steps
- Review the PR in your browser
- Add reviewers if needed
- Monitor CI/CD status
```

**If user wants to edit:**

Ask what they want to change:

```markdown
What would you like to modify?

1. **Title** - Change the PR title
2. **Body** - Change the PR description
3. **Both** - Change both title and body

Please type `1`, `2`, or `3`:
```

Then re-run `--dry-run` with the new values and present again.

**If user cancels (`no`, `n`):**

```markdown
# PR Creation Cancelled

No pull request was created.

## To create a PR later:
- `/ai.create-pull-request` - Try again with current context
- `/ai.create-pull-request --custom` - Provide custom title/body
```

---

## Examples

### Example 1: Standard PR with conventional commits

```
User: /ai.create-pull-request

AI: [runs create-pr.py --dry-run]

# Pull Request Preview

## Title
```

feat: user authentication

```

## Body
```markdown
## Summary

Implement user authentication with JWT tokens and session management.

## Related Workflow

- Type: feature
- Name: user-authentication
```

## Details

| Setting | Value |
|---------|-------|
| Base Branch | `main` |
| Tool | `gh` |
| Convention | `conventional` |
| Ticket ID | - |

## Command to Execute

```bash
gh pr create --title "feat: user authentication" --body "..." --base main
```

---

**Do you want to create this pull request?**

User: yes

AI: [runs create-pr.py]

✅ **Pull Request Created**

The PR has been created successfully.

```

### Example 2: PR with ticket-prefix (ticket ID missing)

```

User: /ai.create-pull-request

AI: [runs create-pr.py --dry-run, sees ticket.required=true and ticket.id=null]

⚠ **Ticket ID Required**

Your PR configuration uses ticket-prefix convention but no ticket ID was found.

I checked:

1. Workflow folder name: `user-auth` - no ticket pattern found
2. Current branch: `feature/user-auth` - no ticket pattern found

**Please provide the ticket ID:**

User: PROJ-456

AI: [runs create-pr.py --dry-run --ticket-id PROJ-456]

# Pull Request Preview

## Title

```
[PROJ-456] User Auth
```

...

```

---

## Notes

- The script automatically extracts PRD summary for the body when available
- Falls back to implementation plan overview if PRD doesn't exist
- Uses a default template if no workflow artifacts are found
- Ticket IDs are extracted from folder names like `JIRA-123-feature-name` or branch names like `feature/JIRA-123-description`
- Supported tools: `gh` (GitHub CLI), `az` (Azure DevOps CLI)
