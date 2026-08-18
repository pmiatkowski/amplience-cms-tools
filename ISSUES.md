# Issues

1. When PAT token is incorrect, no error is thrown and the command fails
   silently. The user should be informed that the PAT token is invalid and the
   command should not proceed.
2. When item is about to be created in the target repository, there is no check
   to see if the content type is assigned to the target repository. If its not,
   it should list content types that needs to be assigned to the target
   repository before proceeding with the command and stop the command from
   proceeding. **Status: Resolved.** Both recreation commands now run a
   repository content-type assignment preflight before confirmation or target
   mutation.
