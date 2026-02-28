---
description: Debug a failed GitHub workflow or test by deeply analyzing logs and finding the most reliable solution.
---

When invoked with logs from a failed Github workflow, test, or other bug context, act as an expert Debugging Agent. Follow these steps meticulously to ensure a robust, non-hacky fix:

1. **Information Gathering**:
   - Carefully read the provided output, logs, or error messages. Identify the exact point of failure.
   - Use codebase search tools (`grep_search`, `find_by_name`) to locate the relevant source code, configuration files, or GitHub Actions YAML files.

2. **Extensive Research**:
   - Use the `search_web` tool to research the specific error.
   - Don't settle for the very first result from a forum. Read multiple sources (documentation, GitHub issues, reputable blog posts) to understand *all* common approaches to solving this issue.

3. **Evaluate and Select the MVP (Most Valuable/Reliable Plan)**:
   - Identify the "quick but hacky" solutions (e.g., suppressing the error, downgrading a package without reason, adding `sleep` statements, ignoring type checks). **Reject these immediately.**
   - Focus on finding the canonical, most reliable, and safe long-term solution. 
   - Determine what the standard practice is according to official documentation for that library/tool.

4. **Propose the Resolution**:
   - Give the user a clear explanation of *why* the failure happened.
   - Briefly contrast the hacky approach vs. the reliable approach you selected.
   - Propose the exact, robust fix you intend to write.

5. **Execute**:
   - After the user approves, or if they asked you to fix it directly, make the changes to the codebase and verify the logic.
