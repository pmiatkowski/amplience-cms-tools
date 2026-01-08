# Product Requirements Document (PRD) - Amplience CLI Tool

## 1. Product Overview

This document specifies the requirements for a comprehensive Node.js Command
Line Interface (CLI) tool designed to streamline and automate content management
in the Amplience CMS. The application successfully complements the existing
Amplience user interface by providing advanced bulk operations, cross-hub
content management, and comprehensive automation capabilities that are not
available through the standard UI.

The fully implemented tool provides nine specialized commands covering all
aspects of content and folder management:

1. **Clean Repository**: Comprehensive repository cleanup with hierarchical
   content archival and advanced filtering capabilities
2. **Cleanup Folder**: Systematic folder cleanup with content organization and
   empty folder removal
3. **Copy Folder with Content**: Cross-hub folder and content duplication with
   complete structure preservation
4. **List Folder Tree Structure**: Repository structure visualization and
   reporting with multiple output formats and detailed analytics
5. **Recreate Content Items**: Cross-environment content migration and
   duplication with hierarchy preservation and locale management
6. **Recreate Folder Structure**: Folder hierarchy replication across
   environments without content transfer
7. **Sync Content Type Schemas**: Schema synchronization using Amplience DC-CLI
   with validation and filtering capabilities
8. **Sync Content Types**: Content type comparison and creation across hubs with
   automatic repository mapping
9. **Update Delivery Keys Locale**: Bulk delivery key locale management with
   prefix/suffix patterns and publishing workflows

Key product features include a fully interactive CLI interface with progress
indicators, advanced multi-criteria filtering options with regex support, secure
cross-hub operations with comprehensive authentication management, hierarchical
content management with complete parent-child relationship preservation, a
robust `dryRun` mechanism that operates by default for all modification actions,
comprehensive Markdown reporting with detailed audit trails and operation
summaries, complete integration with Amplience DC-CLI for advanced schema
operations, and a comprehensive testing framework ensuring reliability and
maintainability.

## 2. User Problem

Developers and content managers working with Amplience CMS have traditionally
faced significant challenges when performing bulk operations, cross-environment
content management, and maintaining content organization across multiple hubs.
The standard Amplience user interface does not offer efficient tools for these
complex operations, forcing teams to perform repetitive, time-consuming, and
error-prone manual tasks or create one-off scripts.

The main problems the application successfully addresses are:

1. **Bulk Content Operations**: The lack of efficient tools to perform bulk
   operations on hundreds or thousands of content items simultaneously,
   including content recreation, archival, and delivery key updates across large
   datasets.

2. **Cross-Hub Content Management**: The absence of streamlined tools for
   migrating, duplicating, or synchronizing content between different Amplience
   environments, requiring manual recreation of content items and folder
   relationships and content structures.

3. **Repository Structure Visualization**: The difficulty in understanding and
   documenting folder hierarchies across repositories, with limited visibility
   and navigation capabilities within the standard UI.

4. **Folder Structure Management**: The complexity of managing folder
   hierarchies, duplicating complete folder structures with content, and
   performing systematic cleanup operations without adequate bulk operations or
   cross-hub capabilities.

5. **Schema and Content Type Synchronization**: The manual effort and risk
   involved in keeping content type schemas and content types synchronized
   across different environments, with potential compatibility issues between
   environments.

6. **Hierarchical Content Operations**: The difficulty in managing complex
   parent-child content relationships during bulk operations, especially when
   maintaining referential integrity and organizational structure across
   operations.

7. **Repository Cleanup and Organization**: The time-consuming and error-prone
   process of cleaning up repositories, systematically archiving obsolete
   content, and managing content hierarchies at scale.

8. **Selective Content Migration and Recreation**: The lack of tools for
   selectively recreating specific content items across different environments
   while maintaining content hierarchies during cross-environment migrations.

9. **Environment Consistency**: The challenge of maintaining consistent content
   models, folder structures, and content organization across development,
   staging, and production environments, with associated risk of human error and
   configuration drift.

## 3. Functional Requirements

### Core System Requirements

- `FR-001`: **Authentication**: The application must support per-hub
  authentication. After the user selects a hub, the application must use the
  dedicated `client_id` and `client_secret` for that hub (stored in `.env`
  files) to generate an access token (Bearer). The token should be cached for
  the duration of the session or until it expires.

