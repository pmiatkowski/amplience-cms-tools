# Feature Request: user-command-sets

## Description
I want to add new functionality that will allow me to build sets of commands so that I can build up multiple sets gathering mixtures of selected commands for different purposes so that I don't need to think what type of command I need to run before other commands.

I want to be able configure these sets. Give them name, add commands to them, via JSON file.
When I start application, apart form regular commands I will see also 'User sets'. When I enter this, I will see all sets that I have defined

## Created
2026-01-29

## Clarifications

### Round 1

#### Q1: When a user runs a command set containing multiple commands, how should the commands be executed?

User: C (Allow user to choose execution mode each time - prompt for "run all" vs "step-by-step" when executing a set)

#### Q2: Many commands in this CLI require user input during execution (e.g., selecting a hub, repository, filters). How should command sets handle these interactive prompts?

User: B and C (Support both modes - (B) interactive prompts per command AND (C) fully pre-defined sets with parameters in JSON)

#### Q3: Where should the command sets configuration file be stored and what should happen if it's missing?

User: C (Flexible location via environment variable with sensible default, create example file on first run). Clarified: New environment variable will provide path to JSON file.

#### Q4: What should happen when a command in a set fails (error, exception, or user cancels)?

User: C (Ask user what to do when a command fails - continue/stop/retry)

#### Q5: How should users create and manage command sets?

User: C (Hybrid approach - CLI commands for set management plus direct JSON editing capability)

#### Q6: How should command sets integrate with the existing CLI menu structure?

User: A (Add "User sets" as a top-level menu item alongside existing commands - enters submenu showing all defined sets)

#### Q7: What information should be displayed about each command set in the "User sets" menu?

User: B (Set name + description + command count)

#### Q8: Since you want both interactive and pre-configured parameter modes, what should the JSON structure look like for commands that need parameters?

User: B (Commands with optional parameters object - if params present, use them; otherwise prompt interactively)

### Round 2

#### Q1: When a user runs a command set containing multiple commands, how should the results be displayed for sets containing multiple commands?

User: B (Aggregate all results and show a summary at the end)

#### Q2: For command sets with multiple commands, should commands be executed sequentially (one after another) or is there any scenario where parallel execution would be useful?

User: A (Always sequential - each command completes before the next starts)

#### Q3: When a user defines a command set in JSON, how should the system handle invalid command references (e.g., command names that don't exist in the CLI)?

User: A (Fail fast on load - reject the entire JSON file and show specific errors)

#### Q4: The JSON structure includes optional parameters for commands. What should happen if a command requires a parameter (like a hub or repository selection) but the JSON doesn't provide it, and the set is being executed in "pre-configured mode" (where you don't want interactive prompts)?

User: A (Treat as configuration error - fail validation and show which parameters are missing)

#### Q5: If a user modifies the command sets JSON file while the application is running, should the changes be detected automatically or require a restart?

User: A (Require application restart)

#### Q6: What should happen if a user defines a command set with no commands in it (empty commands array)?

User: B (Allow empty sets but show "No commands" message when executed)
