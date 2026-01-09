# Feature Request: extension-import

## Description

Add import command in extensions based on partial implementation of export extensions functionalities. User will be able to import/upload extensions which were previously downloaded/exported, to a picked target hub.

## User's description

I want to add import command in extensions based on partial implementation of export extensions functionalities src/commands/extensions.
User will be able to import/upload extensions which were previously downloaded/exported, to a picked target hub.
The flow:

- user selectes manage extensions
- user picks import options
- user is asked for target hub
- user is asked for source local path - defaults to the same path as default in export option
- user is asked for regexp filtered - defaults to .env AMP_DEFAULT_EXTENSION_FILTER
- filtered out extensions will be moved to a temp folder
- user will see a prompt confirming listed extensions and target hub
- after confirming, code will update hubId and url origin based on .env AMP_HUB_XXXX_EXT_URL enviroment
- export will be perfomed with dc-cli commands according to @.ai/memory/context/dc-cli/EXTENSION.md

## Created

2026-01-09
