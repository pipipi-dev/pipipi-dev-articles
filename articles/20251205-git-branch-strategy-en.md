---
title: "Git Branch Strategy: A Practical Workflow for Indie Development"
emoji: "🌿"
type: "tech"
topics: ["IndieHacker", "Git", "GitHub", "Vercel"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 5 of **[Building SaaS Solo - Design, Implementation, and Operation Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday I wrote about "Documentation Strategy for Indie Development." Today I'll share my Git branching strategy for indie development.

## 🎯 Git Operations to Consider for Indie Development

In team development, there are established branching strategies like Git-flow and GitHub Flow. However, the situation is different for indie development.

**Characteristics of indie development:**
- You're the only developer (conflicts are rare)
- No reviewers (self-review is the norm)
- Want to iterate quickly (minimize procedures)

On the other hand, there are also these challenges:

- Don't want to break production
- Want to track change history easily
- Need rules for collaborating with AI agents (Claude Code)

Based on these considerations, I've adopted the following branching strategy for Memoreru, my indie project.

## 📂 Parallel Development with Git Worktree

Git Worktree allows you to have multiple directories with different branches open simultaneously. Unlike normal branch switching, this creates physically separate folders locally, allowing you to run separate Claude Code sessions in each location.

### Why Git Worktree?

The main reason is that **it enables parallel development with Claude Code**.

For example, suppose you have two large tasks: "refactoring search functionality" and "implementing payment features." You create separate worktrees for each and work on them in separate Claude Code sessions.

```
~/my-project/           # develop branch (main workspace)
~/my-project-search/    # feature/search-refactor (search functionality)
~/my-project-payment/   # feature/payment (payment features)
```

The key point is that **conversation context is separated for each session**.

In the search functionality session, discussions about search accumulate, while payment-related discussions accumulate in the payment session. Since contexts don't mix, you can have focused conversations for each task.

```
Session 1 (Search): "About optimizing this query..."
Session 2 (Payment): "About Stripe webhook handling..."
→ Each can have deep discussions in their own context without interference
```

Even in indie development, using AI agents enables "pseudo team development." Git Worktree is highly effective as the foundation for this.

**Other benefits:**
- No need to restart servers when switching branches
- No hassle of stash → checkout → pop
- No need to constantly think about "which branch am I on?"

### Setup Method

When parallel work becomes necessary, add a worktree for the feature branch.

```bash
# Main repository (develop)
cd ~/my-project
git branch  # Confirm you're on develop

# Create feature branch and add worktree
git worktree add ../my-project-feature1 -b feature/ui-refactor
```

This creates the `~/my-project-feature1` directory with the `feature/ui-refactor` branch checked out.

### Cleanup After Work Completion

After merging the feature branch into develop, delete the worktree.

```bash
# Remove worktree
git worktree remove ../my-project-feature1

# Delete branch (if already merged)
git branch -d feature/ui-refactor
```

## 🔄 Branch Operation Rules

### Basic Flow

```
feature → develop → main (production) → Vercel auto-deploy
```

1. **Daily development**: Work in `my-project` (develop)
2. **Parallel work**: Create feature branches with worktrees, develop in parallel with Claude Code
3. **Merge**: PR from feature → develop, or direct merge
4. **Production deploy**: PR from develop → main → Vercel auto-deploys

### Commit Rules

```bash
# ✅ Commit per feature
git commit -m "feat: Add user profile editing feature"
git commit -m "fix: Fix error handling during login"

# ❌ Bulk commit of multiple features
git commit -m "Various fixes"
```

**Key points:**
- Commit per feature (no bulk changes across multiple features)
- Use prefixes (feat, fix, docs, refactor, etc.)
- Verify functionality before committing

### Things Not to Do

```bash
# ❌ Direct push to main
git push origin main  # Forbidden!

# ✅ Always follow develop → PR → main flow
git push origin develop
# → Create PR on GitHub
```

Direct push to main is forbidden because it risks breaking production.

## 🤖 Rules for Collaborating with AI Agents

When developing with Claude Code, I explicitly state the following rules in `CLAUDE.md`.

```markdown
## Git Operations

### Branch Strategy (Git Worktree)
- **Daily development**: Work in `~/my-project` (develop)
- **Parallel work**: Create feature branches with worktrees
- **Production deploy**: Create PR on GitHub → merge → Vercel auto-deploy

### Commit/Push Rules
- **Feature-based commits**: No bulk changes across multiple features
- **Never push directly to main**: Always follow develop → PR → main flow
- **Verify before commit**: Confirm functionality on screen before committing
- **Commit only after user confirmation**: Don't commit automatically
```

The most important rule is "**Don't commit automatically**." If AI auto-commits thinking it's helping, unintended changes might be included. Commits should always be executed after human confirmation.

## 📋 Integration with Vercel

Vercel integrates with GitHub repositories for automatic deployment.

### Branch to Deployment Environment Mapping

| Branch | Deploy Target | URL |
|--------|--------------|-----|
| main | Production | example.com |
| develop | Preview | develop-xxx.vercel.app |

When you create a PR, it automatically deploys to the Preview environment. This is convenient for checking before production deployment.

### Skipping Deploys for Documentation Updates

If you want to skip deployment for documentation-only updates, include `[skip ci]` in the commit message.

```bash
git commit -m "docs: Update README [skip ci]"
```

## 💡 Practical Tips

### Tip 1: Pull Request Template

Preparing `.github/pull_request_template.md` helps maintain consistent PR quality.

```markdown
## Summary
<!-- What was changed -->

## Changes
-

## Test Confirmation
- [ ] Verified locally
- [ ] Verified in Preview environment

## Notes
```

### Tip 2: Branch Protection Rules

Protecting the main branch on GitHub prevents direct pushes.

**Settings → Branches → Branch protection rules:**
- Require a pull request before merging
- Require status checks to pass before merging

Setting this up even for indie development prevents accidental mistakes.

### Tip 3: Checking Worktree List

Use the following command to check current worktrees.

```bash
git worktree list
# ~/my-project           abcd123 [develop]
# ~/my-project-feature1  efgh456 [feature/ui-refactor]
```

Don't forget to delete worktrees you no longer need with `git worktree remove`.

## ✅ Summary

Here's what I've learned from practicing with Memoreru.

**What's working well:**
- Managing feature branches in parallel with Git Worktree, enabling pseudo team development with Claude Code
- Protecting production with develop → PR → main flow
- Communicating rules to AI agents via CLAUDE.md

**Things to be careful about:**
- Even in indie development, carelessness can break production
- Don't leave everything to AI; humans should confirm commits
- Don't forget to delete worktrees after use

Just because it's indie development doesn't mean you should be sloppy with Git operations—you'll regret it later. I recommend establishing minimum rules.

Tomorrow I'll explain "Schema Design with Supabase: Table Partitioning and Normalization in Practice."

---

**Other articles in this series**

- 12/4: Documentation Strategy for Indie Dev: Design Docs vs Thinking Logs
- 12/6: Schema Design with Supabase: Table Partitioning and Normalization in Practice
