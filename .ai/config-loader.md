# Script: config.py

## Purpose
Load and provide access to workflow configuration.

## Location
```
.ai-workflow/scripts/config.py
```

## Usage in Scripts
```python
from config import cfg

features_dir = cfg.paths.features
date_fmt = cfg.defaults.date_format
```

---

## Script

```python
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
    features: str = "features"
    prompts: str = ".ai-workflow/prompts"
    scripts: str = ".ai-workflow/scripts"


@dataclass
class DefaultsConfig:
    date_format: str = "%Y-%m-%d"


@dataclass
class Config:
    version: int = 1
    paths: PathsConfig = field(default_factory=PathsConfig)
    defaults: DefaultsConfig = field(default_factory=DefaultsConfig)
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
        
        return cls(
            version=data.get("version", 1),
            paths=PathsConfig(
                features=paths_data.get("features", "features"),
                prompts=paths_data.get("prompts", ".ai-workflow/prompts"),
                scripts=paths_data.get("scripts", ".ai-workflow/scripts"),
            ),
            defaults=DefaultsConfig(
                date_format=defaults_data.get("date_format", "%Y-%m-%d"),
            ),
            runner=data.get("runner", "python"),
        )
    
    def get_features_path(self) -> Path:
        """Get absolute path to features directory."""
        return Path(self.paths.features)
    
    def get_feature_path(self, feature_name: str) -> Path:
        """Get absolute path to a specific feature directory."""
        return self.get_features_path() / feature_name


# Global config instance - loaded on import
cfg = Config.load()


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
```

---

## Usage Example

Updated `init-feature.py` using config loader:

```python
#!/usr/bin/env python3
"""Initialize a new feature folder structure."""

import argparse
import re
import sys
from datetime import date
from pathlib import Path

from config import cfg  # <-- Import config


def to_kebab_case(name: str) -> str:
    name = re.sub(r'[^a-zA-Z0-9\s-]', '', name)
    name = re.sub(r'[\s_]+', '-', name)
    name = re.sub(r'-+', '-', name)
    return name.lower().strip('-')


def create_feature(feature_name: str, description: str) -> None:
    feature_name = to_kebab_case(feature_name)
    today = date.today().strftime(cfg.defaults.date_format)  # <-- Use config
    feature_path = cfg.get_feature_path(feature_name)  # <-- Use config
    
    # ... rest of script
```

---

## Output (when run directly)

```bash
$ python .ai-workflow/scripts/config.py

Config loaded:
  version: 1
  paths.features: features
  paths.prompts: .ai-workflow/prompts
  paths.scripts: .ai-workflow/scripts
  defaults.date_format: %Y-%m-%d
  runner: python
```

---

## Features

| Feature | Description |
|---------|-------------|
| Auto-discovery | Walks up directory tree to find `.ai-workflow/config.yml` |
| Defaults | Works without config file (sensible defaults) |
| No dependencies | Falls back gracefully if PyYAML not installed |
| Typed | Dataclasses provide IDE autocomplete |
| Reloadable | `reload_config()` for testing/dynamic updates |
| Extensible | Ready for `runner` option (polyglot support) |
