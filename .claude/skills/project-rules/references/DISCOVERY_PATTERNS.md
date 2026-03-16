# Codebase Discovery Patterns

## Tech Stack Detection

### Language Detection

| File | Language |
|------|----------|
| package.json | JavaScript/TypeScript |
| tsconfig.json | TypeScript |
| pyproject.toml, setup.py, requirements.txt | Python |
| Cargo.toml | Rust |
| go.mod | Go |
| Gemfile | Ruby |
| pom.xml, build.gradle | Java |
| *.csproj | C# |

### Framework Detection (from package.json)

```json
{
  "dependencies": {
    "react": "React",
    "vue": "Vue",
    "angular": "Angular",
    "next": "Next.js",
    "svelte": "Svelte",
    "express": "Express",
    "fastify": "Fastify",
    "nestjs": "NestJS"
  }
}
```

### Test Framework Detection

| File/Pattern | Framework |
|--------------|-----------|
| jest.config.* | Jest |
| vitest.config.* | Vitest |
| pytest.ini, conftest.py | pytest |
| *_test.go | Go test |
| *.spec.ts, *.test.ts | Jest/Vitest |
| *.spec.tsx, *.test.tsx | Jest/Vitest (React) |

## File Naming Pattern Detection

### Component Files

Use Glob patterns to detect:

```
src/**/*.tsx        → React components (TypeScript)
src/**/*.jsx        → React components (JavaScript)
src/**/*.vue        → Vue components
src/**/*.svelte     → Svelte components
```

### Test Files

```
**/*.test.ts        → Jest/Vitest test
**/*.spec.ts        → Jest/Vitest spec
**/test_*.py        → pytest test
**/*_test.py        → pytest test
**/*_test.go        → Go test
**/__tests__/*.ts   → Jest __tests__ directory
```

### Style Files

```
**/*.module.css     → CSS Modules
**/*.styled.ts      → Styled Components
**/*.scss           → SASS/SCSS
**/tailwind.config.* → Tailwind CSS
```

### Config Files

```
.eslintrc.*         → ESLint config
.prettierrc.*       → Prettier config
.editorconfig       → EditorConfig
tsconfig.json       → TypeScript config
babel.config.*      → Babel config
```

## Naming Convention Detection

### Analyze file names in key directories:

```bash
# Components
glob: src/components/**/*.{tsx,jsx}
patterns: PascalCase.tsx, kebab-case.tsx, camelCase.tsx

# Utilities
glob: src/lib/**/*.ts, src/utils/**/*.ts
patterns: camelCase.ts, kebab-case.ts

# Hooks
glob: src/hooks/**/*.ts
patterns: use*.ts
```

### Naming Pattern Analysis

1. Collect all file names in category
2. Extract base names (without extension)
3. Detect case: PascalCase, camelCase, kebab-case, snake_case
4. Detect prefixes/suffixes: use*, *.test, *.spec, *.config
5. Report dominant pattern

## Directory Structure Detection

### Common Patterns

```
src/
  components/     → UI components
  hooks/          → Custom React hooks
  lib/            → Utility functions
  utils/          → Helper functions
  services/       → API/service layer
  types/          → TypeScript types
  __tests__/      → Test files (separate)
  pages/          → Page components (Next.js)
  app/            → App directory (Next.js 13+)
```

### Detection Process

1. List top-level directories in src/ (or project root)
2. Match against known patterns
3. Sample files to verify purpose
4. Report structure conventions

## Code Pattern Detection

### Import Patterns

Use Grep to find import patterns:

```
# Path aliases
pattern: from ['"]@/
pattern: from ['"]~/
pattern: from ['"]@components/

# Named vs default exports
pattern: import \{ .* \} from
pattern: import .* from
```

### Export Patterns

```
# Named exports
pattern: export (function|const|class|interface)

# Default exports
pattern: export default
```

### Comment Conventions

```
# JSDoc
pattern: \*\*@

# TODO/FIXME
pattern: (TODO|FIXME|HACK|XXX):

# Inline comments
pattern: // .*

# Block comments
pattern: /\*.*\*/
```

### Error Handling Patterns

```
# Try/catch
pattern: try\s*\{

# .catch()
pattern: \.catch\(

# throw
pattern: throw (new )?(Error|TypeError)
```

## Config Extraction

### ESLint (.eslintrc.json)

Extract rules that define conventions:
- indent (indentation)
- quotes (quote style)
- semi (semicolons)
- naming-convention (naming)

### Prettier (.prettierrc)

Extract formatting rules:
- tabWidth (indentation size)
- useTabs (tabs vs spaces)
- singleQuote (quote style)
- trailingComma (trailing commas)
- printWidth (line length)

### TypeScript (tsconfig.json)

Extract strictness:
- strict mode
- noImplicitAny
- strictNullChecks

### EditorConfig (.editorconfig)

Extract:
- indent_style
- indent_size
- end_of_line
- charset

## Output Template

After discovery, format findings as:

```markdown
# Discovered Conventions

## Tech Stack
[Language, framework, test framework, build tool]

## File Naming Patterns
| Type | Pattern | Examples |
|------|---------|----------|
| [type] | [pattern] | [examples] |

## Directory Structure
[Directory tree with purposes]

## Import/Export Patterns
[Import style, path aliases, export preferences]

## Existing Configs
[Linting, formatting, TypeScript configs]

## Suggested Rules
[Categorized list of rules based on findings]
```