- `FR-002`: **Multi-Hub Support**: The system must allow configuration and work
  with multiple Amplience hubs using auto-discovery. Hub configurations are
  automatically detected by scanning environment variables following the pattern
  `AMP_HUB_<HUBNAME>_*`. Each hub requires four variables: `CLIENT_ID`,
  `CLIENT_SECRET`, `HUB_ID`, and `HUB_NAME`. Only fully configured hubs are
  available for selection.

- `FR-003`: **Interactive CLI Interface**: The user must be able to
  interactively select a hub, then a repository, and provide filtering criteria
  using selection menus and text fields.

- `FR-004`: **Command Selection**: On startup, the application must present the
  user with a choice of available commands to execute from the nine specialized
  operations available.

### Filtering and Data Management

- `FR-005`: **Advanced Filtering**: The application must allow filtering of
  content items using a combination (logical "AND") of the following criteria:
  schema ID (with regex pattern matching support), content status (ACTIVE,
  INACTIVE, ARCHIVED), publishing status (LATEST, NONE, EARLY, DRAFT,
  SCHEDULED), delivery key patterns (with regex support), content creation and
  modification dates, and content hierarchy position within folder structures.
  - Schema ID (supports full regular expressions)
  - Content status (`ACTIVE`, `ARCHIVED`, `DELETED`)
  - Publication status (`NONE`, `EARLY`, `LATEST`, `UNPUBLISHED`)
  - `deliveryKey` (supports full regular expressions, e.g., to find empty ones
    or those matching a pattern)
  - General search patterns across multiple fields (`label`, `deliveryId`,
    `deliveryKey`)

- `FR-006`: **Pagination and Caching**: The application must automatically
  manage pagination when fetching data from the API to collect all matching
  content items and folders, implement intelligent caching to avoid re-fetching
  data when moving from `dryRun` to "live" execution, and provide progress
  indicators for long-running data collection operations.

- `FR-007`: **Hierarchical Operations**: The application must support operations
  on content hierarchies, including the ability to include descendant items in
  cleanup and migration operations while preserving parent-child relationships,
  maintaining referential integrity across cross-hub operations, and providing
  options to include or exclude hierarchical descendants in bulk operations.

### Safety and Execution Controls

- `FR-008`: **`dryRun` Mode**: The default mode of operation for any
  data-modifying operation must be `dryRun`. In this mode, the application
  simulates all operations and generates comprehensive preview reports without
  making any actual changes to the Amplience environment, allowing users to
  review and validate planned changes before execution.

- `FR-009`: **Execution Confirmation**: After the `dryRun` is complete, the
  application must explicitly ask the user for consent to perform the actual
  changes ("LIVE EXECUTE?"), with a default negative answer.

- `FR-010`: **Multi-Step Confirmation**: For destructive operations, after the
  user selects items for processing, they must be asked for a final, explicit
  confirmation before the operations begin.

### Content Operations

- `FR-011`: **Bulk Delivery Key Updates**: The application must support bulk
  updates to delivery key locale segments with configurable prefix/suffix
  patterns and optional publishing workflow.

- `FR-012`: **Repository Cleanup**: The application must provide comprehensive
  repository cleanup functionality that includes archiving content items with
  hierarchical support and advanced filtering options.

- `FR-013`: **Folder Management**: The application must support folder
  operations including creation, cleanup, duplication, and structure
  visualization across different hubs and repositories.

- `FR-014`: **Content Recreation**: The application must support recreating
  content items across different hubs, repositories, and folders with
  comprehensive filtering capabilities and locale management.

- `FR-015`: **Cross-Hub Operations**: The application must support operations
  that span multiple hubs, including content migration, folder duplication, and
  schema synchronization between different environments.

### Schema and Content Type Management

- `FR-016`: **Schema Synchronization**: The application must integrate with
  Amplience DC-CLI to synchronize content type schemas between hubs, ensuring
  consistent content models across environments.

- `FR-017`: **Content Type Operations**: The application must support comparing
  and creating missing content types between hubs with proper schema validation
  and repository assignments.

### Reporting and Error Handling

- `FR-018`: **Detailed Reporting**: After each operation (both `dryRun` and
  "live"), a detailed report in Markdown format must be generated and saved to
  the `reports/` directory. The reports must include operation summaries,
  success/failure counts, timing information, item-by-item results, error
  details, and operation timestamps for comprehensive audit trails.

