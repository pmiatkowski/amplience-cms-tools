# VSE Bulk Visualizations

Add VSE Management command for bulk updating content type visualizations with predefined configurations.

## Original Description

The idea is to add a new command for managing VSE (virtual staging environments) for content types. When user starts application, they will be able to pick new command "VSE Management". Once selected, they will see additional sub commands. For now, focus solely on the first one: "Bulk visualizations update" which will allow user to update content types visualizations on a selected hub with predefined configurations from a JSON file.

## User Flow

1. User starts application
2. User selects VSE Management command
3. User picks sub command "Bulk visualisations update"
4. User picks TARGET hub
5. User is asked how to pick content-types list:
   - **By API and filtering**: Provide regexp (defaults to `AMP_DEFAULT_SCHEMA_ID`), then multiselect from listed content types shown as `[label] (contentTypeUri)`
   - **By file**: Provide file location with content type URIs (defaults to `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE`)
6. User provides visualization configuration file location (defaults to `AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE`)
7. System replaces origin in `templatedUri` property with hub-specific URL from env vars (`AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL`)
8. User confirms with summary showing:
   - List of content types
   - Configuration for visualization (with parsed origin)
   - Target HUB
9. System updates content types using `PATCH /content-types/{contentTypeId}` API endpoint

## Technical Notes

- Configuration file contains visualization properties to be set
- `templatedUri` property contains URL with origin that needs replacement
- Hub-specific visualization URLs defined in env: `AMP_HUB_DEV_VISUALISATION_APP_URL`, `AMP_HUB_SIT_VISUALISATION_APP_URL`, etc.
- Process aborts if env var not defined for selected hub
- Only ORIGIN in `templatedUri` should be replaced
