# Issues

1. When PAT token is incorrect, no error is thrown and the command fails
   silently, i.e., showing no results found or similar. The user should be
   informed that the PAT token is invalid and the command should not proceed.
   Maybe some kind of preflight check should be added to validate the PAT token
   before proceeding with the command execution.
2. When there is a discovery process, its not being displayed as a progress bar
   but as a list of items. This is not user friendly and should be changed to a
   progress bar.

   ```
   Validating target repository content types...
   📊 discovery: 0/258
   📊 discovery: 1/258
   📊 discovery: 2/258
   📊 discovery: 3/258
   📊 discovery: 4/258
   📊 discovery: 5/258
   📊 discovery: 6/258
   📊 discovery: 7/258
   📊 discovery: 8/258
   and the same for matching:
   📊 matching: 0/258
   📊 matching: 1/258
   📊 matching: 2/258
    and the same for delivery-key-validation:
   📊 delivery-key-validation: 1/40
   📊 delivery-key-validation: 2/40
   📊 delivery-key-validation: 3/40
   ```

3. Add extra protection environment variable to prevent accidental execution of
   the command in production environments. This should be a required
   confirmation step before proceeding with the operation. It should be defined
   by the user in the .env as an optional value along with the HUB
   configuration. If additional protection is set to 1, then user needs to
   confirm the operation by typing hub name and repository name before
   proceeding. If the value is 0, then no confirmation is needed. The default
   value should be 0. i.e. `AMP_HUB_DEV_PROTECTED=1` or
   `AMP_HUB_PROD_PROTECTED=1`, `AMP_HUB_DEV_PROTECTED=0` or
   `AMP_HUB_PROD_PROTECTED=0`

```

```
