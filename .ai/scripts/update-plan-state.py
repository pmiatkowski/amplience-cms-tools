#!/usr/bin/env python3
"""Update implementation plan state during execution."""

import argparse
import sys
from datetime import date
from pathlib import Path

try:
    from config import cfg
    HAS_YAML = True
    try:
        import yaml
    except ImportError:
        HAS_YAML = False
except ImportError:
    # Fallback if config module not available
    HAS_YAML = False
    class FallbackConfig:
        class paths:
            features = ".ai/features"
        class defaults:
            date_format = "%Y-%m-%d"
        def get_feature_path(self, name):
            return Path(self.paths.features) / name
    cfg = FallbackConfig()


def read_plan_state_no_yaml(state_path: Path) -> dict:
    """Parse plan-state.yml without PyYAML (fallback)."""
    state = {
        'status': 'pending',
        'current_phase': 0,
        'created': None,
        'updated': None,
        'phases': []
    }

    content = state_path.read_text()
    lines = content.split('\n')

    in_phases = False
    current_phase_obj = None

    for line in lines:
        stripped = line.strip()

        if stripped.startswith('status:'):
            state['status'] = stripped.split(':', 1)[1].strip()
        elif stripped.startswith('current_phase:'):
            state['current_phase'] = int(stripped.split(':', 1)[1].strip())
        elif stripped.startswith('created:'):
            state['created'] = stripped.split(':', 1)[1].strip()
        elif stripped.startswith('updated:'):
            state['updated'] = stripped.split(':', 1)[1].strip()
        elif stripped.startswith('phases:'):
            in_phases = True
        elif in_phases and stripped.startswith('- name:'):
            if current_phase_obj:
                state['phases'].append(current_phase_obj)
            current_phase_obj = {'name': stripped.split(':', 1)[1].strip()}
        elif in_phases and stripped.startswith('status:'):
            if current_phase_obj:
                current_phase_obj['status'] = stripped.split(':', 1)[1].strip()

    if current_phase_obj:
        state['phases'].append(current_phase_obj)

    return state


def read_plan_state(state_path: Path) -> dict:
    """Read plan-state.yml."""
    if not state_path.exists():
        raise FileNotFoundError(f"plan-state.yml not found at {state_path}")

    if HAS_YAML:
        import yaml
        with open(state_path) as f:
            return yaml.safe_load(f) or {}
    else:
        return read_plan_state_no_yaml(state_path)


def write_plan_state_no_yaml(state_path: Path, state: dict) -> None:
    """Write plan-state.yml without PyYAML (fallback)."""
    content = f"""status: {state['status']}
current_phase: {state['current_phase']}
created: {state['created']}
updated: {state['updated']}
phases:
"""

    for phase in state['phases']:
        content += f"  - name: {phase['name']}\n"
        content += f"    status: {phase['status']}\n"

    state_path.write_text(content)


def write_plan_state(state_path: Path, state: dict) -> None:
    """Write plan-state.yml."""
    if HAS_YAML:
        import yaml
        with open(state_path, 'w') as f:
            yaml.dump(state, f, default_flow_style=False, sort_keys=False)
    else:
        write_plan_state_no_yaml(state_path, state)


def update_plan_state(feature_name: str, action: str, phase_number: int = None) -> None:
    """Update plan state based on action."""

    today = date.today().strftime(cfg.defaults.date_format)
    feature_path = cfg.get_feature_path(feature_name)
    impl_path = feature_path / "implementation-plan"
    state_path = impl_path / "plan-state.yml"

    # Check feature exists
    if not feature_path.exists():
        print(f"[ERROR] Feature '{feature_name}' not found at {feature_path}")
        sys.exit(1)

    # Check plan exists
    if not impl_path.exists() or not state_path.exists():
        print(f"[ERROR] Implementation plan not found for '{feature_name}'")
        print(f"\nRun first: /define-implementation-plan {feature_name}")
        sys.exit(1)

    # Read current state
    try:
        state = read_plan_state(state_path)
    except Exception as e:
        print(f"[ERROR] Failed to read plan state: {e}")
        sys.exit(1)

    total_phases = len(state.get('phases', []))

    # Validate action
    valid_actions = ['start-plan', 'start-phase', 'complete-phase', 'complete-plan']
    if action not in valid_actions:
        print(f"[ERROR] Invalid action: {action}")
        print(f"Valid actions: {', '.join(valid_actions)}")
        sys.exit(1)

    # Validate phase number for phase-specific actions
    if action in ['start-phase', 'complete-phase']:
        if phase_number is None:
            print(f"[ERROR] Phase number required for action: {action}")
            print(f"Usage: update-plan-state.py {feature_name} {action} <phase-number>")
            sys.exit(1)

        if phase_number < 1 or phase_number > total_phases:
            print(f"[ERROR] Invalid phase number: {phase_number}")
            print(f"Valid range: 1-{total_phases}")
            sys.exit(1)

    # Execute action
    if action == 'start-plan':
        state['status'] = 'in-progress'
        state['current_phase'] = 1
        if total_phases > 0:
            state['phases'][0]['status'] = 'in-progress'
        state['updated'] = today

        print(f"[OK] Plan execution started for '{feature_name}'")
        print(f"  Status: in-progress")
        print(f"  Current phase: 1 of {total_phases}")
        if total_phases > 0:
            print(f"  Phase 1: {state['phases'][0]['name']} (in-progress)")

    elif action == 'start-phase':
        state['current_phase'] = phase_number
        state['phases'][phase_number - 1]['status'] = 'in-progress'
        state['updated'] = today

        phase_name = state['phases'][phase_number - 1]['name']
        print(f"[OK] Phase {phase_number} started: {phase_name}")
        print(f"  Status: in-progress")

    elif action == 'complete-phase':
        # Mark current phase as completed
        state['phases'][phase_number - 1]['status'] = 'completed'

        # If not last phase, start next phase
        if phase_number < total_phases:
            state['current_phase'] = phase_number + 1
            state['phases'][phase_number]['status'] = 'in-progress'
            state['updated'] = today

            phase_name = state['phases'][phase_number - 1]['name']
            next_phase_name = state['phases'][phase_number]['name']
            print(f"[OK] Phase {phase_number} completed: {phase_name}")
            print(f"  Next phase: {phase_number + 1} - {next_phase_name} (in-progress)")
        else:
            # Last phase - mark plan as completed
            state['status'] = 'completed'
            state['updated'] = today

            phase_name = state['phases'][phase_number - 1]['name']
            print(f"[OK] Phase {phase_number} completed: {phase_name}")
            print(f"[OK] All phases completed!")
            print(f"  Plan status: completed")

    elif action == 'complete-plan':
        state['status'] = 'completed'
        for phase in state['phases']:
            phase['status'] = 'completed'
        state['updated'] = today

        print(f"[OK] Plan completed for '{feature_name}'")
        print(f"  All {total_phases} phases marked as completed")

    # Write updated state
    try:
        write_plan_state(state_path, state)
    except Exception as e:
        print(f"[ERROR] Failed to write plan state: {e}")
        sys.exit(1)

    print(f"\nUpdated: {state_path}")


def main():
    parser = argparse.ArgumentParser(description="Update implementation plan state")
    parser.add_argument("feature", help="Feature name")
    parser.add_argument("action",
                       choices=['start-plan', 'start-phase', 'complete-phase', 'complete-plan'],
                       help="Action to perform")
    parser.add_argument("phase", type=int, nargs='?',
                       help="Phase number (required for start-phase and complete-phase)")

    args = parser.parse_args()
    update_plan_state(args.feature, args.action, args.phase)


if __name__ == "__main__":
    main()
