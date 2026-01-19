#!/usr/bin/env python3
"""Gather comprehensive workflow state information for /help command."""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

try:
    from config import cfg, read_global_state, HAS_YAML
    if HAS_YAML:
        import yaml
except ImportError:
    # Fallback if config module not available
    HAS_YAML = False
    class FallbackConfig:
        class paths:
            features = ".ai/features"
            bugs = ".ai/bugs"
            memory = ".ai/memory"
        class defaults:
            date_format = "%Y-%m-%d"
        def get_workflow_path(self, name, workflow_type):
            base = self.paths.features if workflow_type == "feature" else self.paths.bugs
            return Path(base) / name
        def get_global_state_path(self):
            return Path(self.paths.memory) / "global-state.yml"
        def get_workflow_type(self, type_name):
            if type_name == "feature":
                return type('obj', (object,), {
                    'states': ['clarifying', 'prd-draft', 'prd-approved', 'planning', 'in-progress']
                })()
            else:
                return type('obj', (object,), {
                    'states': ['reported', 'triaged', 'fixing', 'resolved', 'closed']
                })()
    cfg = FallbackConfig()

    def read_global_state():
        """Fallback global state reader."""
        state_path = cfg.get_global_state_path()
        if not state_path.exists():
            return {'version': 1, 'current': {'name': None, 'workflow_type': None, 'set_date': None, 'set_method': None}}

        state = {'current': {}}
        content = state_path.read_text()
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('name:'):
                val = line.split(':', 1)[1].strip()
                state['current']['name'] = None if val == 'null' else val
            elif line.startswith('workflow_type:'):
                val = line.split(':', 1)[1].strip()
                state['current']['workflow_type'] = None if val == 'null' else val
            elif line.startswith('set_date:'):
                val = line.split(':', 1)[1].strip()
                state['current']['set_date'] = None if val == 'null' else val
            elif line.startswith('set_method:'):
                val = line.split(':', 1)[1].strip()
                state['current']['set_method'] = None if val == 'null' else val
        return state


