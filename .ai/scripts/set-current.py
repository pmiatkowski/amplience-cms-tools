#!/usr/bin/env python3
"""Set the current workflow context."""

import argparse
import sys
from pathlib import Path

try:
    from config import cfg, write_global_state
except ImportError:
    print("✗ Error: Could not import config module", file=sys.stderr)
    sys.exit(1)

# Import to_kebab_case from init_workflow if available
try:
    from init_workflow import to_kebab_case
except ImportError:
    # Fallback implementation
    import re
    def to_kebab_case(name: str) -> str:
        """Convert string to kebab-case."""
        name = re.sub(r'[^a-zA-Z0-9\s-]', '', name)
        name = re.sub(r'[\s_]+', '-', name)
        name = re.sub(r'-+', '-', name)
        return name.lower().strip('-')


def set_current(name: str, workflow_type: str = None) -> None:
    """Set current workflow context after validation."""

    # Normalize name
    name = to_kebab_case(name)

    # Auto-detect workflow type if not provided
    if workflow_type is None:
        feature_path = cfg.get_workflow_path(name, "feature")
        bug_path = cfg.get_workflow_path(name, "bug")

        if feature_path.exists():
            workflow_type = "feature"
        elif bug_path.exists():
            workflow_type = "bug"
        else:
            print(f"✗ No workflow found with name '{name}'")
            print(f"\nSearched:")
            print(f"  - {feature_path}")
            print(f"  - {bug_path}")
            print(f"\nCreate one first:")
            print(f"  /add \"{name}\" — create new feature or bug")
            sys.exit(1)
    else:
        # Validate specified type exists
        workflow_path = cfg.get_workflow_path(name, workflow_type)
        if not workflow_path.exists():
            print(f"✗ {workflow_type.capitalize()} '{name}' not found at {workflow_path}")
            print(f"\nCreate it first:")
            print(f"  /add \"{name}\" — create new {workflow_type}")
            sys.exit(1)

    # Validate state.yml exists
    state_path = cfg.get_workflow_path(name, workflow_type) / "state.yml"
    if not state_path.exists():
        print(f"⚠ Warning: state.yml not found in {workflow_type} '{name}'")
        print(f"  This may indicate a corrupted workflow.")

    # Update global state
    try:
        write_global_state(name, workflow_type, set_method="manual")
        print(f"✓ Current {workflow_type} set to: {name}")

        # Show workflow info
        if state_path.exists():
            content = state_path.read_text()
            for line in content.split('\n'):
                if line.startswith('status:'):
                    status = line.split(':', 1)[1].strip()
                    print(f"\nStatus: {status}")
                    break

        # Suggest next steps
        if workflow_type == "bug":
            print(f"\nNext steps:")
            print(f"  /add-context — add codebase context (optional)")
            print(f"  /triage-bug — diagnose root cause")
        else:
            print(f"\nNext steps:")
            print(f"  /add-context — add codebase context")
            print(f"  /clarify — start requirements clarification")

    except Exception as e:
        print(f"✗ Failed to update global state: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Set current workflow context"
    )
    parser.add_argument(
        "name",
        help="Workflow name (feature or bug)"
    )
    parser.add_argument(
        "--type",
        choices=["feature", "bug"],
        help="Workflow type (auto-detected if not specified)"
    )

    args = parser.parse_args()
    set_current(args.name, args.type)


if __name__ == "__main__":
    main()
