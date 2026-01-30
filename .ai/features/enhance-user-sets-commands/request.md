# Feature Request: enhance-user-sets-commands

## Description

I want to enhance user-command-set. 1. I want to be able to explicitly pick which commands will be executed. There is an option where user is asked if commands should be executed in parallel or one by one. This is where I want to be able to choose option - pick commands to run. Then user will have a list of commands that he can select (multiple commands can be selected). 2. When env for command path exists but file does not exists instead of failing, ask if user would like to create an example command set json file. If so, simple file with two example commands one with parameters other without parameters will be created in new json file.

## Created

2026-01-30

## Clarifications

### Round 1

#### Q1: For the "pick commands" execution mode, when should the command selection appear in the workflow?

User: After selecting a command set, as a third option alongside "Run all" and "Step-by-step" (Option A)

#### Q2: After the user picks specific commands, should they then choose how to execute those selected commands?

User: Yes, prompt for "Run selected" vs "Step-by-step selected" - user can still choose sequential or confirmations for their filtered list (Option A)

#### Q3: For the command selection UI, how should the commands be displayed in the multi-select list?

User: Show command name + description from the JSON config (e.g., `sync-hierarchy - Sync content hierarchy structure`) (Option B)

#### Q4: For the example command set file creation (when env path exists but file doesn't), what should the example file contain?

User: Same example config as current `generateExampleConfig()` - two complete command sets with 2 commands each (Option A)

#### Q5: When the user declines to create the example file (after being prompted), what should happen?

User: Show a helpful message with instructions on how to create the file manually, then return to main menu (Option B)
