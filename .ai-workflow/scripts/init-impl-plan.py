#!/usr/bin/env python3
"""Initialize implementation plan folder structure."""

import argparse
import sys
from datetime import date
from pathlib import Path

try:
    from config import cfg
except ImportError:
    # Fallback if config module not available
    class FallbackConfig:
        class paths:
            features = ".ai-workflow/features"
        class defaults:
            date_format = "%Y-%m-%d"
        def get_feature_path(self, name):
            return Path(self.paths.features) / name
    cfg = FallbackConfig()


def init_impl_plan(feature_name: str) -> None:
    """Create implementation plan folder structure."""
    
    today = date.today().strftime(cfg.defaults.date_format)
    feature_path = cfg.get_feature_path(feature_name)
    impl_path = feature_path / "implementation-plan"
    
    # Check feature exists
    if not feature_path.exists():
        print(f"✗ Feature '{feature_name}' not found at {feature_path}")
        print(f"\nRun first: /add-feature {feature_name} \"description\"")
        sys.exit(1)
    
    # Check PRD exists (warning only)
    prd_path = feature_path / "prd.md"
    if not prd_path.exists():
        print(f"⚠ Warning: PRD not found at {prd_path}")
        print("  Recommendation: Run /create-prd before defining implementation plan\n")
    
    # Check if impl plan already exists
    if impl_path.exists():
        print(f"✗ Implementation plan already exists at {impl_path}")
        sys.exit(1)
    
    # Create directory
    impl_path.mkdir(parents=True)
    
    # plan-state.yml
    state_content = f"""status: pending
current_phase: 0
created: {today}
updated: {today}
phases: []
"""
    (impl_path / "plan-state.yml").write_text(state_content)
    
    # plan.md (empty template)
    plan_content = f"""# Implementation Plan: {feature_name}

> **Status**: Pending  
> **Created**: {today}  
> **PRD Version**: TBD

---

## Summary

**Total Phases**: TBD  
**Estimated Scope**: TBD

---

<!-- Run /define-implementation-plan to populate this file -->
"""
    (impl_path / "plan.md").write_text(plan_content)
    
    # Update feature state.yml
    state_file = feature_path / "state.yml"
    if state_file.exists():
        content = state_file.read_text()
        # Update status and date
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if line.startswith('status:'):
                new_lines.append('status: planning')
            elif line.startswith('updated:'):
                new_lines.append(f'updated: {today}')
            else:
                new_lines.append(line)
        state_file.write_text('\n'.join(new_lines))
    
    # Output
    print(f"""✓ Implementation plan initialized: {feature_name}

Created:
  {impl_path}/
  ├── plan-state.yml
  └── plan.md

Updated:
  state.yml (status: planning)

Next step:
  Run /define-implementation-plan {feature_name} to generate the plan
""")


def main():
    parser = argparse.ArgumentParser(description="Initialize implementation plan structure")
    parser.add_argument("feature", help="Feature name (must already exist)")
    
    args = parser.parse_args()
    init_impl_plan(args.feature)


if __name__ == "__main__":
    main()
