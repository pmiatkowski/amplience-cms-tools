#!/usr/bin/env python3
"""Initialize a new feature (backward compatibility wrapper)."""

import subprocess
import sys
import argparse


def main():
    parser = argparse.ArgumentParser(description="Initialize a new feature")
    parser.add_argument("name", help="Feature name (will be converted to kebab-case)")
    parser.add_argument("description", help="Brief feature description")

    args = parser.parse_args()

    # Delegate to init-workflow.py
    result = subprocess.run([
        "python", ".ai-workflow/scripts/init-workflow.py",
        args.name, args.description, "--type", "feature"
    ])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