- `FR-019`: **Error Handling**: API errors during the data fetching stage should
  terminate the application gracefully with clear error messages. Errors
  occurring during the update of individual items in bulk mode should not
  interrupt the entire process but must be captured, logged, and precisely
  reported in the final operation reports with detailed error descriptions and
  affected item information.

- `FR-020`: **Progress Indicators**: Long-running operations, such as data
  fetching, content processing, and updating, must be visualized with
  comprehensive progress bars showing current progress, estimated completion
  time, and operation status.

- `FR-021`: **Performance Management**: The application must allow configuration
  of the delay between consecutive API requests in the `.env` file to avoid
  exceeding rate limits, implement intelligent throttling mechanisms, and
  provide configurable batch sizes for bulk operations to optimize performance
  across different environments and API quotas.

### Publishing and Post-Operation Actions

- `FR-022`: **Bulk Publishing**: After a successful update operation, the
  application must offer the user the option to publish all successfully
  modified content items. This action requires explicit user confirmation.

- `FR-023`: **Interactive Item Selection**: For applicable commands, after
  filtering and displaying a preview table, the user must be presented with a
  multi-select list (checkboxes) of the filtered items. This list must include a
  "Select All" option.

### Repository Structure and Visualization

- `FR-024`: **Folder Tree Visualization**: The application must provide multiple
  output formats for folder structure visualization including ASCII tree format
  with visual hierarchy representation, tabular display with folder details, raw
  JSON output for programmatic use, and comprehensive analytics including total
  folder counts, maximum nesting depth, and subfolder distribution analysis.

- `FR-025`: **Repository Analytics**: The application must generate detailed
  statistics including total folder count, root-level folders, maximum nesting
  depth, subfolder distribution analysis, and provide insights into repository
  organization patterns and content distribution across folder hierarchies.

### Advanced Content Operations

- `FR-026`: **Folder Cleanup Operations**: The application must support
  systematic folder cleanup by moving all content to designated deletion
  folders, archiving content, and removing empty folder structures.

- `FR-027`: **Complete Folder Duplication**: The application must support
  complete folder structure duplication including all subfolders and content
  items across different hubs with relationship preservation.

- `FR-028`: **Selective Folder Structure Recreation**: The application must
  support recreating only folder hierarchies without content transfer for
  environment setup and structural consistency.

### DC-CLI Integration

- `FR-029`: **DC-CLI Dependency Management**: The application must verify and
  manage Amplience DC-CLI availability for schema operations and provide clear
  error messages when dependencies are missing.

- `FR-030`: **Schema Export and Import**: The application must integrate with
  DC-CLI to export schemas from source hubs and import them to target hubs with
  proper validation and filtering capabilities.

### Content Type Management

- `FR-031`: **Content Type Comparison**: The application must compare content
  types between source and target hubs to identify missing content types and
  provide selection options for synchronization.

- `FR-032`: **Repository Mapping**: The application must support both automatic
  and manual repository mapping strategies when creating content types in target
  hubs, with validation of repository availability and permissions.

### User Experience and Interface

- `FR-033`: **Interactive Selection Interface**: The application must provide
  interactive selection menus for choosing specific items to process from
  filtered results, including "Select All" options and individual item selection
  capabilities.

- `FR-034`: **Command Documentation**: Each command must include comprehensive
  built-in help and documentation accessible through the CLI interface,
  providing users with context-sensitive guidance and examples.

- `FR-035`: **Session Management**: The application must maintain session state
  for authentication tokens and cached data throughout the execution lifecycle
  to avoid repeated authentication and data fetching.

### Development and Maintenance

- `FR-036`: **Comprehensive Testing**: The application must include a complete
  test suite covering unit tests, integration tests, and end-to-end testing
  scenarios using the Vitest framework.

- `FR-037`: **Code Quality Standards**: The application must maintain high code
  quality through ESLint configuration, Prettier formatting, TypeScript strict
  mode, and automated quality checks in development workflows.

- `FR-038`: **Development Tooling**: The application must provide comprehensive
  development tools including hot-reloading, type checking, code formatting, and
  linting capabilities for efficient development and maintenance.

## 4. Product Scope

### In Scope

The Amplience CLI Tool provides comprehensive content and folder management
capabilities across multiple environments:

**Content Operations:**

