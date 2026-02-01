---
description: Push the current code to the GitHub repository with an automatic change description.
---

// turbo-all

1. **Verify Repository Connection**
   Ensure the remote URL is correctly set to the main portal repository.
   `git remote set-url origin https://github.com/Woopsyyy/Talisay-City-College-Portal.git`

2. **Stage All Changes**
   Add all modified, new, and deleted files to the staging area.
   *Note: If FrontEnd or BackEnd are separate repos, their files might not be tracked unless their .git folders are removed or they are added as submodules.*
   `git add .`

3. **Analyze and Describe Changes**
   The agent will analyze the `git status` and recent file edits to generate a comprehensive commit message.
   - List new components or API endpoints.
   - Describe bug fixes (e.g., "fixed login session timeout").
   - Mention structural changes (e.g., "added /update workflow").

4. **Commit with Description**
   Perform the commit using the generated message.
   Example command: `git commit -m "feat: add update workflow; fix: update database connection logic"`

5. **Push to GitHub**
   Push the changes to the `master` branch.
   `git push origin master`

6. **Verify**
   Confirm that the push was successful and the repository is up to date.
