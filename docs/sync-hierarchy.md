# Functionality: Sync Hierarchy

This functionality provides a sophisticated command for synchronizing content
item hierarchies between different Amplience hubs, comparing source and target
hierarchical structures to create, remove, or update items while preserving
parent-child relationships and handling locale strategies for delivery keys.

## Core logic

The functionality is implemented as a self-contained command module within the
application's command structure, utilizing a specialized hierarchy service that
builds tree representations of content hierarchies and generates synchronization
plans through recursive comparison algorithms.

## Purpose

The primary purpose is to maintain consistency of hierarchical content
structures across different Amplience environments, enabling content migration,
synchronization, and deployment workflows between development, staging, and
production hubs while preserving the complex parent-child relationships that
define content hierarchies.

## Problems it solves

- **Hierarchy Structure Drift**: Prevents inconsistencies between environments
  where hierarchical content structures exist in source environments but are
  missing or different in target environments, which can break navigation and
  content relationships.
- **Complex Cross-Hub Migration**: Eliminates the manual, error-prone process of
  recreating hierarchical content structures across different hubs, which would
  require understanding and manually replicating parent-child relationships.
- **Locale Management in Hierarchies**: Addresses the challenge of managing
  delivery key locale prefixes when moving hierarchical content between
  environments that may have different localization requirements.
- **Incremental Synchronization**: Provides intelligent comparison that only
  creates, removes, or updates items that differ between source and target,
  avoiding unnecessary operations on already synchronized content.
- **Parent-Child Dependency Management**: Solves the complex ordering problem of
  creating hierarchical content where parent items must be created before their
  children to maintain referential integrity.

## How it works

- The user initiates the sync hierarchy command and selects source hub,
  repository, and root content item that defines the hierarchy to be
  synchronized
- They then select the target hub, repository, and root content item where the
  hierarchy should be synchronized to
- Configuration options are gathered including whether to update content of
  existing items, locale handling strategy for delivery keys, and publishing
  preferences
- The system builds complete hierarchical tree structures for both source and
  target environments using the Hierarchy API or repository scanning as fallback
- A synchronization plan is generated through recursive comparison that
  identifies items to create, remove, and optionally update based on content
  signatures
- The plan is displayed to the user showing exactly what changes will be made
  before execution
- During execution, removal operations are performed first to clean up items
  that exist in target but not source
- Creation operations follow in proper hierarchical order, ensuring parent items
  are created before their children
- Delivery keys are transformed according to the selected locale strategy (keep
  unchanged, remove locale prefixes, or replace with target locale)
- Hierarchy relationships are properly established in the content item metadata
  during creation
- Optional bulk publishing of newly created items is performed if enabled
- Progress tracking and detailed reporting provide visibility into the
  synchronization process with success/failure counts and error details