def convert_dates_to_strings(obj):
    """Recursively convert date objects to strings for JSON serialization."""
    if isinstance(obj, date):
        return obj.strftime("%Y-%m-%d")
    elif isinstance(obj, dict):
        return {k: convert_dates_to_strings(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_dates_to_strings(item) for item in obj]
    else:
        return obj


def read_yaml_file(file_path):
    """Read YAML file with fallback parsing."""
    if not file_path.exists():
        return None

    try:
        if HAS_YAML:
            with open(file_path) as f:
                data = yaml.safe_load(f) or {}
            # Convert any date objects to strings for JSON serialization
            return convert_dates_to_strings(data)
        else:
            # Fallback parsing for state.yml
            return parse_state_file_no_yaml(file_path)
    except Exception as e:
        print(f"Warning: Could not parse {file_path}: {e}", file=sys.stderr)
        return None


def parse_state_file_no_yaml(file_path):
    """Parse state YAML files without PyYAML library."""
    state = {}
    content = file_path.read_text()

    for line in content.split('\n'):
        line = line.strip()
        if ':' in line and not line.startswith('-'):
            key, val = line.split(':', 1)
            state[key.strip()] = val.strip()

    return state


def parse_plan_state_no_yaml(file_path):
    """Parse plan-state.yml without PyYAML."""
    state = {
        'status': 'pending',
        'current_phase': 0,
        'created': None,
        'updated': None,
        'phases': []
    }

    content = file_path.read_text()
    lines = content.split('\n')

    in_phases = False
    current_phase = None

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
            if current_phase:
                state['phases'].append(current_phase)
            current_phase = {'name': stripped.split(':', 1)[1].strip(), 'status': 'pending'}
        elif in_phases and stripped.startswith('status:') and current_phase:
            current_phase['status'] = stripped.split(':', 1)[1].strip()

    if current_phase:
        state['phases'].append(current_phase)

    return state


def gather_current_context():
    """Read global state to get current workflow context."""
    global_state = read_global_state()
    current = global_state.get('current', {})

    has_context = current.get('name') is not None

    return {
        'exists': has_context,
        'name': current.get('name'),
        'workflow_type': current.get('workflow_type'),
        'set_date': current.get('set_date'),
        'set_method': current.get('set_method')
    }


def count_clarifications_in_file(file_path):
    """Count clarifications in request.md's ## Clarifications section."""
    if not file_path.exists():
        return 0

    try:
        content = file_path.read_text()
        # Check if ## Clarifications section exists
        if '## Clarifications' not in content:
            return 0

        # Count #### Q patterns (each question)
        import re
        questions = re.findall(r'####\s+Q\d+:', content)
        return len(questions)
    except Exception:
        return 0


def check_artifacts(workflow_path, workflow_type):
    """Check which artifact files exist for a workflow."""
    artifacts = {}

    # Common artifacts
    artifacts['context_md'] = (workflow_path / 'context.md').exists()

    # Count clarifications in request.md
    request_file = workflow_path / 'request.md'
    artifacts['clarifications_count'] = count_clarifications_in_file(request_file)

    # Workflow-specific artifacts
    if workflow_type == 'feature':
        artifacts['prd_md'] = (workflow_path / 'prd.md').exists()
        artifacts['implementation_plan'] = (workflow_path / 'implementation-plan').exists()
        artifacts['triage_md'] = False
        artifacts['fix_plan_md'] = False
    else:  # bug
        artifacts['prd_md'] = False
        artifacts['implementation_plan'] = False
        artifacts['triage_md'] = (workflow_path / 'triage.md').exists()
        artifacts['fix_plan_md'] = (workflow_path / 'fix-plan.md').exists()

    return artifacts


def gather_workflow_state(name, workflow_type):
    """Read workflow state.yml file."""
    workflow_path = cfg.get_workflow_path(name, workflow_type)

    if not workflow_path.exists():
        return {'exists': False}

    state_file = workflow_path / 'state.yml'
    state_data = read_yaml_file(state_file)

    if state_data is None:
        return {
            'exists': False,
            'error': 'Missing or corrupted state.yml'
        }

    artifacts = check_artifacts(workflow_path, workflow_type)

    return {
        'exists': True,
        'status': state_data.get('status', 'unknown'),
        'created': state_data.get('created'),
        'updated': state_data.get('updated'),
        'artifacts': artifacts
    }


def gather_plan_state(name):
    """Read implementation plan state (features only)."""
    workflow_path = cfg.get_workflow_path(name, 'feature')
    plan_state_file = workflow_path / 'implementation-plan' / 'plan-state.yml'

    if not plan_state_file.exists():
        return {'exists': False}

    if HAS_YAML:
        with open(plan_state_file) as f:
            plan_data = yaml.safe_load(f) or {}
        # Convert any date objects to strings for JSON serialization
        plan_data = convert_dates_to_strings(plan_data)
    else:
        plan_data = parse_plan_state_no_yaml(plan_state_file)

    phases = plan_data.get('phases', [])

    return {
        'exists': True,
        'status': plan_data.get('status', 'pending'),
        'current_phase': plan_data.get('current_phase', 0),
        'total_phases': len(phases),
        'phases': phases
    }


def gather_workflow_config():
    """Get workflow type configurations."""
    feature_config = cfg.get_workflow_type('feature')
    bug_config = cfg.get_workflow_type('bug')

    return {
        'feature_states': feature_config.states,
        'bug_states': bug_config.states
    }


def main():
    parser = argparse.ArgumentParser(description="Gather workflow state information")
    parser.add_argument("workflow_name", nargs='?', help="Workflow name (optional, uses current context if omitted)")
    args = parser.parse_args()

    # Gather current context
    current_context = gather_current_context()

    # Determine workflow name
    workflow_name = args.workflow_name
    if workflow_name is None:
        if not current_context['exists']:
            # No current context and no name provided
            result = {
                'status': 'success',
                'current_context': current_context,
                'workflow_state': {'exists': False},
                'plan_state': {'exists': False},
                'workflow_config': gather_workflow_config()
            }
            print(json.dumps(result, indent=2))
            sys.exit(0)

        workflow_name = current_context['name']
        workflow_type = current_context['workflow_type']
    else:
        # Explicit name provided - detect type
        feature_path = cfg.get_workflow_path(workflow_name, 'feature')
        bug_path = cfg.get_workflow_path(workflow_name, 'bug')

        if feature_path.exists():
            workflow_type = 'feature'
        elif bug_path.exists():
            workflow_type = 'bug'
        else:
            # Workflow not found
            result = {
                'status': 'error',
                'error_message': f"Workflow '{workflow_name}' not found",
                'current_context': current_context,
                'workflow_state': {'exists': False},
                'plan_state': {'exists': False},
                'workflow_config': gather_workflow_config()
            }
            print(json.dumps(result, indent=2))
            sys.exit(1)

    # Gather workflow state
    workflow_state = gather_workflow_state(workflow_name, workflow_type)

    # Gather plan state (features only)
    plan_state = {'exists': False}
    if workflow_type == 'feature' and workflow_state.get('exists'):
        plan_state = gather_plan_state(workflow_name)

    # Gather workflow config
    workflow_config = gather_workflow_config()

    # Output JSON
    result = {
        'status': 'success',
        'current_context': current_context,
        'workflow_state': workflow_state,
        'plan_state': plan_state,
        'workflow_config': workflow_config
    }

    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
