#!/usr/bin/env python3
"""
Create Pull Request Script
Generates PR title, body, and CLI command based on workflow configuration.

Usage:
  python create-pr.py --dry-run                    # Preview PR details (JSON output)
  python create-pr.py --dry-run --name feature-x   # Preview for specific workflow
  python create-pr.py --title "..." --body "..."   # Create PR with custom title/body
  python create-pr.py --ticket-id JIRA-123         # Override ticket ID for ticket-prefix convention
"""

import argparse
import json
import re
import subprocess
import sys
import io
from pathlib import Path

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from config import cfg, get_current_context
except ImportError:
    print("Error: Could not import config module", file=sys.stderr)
    sys.exit(1)


def get_current_branch() -> str:
    """Get the current git branch name."""
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return ""


def extract_ticket_id(text: str) -> tuple[str | None, str]:
    """
    Extract ticket ID from text (folder name or branch name).
    Returns (ticket_id, source) or (None, "not_found").
    
    Supported patterns:
    - JIRA-123, ABC-1234 (uppercase letters + dash + numbers)
    - feature/JIRA-123-description
    - TICKET-123-some-feature-name
    """
    # Common ticket patterns: PROJECT-123, JIRA-456, etc.
    patterns = [
        r'([A-Z]{2,10}-\d+)',  # Standard: JIRA-123, ABC-1234
        r'([a-zA-Z]{2,10}-\d+)',  # Case-insensitive fallback
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).upper(), "extracted"
    
    return None, "not_found"


def get_ticket_id_from_sources(workflow_name: str | None) -> tuple[str | None, str]:
    """
    Try to extract ticket ID from multiple sources in order:
    1. Workflow folder name
    2. Current git branch name
    
    Returns (ticket_id, source) where source is one of:
    - "workflow_name": extracted from workflow folder name
    - "branch_name": extracted from git branch
    - "not_found": no ticket ID found
    """
    # 1. Try workflow folder name
    if workflow_name:
        ticket_id, _ = extract_ticket_id(workflow_name)
        if ticket_id:
            return ticket_id, "workflow_name"
    
    # 2. Try current branch name
    branch = get_current_branch()
    if branch:
        ticket_id, _ = extract_ticket_id(branch)
        if ticket_id:
            return ticket_id, "branch_name"
    
    return None, "not_found"


def get_workflow_type_prefix(workflow_type: str) -> str:
    """Get conventional commit prefix for workflow type."""
    prefixes = {
        "feature": "feat",
        "bug": "fix",
        "idea": "feat",  # Ideas that become features
    }
    return prefixes.get(workflow_type, "feat")


def generate_title_conventional(workflow_name: str, workflow_type: str) -> str:
    """
    Generate title using conventional commit format.
    Format: feat(scope): description or fix(scope): description
    """
    prefix = get_workflow_type_prefix(workflow_type)
    # Convert kebab-case to readable description
    description = workflow_name.replace("-", " ")
    return f"{prefix}: {description}"


def generate_title_ticket_prefix(workflow_name: str, workflow_type: str, ticket_id: str | None) -> str:
    """
    Generate title using ticket-prefix format.
    Format: [TICKET-123] Description
    """
    description = workflow_name.replace("-", " ").title()
    if ticket_id:
        return f"[{ticket_id}] {description}"
    else:
        # Fallback without ticket
        return description


def read_prd_summary(workflow_path: Path) -> str | None:
    """Read PRD summary section from prd.md if it exists."""
    prd_path = workflow_path / "prd.md"
    if not prd_path.exists():
        return None
    
    try:
        content = prd_path.read_text(encoding='utf-8')
        
        # Try to extract Overview or Summary section
        # Look for ## Overview, ## Summary, or first paragraph after title
        lines = content.split('\n')
        in_overview = False
        overview_lines = []
        
        for line in lines:
            if re.match(r'^##\s*(Overview|Summary|Description)', line, re.IGNORECASE):
                in_overview = True
                continue
            elif in_overview:
                if line.startswith('##'):
                    break  # Next section
                if line.strip():
                    overview_lines.append(line)
        
        if overview_lines:
            return '\n'.join(overview_lines[:10])  # Limit to first 10 lines
        
        # Fallback: return first meaningful paragraph
        for line in lines:
            if line.strip() and not line.startswith('#'):
                return line.strip()
        
        return None
    except Exception:
        return None


def read_plan_overview(workflow_path: Path) -> str | None:
    """Read implementation plan overview if it exists."""
    plan_path = workflow_path / "implementation-plan" / "plan.md"
    if not plan_path.exists():
        return None
    
    try:
        content = plan_path.read_text(encoding='utf-8')
        
        # Extract first section or overview
        lines = content.split('\n')
        overview_lines = []
        
        for line in lines:
            if line.startswith('## ') and overview_lines:
                break  # Stop at second section
            if line.strip() and not line.startswith('# '):
                overview_lines.append(line)
        
        if overview_lines:
            return '\n'.join(overview_lines[:10])
        
        return None
    except Exception:
        return None


