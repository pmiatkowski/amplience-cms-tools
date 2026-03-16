# Feature Documentation Template

Template for ./docs/*.md files - detailed documentation for features, modules, or concepts.

## Standard Structure

```markdown
# Feature Name

Brief description (1-2 sentences) of what this feature does.

## Overview

Detailed explanation covering:
- What this feature does
- When to use it
- How it fits into the larger system
- Any prerequisites or dependencies

## Usage

### Basic Example

```language
// Simplest possible usage
```

### Advanced Example

```language
// More complex scenario with options
```

## Options / Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| param1 | string | required | Description of parameter |
| param2 | number | 0 | Description with default value |
| param3 | boolean | true | Description of boolean option |

## Configuration

How to configure this feature:

```language
// Configuration example
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| FEATURE_ENABLED | no | true | Enable/disable feature |

## Best Practices

1. Best practice with explanation
2. Another best practice
3. Common pattern recommendation

## Common Issues

### Issue Title

**Problem:** Description of the problem

**Solution:** How to fix it

```language
// Fix example if applicable
```

## Related Features

- [Related Feature 1](./feature-1.md) - Brief description of relationship
- [Related Feature 2](./feature-2.md) - Brief description of relationship

## API Reference

If this feature exposes an API:

### FunctionName

**Signature:**

```language
functionName(param1: Type, param2?: Type): ReturnType
```

**Parameters:**

- `param1` (Type) - Description
- `param2` (Type, optional) - Description

**Returns:** Description of return value

**Throws:** Description of errors thrown

**Example:**

```language
const result = functionName('value', { option: true });
```
```

## Section Guidelines

### Title + Description

- Start with H1 heading
- Keep description under 100 characters
- Use action words: "Configure", "Implement", "Use"

### Overview

- 2-4 paragraphs maximum
- Include a diagram if helpful
- Link to related concepts

### Usage

- Always include at least one working example
- Basic example should be minimal (5-10 lines)
- Advanced example shows real-world usage
- Include expected output where helpful

### Options / Parameters

- Use table format for clarity
- Mark required parameters
- Include default values
- Link to types if complex

### Configuration

- Show complete configuration examples
- Include environment variables
- Explain each option briefly

### Best Practices

- Numbered list format
- Explain WHY, not just WHAT
- Link to examples when possible

### Common Issues

- Use problem/solution format
- Include error messages users might see
- Provide copy-pasteable fixes

### Related Features

- Link to other documentation files
- Explain the relationship briefly
- Help users discover related content

### API Reference

- Include complete signatures
- Document all parameters
- Show usage examples
- Document errors/exceptions

## Writing Guidelines

1. **Start with examples**: Code first, explanation after
2. **Be scannable**: Use headers, lists, tables
3. **Show, don't just tell**: Include working code
4. **Link liberally**: Connect to related docs
5. **Keep current**: Update as code changes
6. **One concept per file**: Don't combine unrelated features

## File Naming Conventions

| Content Type | Filename Pattern |
|--------------|-----------------|
| Feature docs | `kebab-case.md` |
| API reference | `api/<module>.md` |
| Guides | `guides/<topic>.md` |
| Concepts | `concepts/<concept>.md` |

## Quality Checklist

- [ ] Clear title and description
- [ ] Working code examples
- [ ] Parameter/options table
- [ ] Best practices section
- [ ] Related features linked
- [ ] No broken links
- [ ] Code examples tested
