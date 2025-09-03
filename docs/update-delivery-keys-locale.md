# Functionality: Update Delivery Keys Locale

This functionality provides a specialized command for performing bulk updates to
the `deliveryKey` of content items within the Amplience CMS. It is specifically
designed to modify the locale segment of the delivery key, supporting both
prefix and suffix placement patterns, which is a common requirement in managing
multi-language content.

## Purpose

The primary purpose is to automate the time-consuming and error-prone task of
updating delivery keys for localization. It allows content managers and
developers to efficiently align URL structures and content identifiers with
their corresponding locales across a large set of content items.

## Problems it solves

- **Manual Inefficiency**: It eliminates the need to manually edit each content
  item one by one to change its delivery key, which is impractical for projects
  with hundreds or thousands of items.
- **Consistency and Accuracy**: It ensures that locale updates are applied
  consistently across all targeted content, reducing the risk of human error
  that can lead to broken links or incorrect content delivery.
- **Workflow Streamlining**: By offering an option to automatically publish the
  updated items, it combines two distinct operational steps (update and publish)
  into a single, automated workflow, significantly speeding up the content
  localization process.

## How it works

- The user selects the "Update delivery keys locale (prefix/suffix)" command.
- The tool prompts the user to specify the target Amplience hub and repository.
- The user is asked to provide filters to narrow down the content items that
  require updates, including:
  - Schema ID filter
  - Content status filter (draft, published, etc.)
  - Publishing status filter
  - Delivery key pattern filter (regex support)
  - Locale placement strategy (prefix or suffix)
- The user specifies the new locale value to replace existing locale segments.
- The tool fetches all content items from the selected repository and applies
  the specified filters.
- A preview table is displayed showing the current and proposed delivery keys
  for all items that will be updated, along with their status information.
- Upon user confirmation, the tool iterates through the filtered content items
  and updates their delivery keys using the specified locale placement pattern:
  - **Prefix mode**: Replaces locale at the beginning (e.g., `en-GB-page-title`
    → `fr-FR-page-title`)
  - **Suffix mode**: Replaces locale at the end (e.g., `page-title-en-GB` →
    `page-title-fr-FR`)
- Items with unchanged delivery keys are automatically skipped.
- After successful updates, the user is offered the option to automatically
  publish all successfully updated items.
- A console summary reports the number of successful updates, failures, and
  skipped items, along with any error details.
