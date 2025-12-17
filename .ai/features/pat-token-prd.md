<scratchpad>
Great! Now I have all the clarifications I need. Let me create a comprehensive PRD based on the answers:

1. **PAT_TOKEN**: Single generic environment variable for all hubs
2. **Precedence**: PAT_TOKEN takes precedence when present
3. **Scope**: Both API service and dc-cli commands should use PAT
4. **Validation**: Simple truthy check (non-empty string), fail on first use
5. **Types**: Create new union type, keep existing HubConfig strict
6. **Documentation**: Update .env.example with both generic and per-hub examples
7. **Pattern**: Builder pattern for dc-cli execution to support future commands

Key technical decisions:

- Create `HubConfigWithPAT` union type
- Modify `app-config.ts` validation to check: (CLIENT_ID + CLIENT_SECRET) OR
  PAT_TOKEN
- Modify `AmplienceService._getAccessToken()` to skip OAuth flow when PAT exists
- Modify `AmplienceService._request()` to use PAT directly in Authorization
  header
- Create builder/utility for dc-cli command execution
- Update both dc-cli commands to use new builder
- Update .env.example

Architecture considerations:

- Keep backward compatibility
- Clear separation of concerns
- Reusable patterns for future commands
- Type safety with TypeScript </scratchpad>

# Product Requirements Document: PAT Token Authentication Support

## Feature Overview

Add support for Personal Access Token (PAT) authentication as an alternative to
OAuth Client Credentials flow. This feature will allow users to configure
authentication using Amplience PAT tokens, which is a generic token that works
across all hubs in the Amplience platform.

## Background

Currently, the application requires OAuth credentials (CLIENT_ID and
CLIENT_SECRET) for each hub. Amplience also supports Personal Access Tokens
(PAT) as an authentication method, which provides:

- Simplified configuration (single token instead of per-hub credentials)
- Better security in some scenarios
- Alternative authentication flow for users who prefer PAT

## Requirements

### 1. Environment Variable Configuration

**New Environment Variable:**

- `PAT_TOKEN` - Generic Personal Access Token that applies to all Amplience hubs

**Validation Rules:**

- PAT_TOKEN is optional
- When PAT_TOKEN is provided:
  - Must be truthy (non-empty string)
  - CLIENT_ID and CLIENT_SECRET become optional
- When PAT_TOKEN is NOT provided:
  - CLIENT_ID and CLIENT_SECRET remain required per hub
  - Existing validation logic applies
- Validation is simple string check (non-empty), no API validation at config
  load time

**Configuration Priority:**

- PAT_TOKEN always takes precedence when present
- If PAT_TOKEN exists, ignore CLIENT_ID/CLIENT_SECRET even if configured
- If PAT_TOKEN is not provided, fall back to CLIENT_ID/CLIENT_SECRET flow

### 2. Type System Updates

**New Type Definition:**

```typescript
type HubConfigWithPAT =
  | Amplience.HubConfig // Existing type with required clientId/clientSecret
  | {
      name: string;
      hubId: string;
      patToken: string;
      clientId?: never;
      clientSecret?: never;
    };
```

**Rationale:**

- Keeps existing `Amplience.HubConfig` type strict (no breaking changes)
- Union type provides type safety for both authentication methods
- Discriminated union prevents mixing both auth methods in types

### 3. Configuration Loading (`app-config.ts`)

**Modified Validation Logic:**

```
For each hub configuration:
1. Check if PAT_TOKEN environment variable exists and is truthy
2. If PAT_TOKEN exists:
   - Create config with: name, hubId, patToken
   - CLIENT_ID/CLIENT_SECRET are optional (ignored if present)
3. If PAT_TOKEN does not exist:
   - Require CLIENT_ID, CLIENT_SECRET, HUB_ID, HUB_NAME (existing logic)
   - Create config with existing structure
4. Validate that at least one complete authentication method exists
```

**Error Messages:**

- When PAT_TOKEN is empty string: "PAT_TOKEN is defined but empty. Please
  provide a valid token or remove the variable."
- When no auth method available: "No authentication configured. Please provide
  either PAT_TOKEN or CLIENT_ID/CLIENT_SECRET for each hub."

### 4. API Service Authentication (`amplience-service.ts`)

**Modified Constructor:**

- Accept `HubConfigWithPAT` instead of `Amplience.HubConfig`
- Detect authentication method from config structure

**Modified `_getAccessToken()` Method:**

```typescript
private async _getAccessToken(): Promise<void> {
  // If PAT token is available, skip OAuth flow
  if ('patToken' in this._hubConfig) {
    this._accessToken = this._hubConfig.patToken;
    this._tokenExpiry = Number.MAX_SAFE_INTEGER; // PAT tokens don't expire in our flow
    return;
  }

  // Existing OAuth flow for CLIENT_ID/CLIENT_SECRET
  // ... existing implementation
}
```