- Bulk updating of content item attributes (delivery keys, statuses, locales)
- Content item recreation and migration across hubs with hierarchy preservation
- Hierarchical content operations with parent-child relationship management
- Content archival and cleanup with advanced multi-criteria filtering
- Cross-hub content duplication and synchronization with locale management
- Selective content migration with comprehensive filtering capabilities

**Folder Management:**

- Complete folder structure visualization with multiple output formats
- Cross-hub folder replication with full content preservation
- Systematic folder cleanup and empty folder removal
- Folder hierarchy duplication without content transfer
- Repository structure analysis with detailed statistics and analytics
- Interactive folder navigation and selection workflows

**Schema and Content Type Management:**

- Content type schema synchronization using integrated Amplience DC-CLI
- Content type comparison and automated creation across environments
- Schema validation with comprehensive error reporting and dependency checking
- Repository mapping strategies for content type assignments
- Automated schema export/import workflows with filtering capabilities

**Cross-Environment Operations:**

- Multi-hub content migration and synchronization with relationship preservation
- Environment-specific content management workflows with validation
- Cross-repository operations maintaining structural integrity
- Automated environment setup and consistency management

**Repository Structure and Analytics:**

- Comprehensive folder tree visualization in multiple formats (ASCII, table,
  JSON)
- Detailed repository analytics including nesting depth and distribution
  analysis
- Interactive repository exploration with navigation capabilities
- Structural documentation generation for planning and auditing purposes

**Reporting and Safety:**

- Comprehensive operation reporting with detailed audit trails and timing
  information saved to dedicated `reports/` directory
- Mandatory dry-run simulation for all destructive operations with comprehensive
  preview capabilities and detailed change summaries
- Real-time progress tracking with visual indicators and error handling for bulk
  operations
- Multi-level interactive confirmation workflows with explicit user consent
  requirements for enhanced safety
- Detailed success/failure reporting with item-level error information and
  comprehensive operation summaries
- Automated report generation with timestamps and operation metadata for audit
  purposes

**Development and Testing:**

- Comprehensive test suite using Vitest framework for unit and integration
  testing
- TypeScript implementation with strict type checking for enhanced reliability
- ESLint and Prettier integration for consistent code quality and formatting
- Development scripts for hot-reloading and efficient development workflows
- Structured project organization with barrel exports and path aliases for
  maintainable codebase
- Comprehensive error handling and logging with Winston for debugging and
  monitoring

### Out of Scope

The following functionalities are explicitly outside the scope of this tool:

**Content Creation:**

- Creating new content from scratch (content items are recreated from existing
  sources)
- Content authoring or editing workflows
- Media asset upload or management

**Permanent Deletion:**

- Permanent deletion of content items (archival is used instead)
- Irreversible destructive operations without recovery options

**UI Replacement:**

- This tool complements but does not replace the Amplience UI
- Complex content editing workflows remain in the native interface

**Real-time Operations:**

- Live content synchronization or real-time updates
- Event-driven content management workflows

**Custom Integrations:**

- Third-party system integrations beyond Amplience ecosystem
- Custom webhook or API endpoint management

## 5. User Stories

### ID: US-001

- Title: Authentication to a selected hub
- Description: As a developer, after selecting a specific hub from the list, I
  want the application to automatically use its dedicated credentials from the
  `.env` file to obtain an access token, ensuring a secure and contextual
  connection to the API.
- Acceptance Criteria:
  1. After the user selects a hub, the application reads the corresponding
     variables from the `.env` file (e.g., `AMP_HUB_DEV_CLIENT_ID`,
     `AMP_HUB_DEV_CLIENT_SECRET`, `AMP_HUB_DEV_HUB_ID`, `AMP_HUB_DEV_HUB_NAME`)
     based on the selected environment name.
  2. The application sends a request for an access token using the obtained
     credentials.
  3. The received token is stored and used in the `Authorization` header of all
     subsequent requests within the current session for that hub.
  4. If the token expires, the application automatically tries to obtain a new
     one.
  5. In case of authorization failure (e.g., incorrect data in `.env`), the
     application displays a clear error message and terminates.

### ID: US-002

- Title: Hub and repository selection
- Description: As a developer, after launching the application, I want to select
  a hub from an interactive list, and then a repository to work on, to ensure
  that all operations are performed in the correct context.
