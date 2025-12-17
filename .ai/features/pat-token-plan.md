# PAT Token Authentication Support - Implementation Plan

## Overview

This plan outlines the implementation of Personal Access Token (PAT)
authentication support for the Amplience CMS Tools. The feature allows users to
authenticate using a single generic PAT token instead of per-hub OAuth
credentials. The implementation involves updating the configuration loading
logic, the core API service, and creating a new utility for `dc-cli` command
execution.

## Stage 1: Configuration and Type Definitions

### Objective

Implement the necessary type definitions and update the configuration loading
logic to support the `PAT_TOKEN` environment variable, ensuring it takes
precedence over OAuth credentials.

### Files to Create/Modify

- `src/types/hub-config.ts` - Create new type definitions for `HubConfig`.
- app-config.ts - Modify validation logic to accept `PAT_TOKEN`.
- app-config.test.ts - Create/Modify tests for configuration logic.

### Tasks

1.  **Create Tests for Existing Config Logic**
    - Check if app-config.test.ts exists. If not, create it.
    - Write tests to verify current behavior: requires Client ID/Secret,
      validates missing env vars.
2.  **Define Types**
    - Update `/types/amplience.d.ts.ts`.
    - Define `HubConfigCommon`, `HubOAuthConfig`, `HubPATConfig` and `HubConfig`
      as union type of `HubOAuthConfig | HubPATConfig`.
3.  **Implement PAT Logic in Config**
    - Update app-config.ts to read `process.env.PAT_TOKEN`.
    - Modify validation logic:
      - If `PAT_TOKEN` is present, skip Client ID/Secret validation.
      - If `PAT_TOKEN` is missing, enforce existing validation.
      - Ensure `HubConfig` objects returned include the `patToken` property when
        applicable.
4.  **Update Tests**
    - Add test cases for:
      - `PAT_TOKEN` provided (valid).
      - `PAT_TOKEN` provided, Client ID/Secret missing (valid).
      - `PAT_TOKEN` provided, Client ID/Secret present (PAT takes precedence).
      - No auth provided (invalid).
      - Empty `PAT_TOKEN` (invalid).

### Tests Required

- `should load config successfully when PAT_TOKEN is provided`
- `should fail validation when no authentication method is provided`
- `should prioritize PAT_TOKEN over Client ID/Secret`
- `should return HubConfig with patToken property when configured`

## Stage 2: API Service Authentication Update

### Objective

Update the `AmplienceService` to handle the new configuration type and bypass
the OAuth flow when a PAT token is present.

### Files to Create/Modify

- amplience-service.ts - Modify authentication flow.
- amplience-service.test.ts - Update tests for PAT auth.

### Tasks

1.  **Verify Existing Tests**
    - Ensure amplience-service.test.ts passes.
2.  **Update Service Constructor**
    - Modify `AmplienceService` constructor to accept `HubConfig`.
3.  **Implement PAT Auth Flow**
    - Modify `_getAccessToken()` method.
    - Add check: if `patToken` exists in config, set `this._accessToken`
      directly and return.
    - Ensure OAuth flow is skipped.
    - Set `_tokenExpiry` to max integer (PATs don't expire in this context).
4.  **Update Tests**
    - Create a test suite for PAT authentication in `amplience-service.test.ts`.
    - Mock `HubConfig` with `patToken`.
    - Verify `_getAccessToken` does _not_ call OAuth service.
    - Verify `_accessToken` is set correctly.

### Tests Required

- `should use PAT token directly when provided in config`
- `should skip OAuth authentication flow when PAT is present`
- `should fall back to OAuth flow when PAT is not present`

## Stage 3: DC-CLI Executor and Command Refactoring

### Objective

Create a reusable builder pattern for `dc-cli` execution that handles both
authentication methods, and refactor existing commands to use it.

### Files to Create/Modify

- `src/utils/dc-cli-executor.ts` - Create new utility.
- `src/utils/dc-cli-executor.test.ts` - Create tests for utility.
- copy-content-type-schemas.ts - Refactor to use executor.
- sync-content-type-properties.ts - Refactor to use executor.
- .env.example - Update documentation.
- README.md - Update documentation.

### Tasks

1.  **Implement DC-CLI Executor**
    - Create `src/utils/dc-cli-executor.ts`.
    - Implement `DcCliCommandBuilder` class with `withHub`, `withArgs`, and
      `execute` methods.
    - Implement logic to choose `--patToken` vs `--clientId/--clientSecret`
      based on config.
    - Implement `getDcCliPath` and `checkDcCliAvailability`.
2.  **Test DC-CLI Executor**
    - Create `src/utils/dc-cli-executor.test.ts`.
    - Test command string generation for both PAT and OAuth configs.
    - Mock `execAsync` to verify command execution.
3.  **Refactor Copy Content Type Schemas**
    - Modify copy-content-type-schemas.ts.
    - Remove local `runDcCli` and helper functions.
    - Import and use `createDcCliCommand`.
    - Update tests in copy-content-type-schemas.test.ts.
4.  **Refactor Sync Content Type Properties**
    - Modify sync-content-type-properties.ts.
    - Remove local `runDcCli` and helper functions.
    - Import and use `createDcCliCommand`.
    - Update tests in
      `src/commands/sync-content-type-properties/sync-content-type-properties.test.ts`.
5.  **Update Documentation**
    - Update .env.example with PAT configuration examples.
    - Update README.md with Authentication section.

### Tests Required

- `DcCliCommandBuilder`: `should generate correct command string with PAT`
- `DcCliCommandBuilder`:
  `should generate correct command string with Client Credentials`
- `copy-content-type-schemas`: Verify command execution uses new executor (via
  mocks).
- `sync-content-type-properties`: Verify command execution uses new executor
  (via mocks).

## Stage 4: Quality Assurance & Validation

### Objective

Ensure code quality, type safety, and test coverage.

### Tasks

1.  **Linting**
    - Run `npm run lint --fix`
    - Fix all errors and warnings without using eslint-disable comments
2.  **Type Checking**
    - Run `npm run type-check`
    - Resolve all TypeScript errors, especially around the new `HubConfig` union
      type.
3.  **Testing**
    - Run `npm run test`
    - Fix all failing tests
    - Ensure 100% test pass rate
4.  **Documentation Verification**
    - Use context7 tool to check against latest docs (if applicable) or verify
      README.md matches implementation.
    - Verify .env.example is accurate.
5.  **Final Validation**
    - Confirm all commands pass without errors.
    - Verify feature works as specified in PRD:
      - Test with PAT only.
      - Test with OAuth only.
      - Test with both (PAT precedence).

## Summary

This plan delivers PAT token support by first establishing the configuration and
type foundation, then updating the core service logic, and finally standardizing
external CLI execution. This approach ensures backward compatibility while
introducing a more flexible authentication mechanism.