**Modified `_request()` Method:**

- No changes needed; already uses `this._accessToken` which now can be PAT
- Error handling on first use will catch invalid PAT tokens

**Error Handling:**

- Invalid/expired PAT: Let API call fail naturally, catch in `_request()`
- Show clear error message: "Authentication failed. Please check your PAT_TOKEN
  or use CLIENT_ID/CLIENT_SECRET."

### 5. DC-CLI Command Execution Pattern

**New Builder/Utility Pattern:**

Create `src/utils/dc-cli-executor.ts`:

```typescript
interface DcCliOptions {
  command: string;
  hubConfig: HubConfigWithPAT;
  additionalArgs?: string[];
}

class DcCliCommandBuilder {
  private command: string;
  private hubConfig: HubConfigWithPAT;
  private additionalArgs: string[] = [];

  constructor(command: string) {
    this.command = command;
  }

  withHub(config: HubConfigWithPAT): this {
    this.hubConfig = config;
    return this;
  }

  withArgs(...args: string[]): this {
    this.additionalArgs.push(...args);
    return this;
  }

  async execute(): Promise<{ stdout: string; stderr: string }> {
    const dcCliPath = getDcCliPath();

    // Build authentication parameters
    let authParams: string;
    if ('patToken' in this.hubConfig) {
      authParams = `--patToken "${this.hubConfig.patToken}"`;
    } else {
      authParams = `--clientId "${this.hubConfig.clientId}" --clientSecret "${this.hubConfig.clientSecret}"`;
    }

    // Build hub parameter
    const hubParam = `--hubId "${this.hubConfig.hubId}"`;

    // Combine all parameters
    const additionalArgsStr = this.additionalArgs.join(' ');
    const fullCommand =
      `"${dcCliPath}" ${this.command} ${authParams} ${hubParam} ${additionalArgsStr}`.trim();

    return await execAsync(fullCommand);
  }
}

// Factory function
export const createDcCliCommand = (command: string): DcCliCommandBuilder => {
  return new DcCliCommandBuilder(command);
};

// Utility functions
export const getDcCliPath = (): string => {
  const binPath = path.join(process.cwd(), 'node_modules', '.bin', 'dc-cli');
  if (process.platform === 'win32') {
    return binPath + '.cmd';
  }
  return binPath;
};

export const checkDcCliAvailability = async (): Promise<boolean> => {
  try {
    const dcCliPath = getDcCliPath();
    await execAsync(`"${dcCliPath}" --version`);
    return true;
  } catch {
    return false;
  }
};
```

**Benefits:**

- Builder pattern provides fluent API
- Centralizes authentication logic for dc-cli
- Easy to extend for future commands
- Clear separation of concerns
- Type-safe command construction

### 6. Update Existing DC-CLI Commands

**Files to Modify:**

- `copy-content-type-schemas.ts`
- `sync-content-type-properties.ts`

**Changes:**

1. Remove local `getDcCliPath()`, `checkDcCliAvailability()`, `runDcCli()`
   functions
2. Import from new utility:
   `import { createDcCliCommand, checkDcCliAvailability } from '~/utils/dc-cli-executor'`
3. Replace `runDcCli()` calls with builder pattern:

```typescript
// Old:
await runDcCli(`content-type list --json`, targetHub);

// New:
const result = await createDcCliCommand('content-type list --json')
  .withHub(targetHub)
  .execute();
```

4. Update type hints to use `HubConfigWithPAT` where needed

### 7. Documentation Updates

**Update .env.example:**

```bash
# ============================================================================
# AMPLIENCE AUTHENTICATION CONFIGURATION
# ============================================================================
# You can authenticate with Amplience using one of two methods:
#
# METHOD 1: Personal Access Token (PAT) - Recommended for simplicity
# - Single token works across all hubs
# - Generate PAT from Amplience hub settings
# - When PAT_TOKEN is set, CLIENT_ID and CLIENT_SECRET are optional
#
# METHOD 2: OAuth Client Credentials (Per-Hub)
# - Separate credentials per hub
# - Required when PAT_TOKEN is not provided
# - More granular access control
# ============================================================================

# Option 1: Use Personal Access Token (works for all hubs)
PAT_TOKEN=your-personal-access-token-here

# Option 2: Use OAuth Client Credentials (per hub)
# If PAT_TOKEN is set, these are ignored

# Hub 1 Configuration
AMP_HUB_HUB1_HUB_NAME=Production
AMP_HUB_HUB1_HUB_ID=your-hub-id
AMP_HUB_HUB1_CLIENT_ID=your-client-id
AMP_HUB_HUB1_CLIENT_SECRET=your-client-secret

# Hub 2 Configuration
AMP_HUB_HUB2_HUB_NAME=Staging
AMP_HUB_HUB2_HUB_ID=your-hub-id
AMP_HUB_HUB2_CLIENT_ID=your-client-id
AMP_HUB_HUB2_CLIENT_SECRET=your-client-secret

# Note: You only need to configure one authentication method.
# PAT_TOKEN takes precedence if both are configured.
```