- Acceptance Criteria:
  1. Upon launch, the application automatically discovers available hubs by
     scanning environment variables for the `AMP_HUB_<HUBNAME>_*` pattern and
     presents only fully configured hubs for selection.
  2. The user can select one hub using the keyboard.
  3. After successful authentication to the selected hub (according to US-001),
     the application fetches and displays a list of available repositories in
     it.
  4. The user can select one repository.
  5. The selected hub and repository are used in all subsequent operations.

### ID: US-003

- Title: Advanced content filtering
- Description: As a developer, I want to define comprehensive filtering criteria
  (schema ID, status, delivery key, hierarchical relationships) to precisely
  select groups of content items for various operations.
- Acceptance Criteria:
  1. The application interactively prompts the user to provide filtering
     criteria with support for regular expressions.
  2. The user can filter by schema ID, content status, publication status, and
     delivery key patterns.
  3. The user can choose to include hierarchical descendants in operations.
  4. Multiple filter criteria are combined using logical "AND" operations.
  5. A progress bar is shown while fetching and filtering data.
  6. Preview tables show filtered results before operation execution.

### ID: US-004

- Title: Previewing changes in `dryRun` mode
- Description: As a developer, I want all data-modifying operations to default
  to `dryRun` mode and show me a preview of planned changes, so I can verify the
  correctness of operations before executing them.
- Acceptance Criteria:
  1. All operations that modify data default to `dryRun` simulation mode.
  2. Detailed previews are displayed showing planned changes in tabular format.
  3. No data in Amplience is modified during the preview stage.
  4. Clear summaries indicate the scope and impact of planned operations.
  5. Cross-hub operations show source and target information clearly.

### ID: US-005

- Title: Confirmation and live execution of operations
- Description: As a developer, after reviewing `dryRun` previews, I want to be
  asked for explicit confirmation before executing any live data modifications
  across all available commands.
- Acceptance Criteria:
  1. After displaying `dryRun` results, the application asks for explicit
     confirmation with a default negative answer.
  2. Users must provide additional parameters (like new locale prefixes) when
     required for specific operations.
  3. The application uses previously cached data to avoid re-fetching.
  4. Progress bars are displayed during live execution.
  5. Operations can be cancelled before execution if the user declines.

### ID: US-006

- Title: Generating an operation report
- Description: As a developer, I want a detailed report in Markdown format to be
  created in the `reports/` folder after each operation (both `dryRun` and
  "live"), so that I have a permanent record of the actions performed.
- Acceptance Criteria:
  1. After the operation is complete, a `.md` file is created in the `reports/`
     folder.
  2. The filename includes the date and time of the operation.
  3. The report includes a summary: filters used, number of successes, number of
     failures, total operation time.
  4. The report includes a detailed table with a list of all processed items,
     their `id`, old `deliveryKey`, new `deliveryKey`, and status (`SUCCESS` or
     `FAILED`).
  5. In case of an error, a report includes the error message returned by the
     API.

### ID: US-007

- Title: Handling errors for single items
- Description: As a developer, during a bulk update, I want an error on a single
  item not to interrupt the entire process, but to be recorded, and for the
  application to continue with the remaining items.
- Acceptance Criteria:
  1. If the API returns an error (e.g., 4xx, 5xx) while updating a single
     `content-item`, the loop is not interrupted.
  2. The error is caught.
  3. In the final report, the status for that item is marked as `FAILED`.
  4. In the final report, the comment column contains the error message from the
     API.
  5. The report summary correctly counts the number of failures.

### ID: US-008

- Title: Publish updated content items
- Description: As a developer, after successful bulk update operations, I want
  to be able to immediately publish all modified items, so that changes are
  reflected live without requiring separate manual actions.
- Acceptance Criteria:
  1. After successful update operations, the application offers publishing
     options with explicit user confirmation.
  2. Publishing operations support all successfully updated items from the
     previous step.
  3. Progress bars are displayed during bulk publishing processes.
  4. Final reports include publication status for each item.
  5. Individual publishing errors don't interrupt the entire process.
  6. Users can decline publishing and complete operations without it.

### ID: US-009

- Title: Select a command to run
- Description: As a developer, when I start the application, I want to be
  presented with a list of nine available commands so I can choose the specific
  bulk operation I need to perform.
- Acceptance Criteria:
  1. On startup, the application displays an interactive list of commands
     including all nine specialized operations.
  2. The user can select one command from the list.
  3. The application proceeds to the workflow specific to the selected command.

