---
description: Push the current code to the GitHub repository with an automatic change description.
---

// turbo-all

1. Ensure Remote is Correct
   Check and set the remote URL to ensure it's pointing to the right repository.
   `git remote set-url origin https://github.com/Woopsyyy/Talisay-City-College-Portal.git`

2. Stage Changes
   Add all modified and new files to the staging area.
   `git add .`

3. Generate Change Description
   The agent will now analyze the staged changes to identify:
   - New features added.
   - Bugs fixed.
   - Refactorings or improvements made.

4. Commit Changes
   The agent will commit the changes with the generated description.
   Example: `git commit -m "feat: added new teacher management; fix: resolved login session bug"`

5. Push to GitHub
   Push the committed changes to the remote repository.
   `git push origin master`
