#!/usr/bin/env python3
"""Initialize a new workflow item (feature, bug, etc.)."""

import argparse
import re
import sys
from datetime import date
from pathlib import Path

try:
    from config import cfg, write_global_state
except ImportError:
    # Fallback if config module not available
    class FallbackConfig:
        class paths:
            features = ".ai-workflow/features"
            bugs = ".ai-workflow/bugs"
        class defaults:
            date_format = "%Y-%m-%d"
        class WorkflowType:
            def __init__(self):
                self.base_path = "features"
                self.initial_state = "clarifying"
                self.artifacts = ["state.yml", "request.md", "context.md", "clarifications/"]
        def get_workflow_type(self, type_name):
            wf = self.WorkflowType()
            if type_name == "bug":
                wf.base_path = "bugs"
                wf.initial_state = "reported"
                wf.artifacts = ["state.yml", "report.md", "context.md", "clarifications/", "triage.md", "fix-plan.md"]
            return wf
        def get_workflow_path(self, name, workflow_type):
            base = self.paths.bugs if workflow_type == "bug" else self.paths.features
            return Path(base) / name
    cfg = FallbackConfig()


def to_kebab_case(name: str) -> str:
    """Convert string to kebab-case."""
    name = re.sub(r'[^a-zA-Z0-9\s-]', '', name)
    name = re.sub(r'[\s_]+', '-', name)
    name = re.sub(r'-+', '-', name)
    return name.lower().strip('-')


def create_report_md(path: Path, name: str, description: str, today: str):
    """Create bug report template."""
    content = f"""# Bug Report: {name}

## Description
{description}

## Steps to Reproduce
<!-- Add steps to reproduce the bug -->

## Expected Behavior
<!-- What should happen? -->

## Actual Behavior
<!-- What actually happens? -->

## Environment
<!-- Browser, OS, version, etc. -->

## Reported
{today}
"""
    (path / "report.md").write_text(content)


def create_request_md(path: Path, name: str, description: str, today: str):
    """Create feature request template."""
    content = f"""# Feature Request: {name}

## Description
{description}

## Created
{today}
"""
    (path / "request.md").write_text(content)


def create_context_md(path: Path):
    """Create context template."""
    content = """# Context

## Relevant Files
<!-- Add files relevant to this work -->

## Business Logic
<!-- Add business rules, constraints, existing behavior -->

## Technical Constraints
<!-- Add stack info, dependencies, limitations -->

## Notes
<!-- Any other relevant context -->
"""
    (path / "context.md").write_text(content)


def create_workflow(name: str, description: str, workflow_type: str = "feature") -> None:
    """Create workflow folder structure based on type."""

    name = to_kebab_case(name)
    workflow_config = cfg.get_workflow_type(workflow_type)
    today = date.today().strftime(cfg.defaults.date_format)
    workflow_path = cfg.get_workflow_path(name, workflow_type)

    # Check if exists
    if workflow_path.exists():
        print(f"✗ {workflow_type.capitalize()} '{name}' already exists at {workflow_path}")
        sys.exit(1)

    # Create directories
    workflow_path.mkdir(parents=True)

    # Create state.yml
    state_content = f"""workflow_type: {workflow_type}
name: {name}
status: {workflow_config.initial_state}
created: {today}
updated: {today}
"""
    (workflow_path / "state.yml").write_text(state_content)

    # Create artifacts based on workflow type
    for artifact in workflow_config.artifacts:
        if artifact.endswith('/'):
            # Directory
            (workflow_path / artifact.rstrip('/')).mkdir(exist_ok=True)
        elif artifact == "report.md":
            # Bug report
            create_report_md(workflow_path, name, description, today)
        elif artifact == "request.md":
            # Feature request
            create_request_md(workflow_path, name, description, today)
        elif artifact == "context.md":
            # Context template
            create_context_md(workflow_path)

    # Print confirmation
    print(f"✓ {workflow_type.capitalize()} initialized: {name}")
    print(f"\nCreated: {workflow_path}/")
    print(f"Status: {workflow_config.initial_state}")

    # Auto-update global state
    try:
        write_global_state(name, workflow_type, set_method="auto")
        print(f"\n✓ Set as current {workflow_type}")
    except Exception as e:
        print(f"\n⚠ Warning: Could not update global state: {e}", file=sys.stderr)

    # Next steps based on type
    if workflow_type == "bug":
        print("\nNext steps:")
        print(f"  1. /add-context {name} — add relevant codebase context (optional)")
        print(f"  2. /triage-bug {name} — diagnose root cause and plan fix")
    else:
        print("\nNext steps:")
        print(f"  1. /add-context {name} — add relevant codebase context")
        print(f"  2. /clarify {name} — start requirements clarification")


def main():
    parser = argparse.ArgumentParser(description="Initialize a new workflow item")
    parser.add_argument("name", help="Item name (will be converted to kebab-case)")
    parser.add_argument("description", help="Brief description")
    parser.add_argument("--type", default="feature", help="Workflow type (feature, bug, etc.)")

    args = parser.parse_args()
    create_workflow(args.name, args.description, args.type)


if __name__ == "__main__":
    main()