def generate_body(workflow_path: Path, workflow_name: str, workflow_type: str) -> str:
    """
    Generate PR body from workflow artifacts.
    Priority: PRD summary > Implementation plan overview > Default template
    """
    # Try PRD summary first
    prd_summary = read_prd_summary(workflow_path)
    if prd_summary:
        return f"""## Summary

{prd_summary}

## Related Workflow

- Type: {workflow_type}
- Name: {workflow_name}
"""

    # Fallback to implementation plan
    plan_overview = read_plan_overview(workflow_path)
    if plan_overview:
        return f"""## Summary

{plan_overview}

## Related Workflow

- Type: {workflow_type}
- Name: {workflow_name}
"""

    # Default template
    return f"""## Summary

{workflow_type.title()}: {workflow_name.replace('-', ' ')}

## Related Workflow

- Type: {workflow_type}
- Name: {workflow_name}

## Changes

<!-- Describe the changes made in this PR -->
"""


def build_gh_command(title: str, body: str, base_branch: str) -> list[str]:
    """Build GitHub CLI command for creating PR."""
    return [
        "gh", "pr", "create",
        "--title", title,
        "--body", body,
        "--base", base_branch
    ]


def build_az_command(title: str, body: str, base_branch: str) -> list[str]:
    """Build Azure DevOps CLI command for creating PR."""
    return [
        "az", "repos", "pr", "create",
        "--title", title,
        "--description", body,
        "--target-branch", base_branch,
        "--auto-complete", "false"
    ]


def main():
    parser = argparse.ArgumentParser(
        description="Create pull request based on workflow configuration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        "--name",
        help="Workflow name (uses current context if not specified)"
    )
    parser.add_argument(
        "--title",
        help="Custom PR title (overrides auto-generated)"
    )
    parser.add_argument(
        "--body",
        help="Custom PR body (overrides auto-generated)"
    )
    parser.add_argument(
        "--base",
        help="Base branch for PR (overrides config default)"
    )
    parser.add_argument(
        "--ticket-id",
        help="Ticket ID for ticket-prefix convention (overrides auto-detection)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Output PR details as JSON without creating PR"
    )
    
    args = parser.parse_args()
    
    # Resolve workflow context
    if args.name:
        workflow_name = args.name
        # Determine workflow type by checking which path exists
        if (Path(cfg.paths.features) / workflow_name).exists():
            workflow_type = "feature"
        elif (Path(cfg.paths.bugs) / workflow_name).exists():
            workflow_type = "bug"
        elif (Path(cfg.paths.ideas) / workflow_name).exists():
            workflow_type = "idea"
        else:
            print(json.dumps({
                "error": f"Workflow '{workflow_name}' not found in features, bugs, or ideas",
                "status": "error"
            }))
            sys.exit(1)
    else:
        context = get_current_context()
        if not context.name:
            print(json.dumps({
                "error": "No workflow specified and no current context set",
                "hint": "Use --name <workflow> or run /ai.set-current first",
                "status": "error"
            }))
            sys.exit(1)
        workflow_name = context.name
        workflow_type = context.workflow_type or "feature"
    
    # Get workflow path
    workflow_path = cfg.get_workflow_path(workflow_name, workflow_type)
    if not workflow_path.exists():
        print(json.dumps({
            "error": f"Workflow path does not exist: {workflow_path}",
            "status": "error"
        }))
        sys.exit(1)
    
    # Load PR config
    pr_config = cfg.pull_request
    base_branch = args.base or pr_config.default_base_branch
    
    # Extract ticket ID if needed
    ticket_id = args.ticket_id
    ticket_source = "provided" if ticket_id else "not_found"
    
    if not ticket_id and pr_config.commit_convention == "ticket-prefix":
        ticket_id, ticket_source = get_ticket_id_from_sources(workflow_name)
    
    # Generate title
    if args.title:
        title = args.title
    elif pr_config.commit_convention == "conventional":
        title = generate_title_conventional(workflow_name, workflow_type)
    else:  # ticket-prefix
        title = generate_title_ticket_prefix(workflow_name, workflow_type, ticket_id)
    
    # Generate body
    if args.body:
        body = args.body
    else:
        body = generate_body(workflow_path, workflow_name, workflow_type)
    
    # Build command
    if pr_config.tool == "az":
        command = build_az_command(title, body, base_branch)
    else:  # default to gh
        command = build_gh_command(title, body, base_branch)
    
    # Output result
    result = {
        "status": "preview" if args.dry_run else "ready",
        "workflow": {
            "name": workflow_name,
            "type": workflow_type,
            "path": str(workflow_path)
        },
        "pr": {
            "title": title,
            "body": body,
            "base_branch": base_branch
        },
        "ticket": {
            "id": ticket_id,
            "source": ticket_source,
            "required": pr_config.commit_convention == "ticket-prefix"
        },
        "config": {
            "tool": pr_config.tool,
            "commit_convention": pr_config.commit_convention,
            "branch_format": pr_config.branch_format
        },
        "command": command,
        "command_string": " ".join(f'"{c}"' if ' ' in c or '\n' in c else c for c in command)
    }
    
    if args.dry_run:
        print(json.dumps(result, indent=2))
        return
    
    # Execute command
    print(f"Creating PR: {title}", file=sys.stderr)
    try:
        subprocess.run(command, check=True)
        result["status"] = "created"
        print(json.dumps(result, indent=2))
    except subprocess.CalledProcessError as e:
        result["status"] = "error"
        result["error"] = str(e)
        print(json.dumps(result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