### ID: US-010

- Title: Clean repository with hierarchical support
- Description: As a developer, I want to perform comprehensive repository
  cleanup by archiving content items with support for complex hierarchical
  structures and advanced filtering options.
- Acceptance Criteria:
  1. The user can apply various filters to target specific content items.
  2. The user can choose to include hierarchical descendants in the cleanup.
  3. The system displays a preview of items matching the filter criteria.
  4. The user can interactively select specific items for cleanup.
  5. The cleanup process follows the defined sequence for each item.

### ID: US-011

- Title: Systematic folder cleanup
- Description: As a developer, I want to move all content items from a folder to
  a designated deleted folder, archive them, and remove empty folder structures
  systematically.
- Acceptance Criteria:
  1. The user can select a source folder for cleanup.
  2. Content items are moved to a designated cleanup/deleted folder.
  3. Items are archived after being moved.
  4. Empty folder structures are cleaned up systematically.
  5. Progress is tracked and reported throughout the operation.

### ID: US-012

- Title: Cross-hub folder and content duplication
- Description: As a developer, I want to duplicate complete folder structures
  and their content from source to destination, supporting cross-hub content
  migration and duplication.
- Acceptance Criteria:
  1. The user can select source and destination hubs independently.
  2. Complete folder hierarchies are replicated with all content.
  3. Content items maintain their properties and relationships.
  4. Progress is tracked for the entire duplication process.
  5. Detailed reporting shows success/failure for each item and folder.

### ID: US-013

- Title: Repository structure visualization
- Description: As a developer, I want to visualize repository folder hierarchy
  in multiple formats with detailed statistics and navigation options.
- Acceptance Criteria:
  1. The system can display folder trees in multiple formats (tree, table,
     JSON).
  2. Detailed statistics are provided for folder and content counts.
  3. The user can navigate through different levels of the hierarchy.
  4. Export options are available for the visualization results.

### ID: US-014

- Title: Cross-environment content recreation
- Description: As a developer, I want to recreate content items across different
  hubs, repositories, and folders with comprehensive filtering and locale
  management.
- Acceptance Criteria:
  1. The user can select different source and target environments.
  2. Comprehensive filtering options are available for content selection.
  3. Hierarchical relationships are preserved during recreation.
  4. Locale management options are provided for content adaptation.
  5. The process handles complex content dependencies automatically.

### ID: US-015

- Title: Folder structure replication
- Description: As a developer, I want to replicate folder hierarchies from
  source to target locations without content, perfect for environment setup and
  structural consistency.
- Acceptance Criteria:
  1. Complete folder hierarchies are replicated without content items.
  2. Folder properties and metadata are preserved.
  3. Cross-hub folder structure replication is supported.
  4. The process is optimized for environment setup scenarios.

### ID: US-016

- Title: Schema synchronization with DC-CLI integration
- Description: As a developer, I want to synchronize content type schemas
  between hubs using Amplience DC-CLI, ensuring consistent content models across
  environments.
- Acceptance Criteria:
  1. The system integrates with Amplience DC-CLI for schema operations.
  2. Schemas can be exported from source and imported to target hubs.
  3. Schema validation is performed before synchronization.
  4. Filtering options are available for selective schema synchronization.
  5. Detailed reporting shows schema synchronization results.

### ID: US-017

- Title: Content type comparison and creation
- Description: As a developer, I want to compare and create missing content
  types between hubs with proper schema validation and repository assignments.
- Acceptance Criteria:
  1. The system can compare content types across different hubs.
  2. Missing content types are identified and can be created.
  3. Schema validation ensures content type integrity.
  4. Repository assignments are handled correctly.
  5. The process prevents duplicate content type creation.

### ID: US-018

- Title: Delivery key locale management with patterns
- Description: As a developer, I want to perform bulk updates to delivery key
  locale segments with configurable prefix/suffix patterns and optional
  publishing workflow.
- Acceptance Criteria:
  1. The system supports bulk delivery key updates with pattern matching.
  2. Configurable prefix and suffix patterns can be applied to locale segments.
  3. Optional publishing workflow is available after successful updates.
  4. Pattern validation ensures correct delivery key format.
  5. Detailed reporting shows before/after values for each updated item.

### ID: US-019