**Update README.md:**

- Add section on authentication methods
- Explain PAT vs OAuth trade-offs
- Link to Amplience documentation for generating PAT tokens
- Show example configurations

## Technical Implementation Details

### Files to Create

1. `src/utils/dc-cli-executor.ts` - DC-CLI command builder utility
2. `src/types/hub-config.ts` - New type definitions (if not using global types)

### Files to Modify

1. app-config.ts - Configuration loading and validation
2. amplience-service.ts - Authentication flow
3. copy-content-type-schemas.ts - Use new builder
4. sync-content-type-properties.ts - Use new builder
5. .env.example - Documentation
6. README.md - Documentation

### Integration Points

**Existing Code Reuse:**

- `getHubConfigs()` pattern in `app-config.ts`
- Token management pattern in `amplience-service.ts`
- Error handling patterns from existing commands
- Progress bar utilities from `createProgressBar()`

**Backward Compatibility:**

- Existing .env files without PAT_TOKEN continue to work
- No breaking changes to API
- Existing type `Amplience.HubConfig` remains unchanged
- Commands work transparently with both auth methods

## Edge Cases & Scenarios

### Scenario 1: Mixed Environments

**Case:** Developer has PAT_TOKEN locally but CI/CD uses CLIENT_ID/SECRET
**Solution:** Each environment's .env is independent; both methods work

### Scenario 2: PAT Token Expires/Revoked

**Case:** User's PAT token becomes invalid mid-operation **Solution:** API call
fails with authentication error, clear message shown **Recovery:** User updates
PAT_TOKEN in .env and restarts

### Scenario 3: Empty PAT_TOKEN Variable

**Case:** `PAT_TOKEN=` (empty string in .env) **Solution:** Validation treats
empty string as "not provided", falls back to CLIENT_ID/SECRET validation
**Error:** If CLIENT_ID/SECRET also missing, show clear error message

### Scenario 4: Multiple Hubs with PAT

**Case:** User has 3 hubs configured, wants to use single PAT_TOKEN
**Solution:** Works automatically; single PAT applies to all hubs **Note:** PAT
must have permissions for all configured hubs

### Scenario 5: Future Command Development

**Case:** Developer adds new command that needs dc-cli **Solution:** Import and
use `createDcCliCommand()` builder, pattern is documented **Benefits:**
Automatic PAT/OAuth handling, no duplicate code

## Success Criteria

### Functional Requirements Met

- ✅ PAT_TOKEN environment variable supported
- ✅ Works for both API service and dc-cli commands
- ✅ Validation ensures at least one auth method exists
- ✅ PAT takes precedence over CLIENT_ID/SECRET
- ✅ Backward compatible with existing configurations
- ✅ Builder pattern for dc-cli extensibility

### Quality Requirements

- ✅ Type-safe implementation with discriminated unions
- ✅ Clear error messages for authentication failures
- ✅ No breaking changes to existing code
- ✅ Documentation updated (code comments, .env.example, README)
- ✅ DRY principle followed (no duplicate dc-cli logic)

### Testing Scenarios

1. PAT_TOKEN only (no CLIENT_ID/SECRET)
2. CLIENT_ID/SECRET only (no PAT_TOKEN)
3. Both configured (PAT takes precedence)
4. Neither configured (validation error)
5. Empty PAT_TOKEN with valid CLIENT_ID/SECRET
6. Invalid PAT_TOKEN (fails on first API call)
7. DC-CLI commands with PAT authentication
8. DC-CLI commands with OAuth authentication
9. Multiple hubs with single PAT_TOKEN
10. Existing commands continue to work

## Non-Goals / Out of Scope

- ❌ Per-hub PAT tokens (generic token only)
- ❌ Runtime PAT token validation during config load
- ❌ Automatic PAT token refresh/rotation
- ❌ Migration tool from OAuth to PAT
- ❌ UI for PAT token management
- ❌ PAT token encryption at rest
- ❌ Support for other authentication methods (API keys, etc.)

## Future Considerations

1. **PAT Token Management UI**: If users frequently need to rotate tokens
2. **Per-Hub PAT Tokens**: If Amplience changes to support hub-specific PATs
3. **Token Validation Utility**: Helper command to test authentication
4. **Environment-Specific Configs**: Better support for .env.local,
   .env.production patterns
5. **Audit Logging**: Track which authentication method was used for operations

---

**Document Version:** 1.0  
**Created:** December 17, 2025  
**Status:** Ready for Implementation  
**Estimated Complexity:** Medium (affects multiple layers but clear patterns)
