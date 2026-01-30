#!/usr/bin/env python3
"""Cleanup AI workflow by removing all features, bugs, ideas and resetting global state.

Supports two modes:
1. Full cleanup (default): Remove all workflows and reset global state
2. Validate mode (--validate): Sync completion states across workflows
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import date
from pathlib import Path
from typing import Optional

try:
    import yaml
except ImportError:
    yaml = None

try:
    from config import cfg
except ImportError:
    print("✗ Error: Could not import config module", file=sys.stderr)
    sys.exit(1)


def read_yaml_file(path: Path) -> dict:
    """Read a YAML file and return its contents as a dict."""
    if not path.exists():
        return {}
    
    content = path.read_text()
    
    # Try using yaml library if available
    if yaml:
        try:
            return yaml.safe_load(content) or {}
        except:
            pass
    
    # Fallback: simple line-by-line parsing
    result = {}
    current_section = None
    
    for line in content.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        
        # Check for section (indented key-value pairs)
        if line.startswith('  ') and ':' in stripped and current_section:
            key, _, value = stripped.partition(':')
            value = value.strip()
            if value in ('null', ''):
                value = None
            if current_section not in result:
                result[current_section] = {}
            result[current_section][key.strip()] = value
        elif ':' in stripped:
            key, _, value = stripped.partition(':')
            key = key.strip()
            value = value.strip()
            if value in ('null', ''):
                current_section = key
                result[key] = {}
            else:
                result[key] = value
                current_section = None
    
    return result


def write_yaml_simple(path: Path, data: dict) -> None:
    """Write a simple YAML file (supports nested dicts one level deep)."""
    lines = []
    for key, value in data.items():
        if isinstance(value, dict):
            lines.append(f"{key}:")
            for k, v in value.items():
                if v is None:
                    lines.append(f"  {k}: null")
                else:
                    lines.append(f"  {k}: {v}")
        else:
            if value is None:
                lines.append(f"{key}: null")
            else:
                lines.append(f"{key}: {value}")
    
    path.write_text('\n'.join(lines) + '\n')


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


def get_plan_state_status(workflow_path: Path) -> Optional[str]:
    """Get the status from plan-state.yml if it exists."""
    plan_state_path = workflow_path / "implementation-plan" / "plan-state.yml"
    if not plan_state_path.exists():
        # For bugs, check fix-plan directory
        plan_state_path = workflow_path / "fix-plan" / "plan-state.yml"
        if not plan_state_path.exists():
            return None
    
    state = read_yaml_file(plan_state_path)
    return state.get('status')


def get_workflow_state(workflow_path: Path) -> dict:
    """Get the state.yml contents for a workflow."""
    state_path = workflow_path / "state.yml"
    if not state_path.exists():
        return {}
    return read_yaml_file(state_path)


def update_workflow_state_status(workflow_path: Path, new_status: str) -> bool:
    """Update the status in a workflow's state.yml."""
    state_path = workflow_path / "state.yml"
    if not state_path.exists():
        return False
    
    today = date.today().strftime(cfg.defaults.date_format)
    state = read_yaml_file(state_path)
    state['status'] = new_status
    state['updated'] = today
    
    write_yaml_simple(state_path, state)
    return True


def get_completion_status(workflow_type: str) -> str:
    """Get the appropriate completion status for a workflow type."""
    if workflow_type == "feature":
        return "completed"
    elif workflow_type == "bug":
        return "closed"
    else:
        return "completed"


def validate_workflows(dry_run: bool = False) -> dict:
    """Validate and sync completion states across all workflows.
    
    Checks:
    1. If plan-state.yml status is 'completed', ensure state.yml reflects completion
    2. If global-state points to a completed workflow, reset it
    """
    features_path = cfg.get_features_path()
    bugs_path = cfg.get_bugs_path()
    global_state_path = cfg.get_global_state_path()
    today = date.today().strftime(cfg.defaults.date_format)
    
    result = {
        "status": "dry_run" if dry_run else "success",
        "validated": [],
        "updated": [],
        "already_synced": [],
        "no_plan": [],
        "global_state_reset": False,
        "global_state_was": None,
        "dry_run": dry_run
    }
    
    # Get current global state
    current_context_name = None
    current_context_type = None
    if global_state_path.exists():
        global_state = read_yaml_file(global_state_path)
        current = global_state.get('current', {})
        if isinstance(current, dict):
            current_context_name = current.get('name')
            current_context_type = current.get('workflow_type')
    
    # Process features
    if features_path.exists():
        for feature_dir in features_path.iterdir():
            if not feature_dir.is_dir() or feature_dir.name == ".gitkeep":
                continue
            
            workflow_name = feature_dir.name
            plan_status = get_plan_state_status(feature_dir)
            state = get_workflow_state(feature_dir)
            current_status = state.get('status')
            target_status = get_completion_status("feature")
            
            item = {
                "name": workflow_name,
                "type": "feature",
                "plan_status": plan_status,
                "state_status": current_status
            }
            
            if plan_status is None:
                result["no_plan"].append(item)
            elif plan_status == "completed":
                result["validated"].append(item)
                if current_status != target_status:
                    item["new_status"] = target_status
                    if not dry_run:
                        update_workflow_state_status(feature_dir, target_status)
                    result["updated"].append(item)
                else:
                    result["already_synced"].append(item)
    
    # Process bugs
    if bugs_path.exists():
        for bug_dir in bugs_path.iterdir():
            if not bug_dir.is_dir() or bug_dir.name == ".gitkeep":
                continue
            
            workflow_name = bug_dir.name
            plan_status = get_plan_state_status(bug_dir)
            state = get_workflow_state(bug_dir)
            current_status = state.get('status')
            target_status = get_completion_status("bug")
            
            item = {
                "name": workflow_name,
                "type": "bug",
                "plan_status": plan_status,
                "state_status": current_status
            }
            
            if plan_status is None:
                result["no_plan"].append(item)
            elif plan_status == "completed":
                result["validated"].append(item)
                if current_status != target_status:
                    item["new_status"] = target_status
                    if not dry_run:
                        update_workflow_state_status(bug_dir, target_status)
                    result["updated"].append(item)
                else:
                    result["already_synced"].append(item)
    
    # Check if global state points to a completed workflow
    if current_context_name and current_context_type:
        # Find the workflow
        if current_context_type == "feature":
            workflow_path = features_path / current_context_name
        elif current_context_type == "bug":
            workflow_path = bugs_path / current_context_name
        else:
            workflow_path = None
        
        if workflow_path and workflow_path.exists():
            plan_status = get_plan_state_status(workflow_path)
            if plan_status == "completed":
                result["global_state_reset"] = True
                result["global_state_was"] = {
                    "name": current_context_name,
                    "workflow_type": current_context_type
                }
                if not dry_run:
                    reset_global_state()
    
    return result


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
        help="Preview what would be done without actually doing it"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate and sync completion states instead of full cleanup"
    )

    args = parser.parse_args()
    
    if args.validate:
        result = validate_workflows(dry_run=args.dry_run)
    else:
        result = cleanup(dry_run=args.dry_run)

    # Output JSON for AI parsing
    print(json.dumps(result, indent=2))

    if result.get("status") == "error":
        sys.exit(1)


if __name__ == "__main__":
    main()
