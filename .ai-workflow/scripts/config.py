#!/usr/bin/env python3
"""Configuration loader for AI Feature Workflow."""

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# Optional YAML support - falls back to defaults if not available
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


@dataclass
class PathsConfig:
    features: str = ".ai-workflow/features"
    bugs: str = ".ai-workflow/bugs"
    prompts: str = ".ai-workflow/prompts"
    scripts: str = ".ai-workflow/scripts"
    memory: str = ".ai-workflow/memory"


@dataclass
class DefaultsConfig:
    date_format: str = "%Y-%m-%d"
    workflow_type: str = "feature"


@dataclass
class WorkflowTypeConfig:
    base_path: str
    states: list
    initial_state: str
    artifacts: list
    classification_keywords: list = field(default_factory=list)


@dataclass
class CurrentContext:
    """Current workflow context."""
    name: Optional[str] = None
    workflow_type: Optional[str] = None
    set_date: Optional[str] = None
    set_method: Optional[str] = None  # "auto" | "manual"


@dataclass
class Config:
    version: int = 1
    paths: PathsConfig = field(default_factory=PathsConfig)
    defaults: DefaultsConfig = field(default_factory=DefaultsConfig)
    workflow_types: dict = field(default_factory=dict)
    runner: str = "python"  # future: bash | powershell
    
    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> "Config":
        """Load config from YAML file or return defaults."""
        
        if config_path is None:
            config_path = cls._find_config()
        
        if config_path is None or not config_path.exists():
            return cls()
        
        if not HAS_YAML:
            print("⚠ PyYAML not installed. Using default config.", file=sys.stderr)
            print("  Install with: pip install pyyaml", file=sys.stderr)
            return cls()
        
        with open(config_path) as f:
            data = yaml.safe_load(f) or {}
        
        return cls._from_dict(data)
    
    @classmethod
    def _find_config(cls) -> Optional[Path]:
        """Find config.yml by walking up from current directory."""
        
        current = Path.cwd()
        
        for _ in range(10):  # max 10 levels up
            config_path = current / ".ai-workflow" / "config.yml"
            if config_path.exists():
                return config_path
            
            parent = current.parent
            if parent == current:
                break
            current = parent
        
        return None
    
    @classmethod
    def _from_dict(cls, data: dict) -> "Config":
        """Create Config from dictionary."""

        paths_data = data.get("paths", {})
        defaults_data = data.get("defaults", {})
        workflow_types_data = data.get("workflow_types", {})

        # Parse workflow types
        workflow_types = {}
        for type_name, type_data in workflow_types_data.items():
            workflow_types[type_name] = WorkflowTypeConfig(
                base_path=type_data.get("base_path", "features"),
                states=type_data.get("states", []),
                initial_state=type_data.get("initial_state", "clarifying"),
                artifacts=type_data.get("artifacts", []),
                classification_keywords=type_data.get("classification_keywords", [])
            )

        return cls(
            version=data.get("version", 1),
            paths=PathsConfig(
                features=paths_data.get("features", ".ai-workflow/features"),
                bugs=paths_data.get("bugs", ".ai-workflow/bugs"),
                prompts=paths_data.get("prompts", ".ai-workflow/prompts"),
                scripts=paths_data.get("scripts", ".ai-workflow/scripts"),
                memory=paths_data.get("memory", ".ai-workflow/memory"),
            ),
            defaults=DefaultsConfig(
                date_format=defaults_data.get("date_format", "%Y-%m-%d"),
                workflow_type=defaults_data.get("workflow_type", "feature"),
            ),
            workflow_types=workflow_types,
            runner=data.get("runner", "python"),
        )
    
    def get_features_path(self) -> Path:
        """Get absolute path to features directory."""
        return Path(self.paths.features)

    def get_feature_path(self, feature_name: str) -> Path:
        """Get absolute path to a specific feature directory."""
        return self.get_features_path() / feature_name

    def get_workflow_type(self, type_name: str):
        """Get workflow type config, fallback to feature if not found."""
        return self.workflow_types.get(type_name, self._default_feature_workflow())

    def get_workflow_path(self, name: str, workflow_type: str = "feature") -> Path:
        """Get absolute path to a workflow item based on type."""
        wf_config = self.get_workflow_type(workflow_type)
        base_path = getattr(self.paths, wf_config.base_path)
        return Path(base_path) / name

    def _default_feature_workflow(self):
        """Default feature workflow for backward compatibility."""
        return WorkflowTypeConfig(
            base_path="features",
            states=["clarifying", "prd-draft", "prd-approved", "planning", "in-progress"],
            initial_state="clarifying",
            artifacts=["state.yml", "request.md", "context.md", "clarifications/", "prd.md", "updates/", "implementation-plan/"],
            classification_keywords=[]
        )

    def get_memory_path(self) -> Path:
        """Get absolute path to memory directory."""
        return Path(self.paths.memory)

    def get_global_state_path(self) -> Path:
        """Get absolute path to global state file."""
        return self.get_memory_path() / "global-state.yml"