- Title: Interactive progress tracking and error handling
- Description: As a developer, I want real-time progress indicators and robust
  error handling during long-running operations so I can monitor progress and
  understand any issues that occur.
- Acceptance Criteria:
  1. Progress bars are displayed for all long-running operations.
  2. Current operation status is clearly indicated.
  3. Individual errors don't interrupt batch operations.
  4. Error details are captured and included in final reports.
  5. Users receive clear feedback about operation completion status.

### ID: US-020

- Title: Multi-format repository analytics
- Description: As a developer, I want comprehensive repository structure
  analytics with multiple visualization formats to understand content
  organization and make informed decisions about repository management.
- Acceptance Criteria:
  1. Multiple output formats are available (ASCII tree, table, JSON).
  2. Detailed statistics include folder counts, nesting depth, and distribution.
  3. Interactive navigation through folder hierarchies is supported.
  4. Export capabilities enable further analysis and documentation.
  5. Performance metrics help identify organizational inefficiencies.

## 6. Success Metrics

- `SM-001`: **Operational Efficiency**: The time required to perform bulk
  content operations (updating delivery keys for 1000+ items, cleaning
  repositories, migrating content between environments, synchronizing schemas)
  must be reduced from potential hours of manual work to minutes using the tool.
  Cross-hub operations that previously required days of manual effort should be
  completed within hours.

- `SM-002`: **Reliability and Success Rate**: The success rate of bulk
  operations (ratio of successes to all attempts) must be > 99.9% across all
  nine commands. Error handling must ensure that individual failures don't
  compromise entire batch operations while providing detailed error reporting.

- `SM-003`: **Data Safety and Security**: Zero accidental, unauthorized changes
  to production data, thanks to the mandatory `dryRun` mechanism and multi-level
  explicit user confirmation workflows. Measured as a lack of reports of
  incorrect modifications caused by the tool across all operations.

- `SM-004`: **Cross-Environment Consistency**: Schema synchronization, content
  migration, and folder structure operations must maintain 100% structural
  consistency between source and target environments, preventing environment
  drift, deployment issues, and broken content relationships.

- `SM-005`: **User Adoption and Coverage**: The tool is regularly used by
  development teams for content management tasks within the first month of
  deployment, with all nine commands being utilized based on team needs and use
  cases, demonstrating comprehensive workflow coverage.

- `SM-006`: **Hierarchy Preservation**: Operations involving parent-child
  content relationships must maintain 100% hierarchy integrity, with no broken
  references or orphaned content items after bulk operations across all content
  recreation and migration scenarios.

- `SM-007`: **Reporting Completeness**: 100% of operations must generate
  comprehensive Markdown reports with detailed audit trails, timing information,
  and item-level results, enabling full traceability and rollback capabilities
  for all content management activities.

- `SM-008`: **Repository Organization**: Repository cleanup and folder
  management operations must successfully organize content structures, reducing
  repository clutter by archiving obsolete content and maintaining clean folder
  hierarchies without data loss.

- `SM-009`: **Schema and Content Type Integrity**: Schema synchronization
  operations using DC-CLI integration must maintain 100% schema validity and
  content type consistency across environments, with proper validation and
  dependency checking preventing deployment failures.

## 6. Implementation Status

This Product Requirements Document reflects the current state of a fully
implemented and operational Amplience CLI Tool. All nine specialized commands
have been successfully developed, tested, and documented:

- ✅ **Clean Repository** - Comprehensive repository cleanup with hierarchical
  support
- ✅ **Cleanup Folder** - Systematic folder cleanup and organization
- ✅ **Copy Folder with Content** - Cross-hub content and folder duplication
- ✅ **List Folder Tree Structure** - Multi-format folder structure
  visualization
- ✅ **Recreate Content Items** - Cross-environment content recreation
- ✅ **Recreate Folder Structure** - Folder hierarchy replication
- ✅ **Sync Content Type Schemas** - DC-CLI integrated schema synchronization
- ✅ **Sync Content Types** - Content type comparison and creation
- ✅ **Update Delivery Keys Locale** - Bulk delivery key locale management

The tool successfully addresses all identified user problems and provides a
comprehensive solution for Amplience CMS bulk operations that were previously
unavailable through the standard UI. All functional requirements have been
implemented with robust safety mechanisms, comprehensive reporting, and
user-friendly interactive interfaces.
