# AGENTS.md

## Git Push Rules

- **Do NOT automatically run `git push`** unless the user explicitly requests it.
- Always wait for user confirmation before pushing any commits to remote.
- You may stage and commit changes locally, but stop before pushing.
- **Batch commits before pushing**: group related milestone commits together with `git rebase -i` or by accumulating several local commits before a single push. This minimizes GitHub Actions mirror triggers (each push to `main` triggers one mirror run to GitLab + Codeberg — fewer pushes = less mirror churn).

## Language Rules

- **Use Vietnamese** when conversing with the user (chat messages, explanations, questions, confirmations).
- **Use English** for all code, documentation, comments, commit messages, and technical artifacts.