# Global config instance - loaded on import
cfg = Config.load()


# Global state management functions

def _default_global_state() -> dict:
    """Default global state structure."""
    from datetime import date
    today = date.today().strftime(cfg.defaults.date_format)
    return {
        'version': 1,
        'current': {
            'name': None,
            'workflow_type': None,
            'set_date': None,
            'set_method': None
        },
        'last_updated': today
    }


def _parse_global_state_no_yaml(state_path: Path) -> dict:
    """Parse global-state.yml without PyYAML (fallback)."""
    state = _default_global_state()
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
        elif line.startswith('last_updated:'):
            state['last_updated'] = line.split(':', 1)[1].strip()

    return state


def read_global_state() -> dict:
    """
    Read global state from memory/global-state.yml.
    Returns default structure if file doesn't exist or is corrupted.
    """
    state_path = cfg.get_global_state_path()

    if not state_path.exists():
        return _default_global_state()

    try:
        if HAS_YAML:
            with open(state_path) as f:
                data = yaml.safe_load(f) or {}
            return data
        else:
            # Parse without YAML library
            return _parse_global_state_no_yaml(state_path)
    except Exception as e:
        print(f"⚠ Warning: Could not read global state: {e}", file=sys.stderr)
        return _default_global_state()


def write_global_state(name: Optional[str], workflow_type: Optional[str],
                       set_method: str = "auto") -> None:
    """
    Write global state to memory/global-state.yml.
    Creates memory folder if it doesn't exist.
    """
    from datetime import date

    memory_path = cfg.get_memory_path()
    memory_path.mkdir(parents=True, exist_ok=True)

    today = date.today().strftime(cfg.defaults.date_format)
    state_path = cfg.get_global_state_path()

    content = f"""version: 1
current:
  name: {name or 'null'}
  workflow_type: {workflow_type or 'null'}
  set_date: {today if name else 'null'}
  set_method: {set_method if name else 'null'}
last_updated: {today}
"""
    state_path.write_text(content)


def get_current_context() -> CurrentContext:
    """Get current workflow context from global state."""
    state = read_global_state()
    current = state.get('current', {})

    return CurrentContext(
        name=current.get('name'),
        workflow_type=current.get('workflow_type'),
        set_date=current.get('set_date'),
        set_method=current.get('set_method')
    )


# Convenience exports
def reload_config(config_path: Optional[Path] = None) -> Config:
    """Reload configuration (useful for testing)."""
    global cfg
    cfg = Config.load(config_path)
    return cfg


if __name__ == "__main__":
    # Print current config when run directly
    print(f"Config loaded:")
    print(f"  version: {cfg.version}")
    print(f"  paths.features: {cfg.paths.features}")
    print(f"  paths.prompts: {cfg.paths.prompts}")
    print(f"  paths.scripts: {cfg.paths.scripts}")
    print(f"  defaults.date_format: {cfg.defaults.date_format}")
    print(f"  runner: {cfg.runner}")
