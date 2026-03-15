# README Template Reference

Industry-standard README structure for open source projects.

## Standard Structure

```markdown
# Project Name

Brief one-line description of what this project does.

[Badges: version, license, build status - optional]

## Overview

2-3 paragraph description covering:
- What problem it solves
- Who it's for
- Key differentiators

## Quick Start

### Prerequisites

- Requirement 1 (with version)
- Requirement 2

### Installation

```bash
npm install project-name
# or appropriate package manager
```

### Basic Usage

```language
// Minimal working example
```

## Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| Feature 1 | Brief description | [./docs/feature-1.md](./docs/feature-1.md) |
| Feature 2 | Brief description | [./docs/feature-2.md](./docs/feature-2.md) |

## Architecture

High-level overview of the project structure:

```
project/
├── src/
│   ├── components/    # Description
│   ├── lib/          # Description
│   └── index.ts      # Entry point
├── docs/             # Documentation
└── tests/            # Test files
```

See [./docs/architecture.md](./docs/architecture.md) for detailed architecture.

## Documentation

- [Installation Guide](./docs/installation.md)
- [Configuration](./docs/configuration.md)
- [API Reference](./docs/api/index.md)
- [Architecture](./docs/architecture.md)
- [Contributing](./CONTRIBUTING.md)

## Development

### Setup

```bash
git clone https://github.com/org/repo.git
cd repo
# install dependencies
```

### Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run tests |
| `npm run build` | Build for production |
| `npm run dev` | Start development server |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[License Type] - See [LICENSE](./LICENSE)
```

## Section Guidelines

### Title + Description

- Keep under 120 characters total
- Should be searchable and descriptive
- Avoid marketing language

### Overview

- Answer: What? Why? Who?
- Keep under 200 words
- Focus on value proposition

### Quick Start

- Must be copy-pasteable
- Should work in under 5 minutes
- No advanced configuration required
- Include only essential steps

### Features Table

- Link to detailed ./docs/*.md files
- Keep descriptions under 50 characters
- Maximum 10 features in table (add "See more" link if needed)
- Use consistent terminology

### Architecture

- High-level only in README
- Link to detailed architecture.md
- Show directory structure
- Explain main components briefly

### Documentation Links

- Organize by audience (users first, developers second)
- Keep most important links first
- Use relative paths
- Keep list concise (5-10 links max)

### Development

- Targeted at contributors
- Include setup steps
- List common commands in table format
- Link to CONTRIBUTING.md for details

## README Checklist

- [ ] Clear project title and description
- [ ] Overview explains value proposition
- [ ] Quick start works with copy-paste
- [ ] Features table with doc links
- [ ] Architecture overview
- [ ] Documentation links
- [ ] Development setup
- [ ] Contributing section
- [ ] License information

## Common Mistakes to Avoid

1. **Too long**: Keep under 200 lines, move details to ./docs/
2. **No examples**: Include working code snippets
3. **Outdated badges**: Remove or update stale badges
4. **Missing prerequisites**: List all requirements
5. **Dead links**: Verify all links work
6. **No structure**: Use consistent heading hierarchy
