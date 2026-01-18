#!/usr/bin/env python3
"""Cleanup AI workflow by removing all features, bugs, ideas and resetting global state."""

import argparse
import json
import shutil
import sys
from datetime import date
from pathlib import Path

try:
    from config import cfg
except ImportError:
    print("✗ Error: Could not import config module", file=sys.stderr)
    sys.exit(1)


def count_items_in_directory(path: Path) -> dict:
    """Count features, bugs, or ideas in a directory."""
    if not path.exists():
        return {"exists": False, "count": 0, "items": []}

    items = [d.name for d in path.iterdir() if d.is_dir() and d.name != ".gitkeep"]
    return {
        "exists": True,
        "count": len(items),
        "items": sorted(items)
    }


def reset_global_state() -> None:
    """Reset global-state.yml to initial empty state."""
    memory_path = cfg.get_memory_path()
    memory_path.mkdir(parents=True, exist_ok=True)

    today = date.today().strftime(cfg.defaults.date_format)
    state_path = cfg.get_global_state_path()

    content = f"""version: 1
current:
  name: null
  workflow_type: null
  set_date: null
  set_method: null
last_updated: {today}
"""
    state_path.write_text(content)


def cleanup(dry_run: bool = False) -> dict:
    """Remove all workflow folders and reset global state."""

    # Gather current state using new getter methods
    features_path = cfg.get_features_path()
    bugs_path = cfg.get_bugs_path()
    ideas_path = cfg.get_ideas_path()
    global_state_path = cfg.get_global_state_path()

    features = count_items_in_directory(features_path)
    bugs = count_items_in_directory(bugs_path)
    ideas = count_items_in_directory(ideas_path)

    has_current_context = False
    current_context_name = None
    current_context_type = None

    if global_state_path.exists():
        content = global_state_path.read_text()
        for line in content.split('\n'):
            if line.startswith('name:'):
                val = line.split(':', 1)[1].strip()
                if val and val not in ['', 'null']:
                    current_context_name = val
                    has_current_context = True
            elif line.startswith('workflow_type:'):
                val = line.split(':', 1)[1].strip()
                if val and val not in ['', 'null']:
                    current_context_type = val

    result = {
        "features": features,
        "bugs": bugs,
        "ideas": ideas,
        "has_current_context": has_current_context,
        "current_context": {
            "name": current_context_name,
            "workflow_type": current_context_type
        } if has_current_context else None,
        "dry_run": dry_run
    }

    if dry_run:
        result["status"] = "dry_run"
        return result

    # Perform cleanup
    try:
        if features_path.exists():
            shutil.rmtree(features_path)
            features_path.mkdir(parents=True, exist_ok=True)
            (features_path / ".gitkeep").touch()

        if bugs_path.exists():
            shutil.rmtree(bugs_path)
            bugs_path.mkdir(parents=True, exist_ok=True)

        if ideas_path.exists():
            shutil.rmtree(ideas_path)
            ideas_path.mkdir(parents=True, exist_ok=True)

        reset_global_state()

        result["status"] = "success"
        result["message"] = "All workflows and global state have been cleaned up"

    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Cleanup AI workflow directories and reset global state"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be deleted without actually deleting"
    )

    args = parser.parse_args()
    result = cleanup(dry_run=args.dry_run)

    # Output JSON for AI parsing
    print(json.dumps(result, indent=2))

    if result["status"] == "error":
        sys.exit(1)


if __name__ == "__main__":
    main()
