# GitHub CLI (gh) - Quick Reference for Project Planning

## Overview

This document summarizes the GitHub CLI (`gh`) commands and workflows used to manage GitHub Projects, Epics, Features, and Backlog Items during the planning phase of the Joplin Offline Thesaurus Plugin project.

---

# Installation

## Verify Installation

```bash
gh --version
```

Expected output:

```text
gh version x.x.x
```

If the command is not found:

```bash
brew install gh
```

---

# Authentication

## Login

```bash
gh auth login
```

Recommended options:

```text
GitHub.com
HTTPS
Login with browser
```

---

## Verify Authentication

```bash
gh auth status
```

Example:

```text
Logged in to github.com as Ach57
Token scopes: gist, project, read:org, repo, workflow
```

---

# Project Permissions

GitHub Projects require the `project` scope.

If you receive errors such as:

```text
GraphQL: Your token has not been granted the required scopes
```

Refresh permissions:

```bash
gh auth refresh -s project
```

Verify:

```bash
gh auth status
```

Ensure the output contains:

```text
project
```

---

# Repository Configuration

## View Current Repository

```bash
gh repo view
```

---

## Set Default Repository

If GitHub CLI asks:

```text
please run `gh repo set-default`
```

Set the repository:

```bash
gh repo set-default Ach57/joplin-comp-354-dev
```

Verify:

```bash
gh repo view
```

---

# GitHub Projects

## List Projects

Personal project:

```bash
gh project list --owner @me
```

Specific owner:

```bash
gh project list --owner Ach57
```

Example:

```text
NUMBER  TITLE
1       Offline Thesaurus Plugin
```

---

## View Project Details

```bash
gh project view 1 --owner Ach57
```

---

## List Project Items

```bash
gh project item-list 1 --owner Ach57
```

---

# Labels

## Create Labels

Create once per repository.

Epic label:

```bash
gh label create epic --color FF0000
```

Feature label:

```bash
gh label create feature --color 0052CC
```

Backlog label:

```bash
gh label create backlog-item --color 0E8A16
```

---

# Issues

## Create an Issue

```bash
gh issue create \
  --title "Feature: User Interaction & UX" \
  --label feature
```

---

## Create an Issue With Description

```bash
gh issue create \
  --title "Feature: Semantic Ranking Engine" \
  --label feature \
  --body "
## Goal
Rank synonym candidates using embeddings.

## Scope
- Candidate generation
- Semantic ranking
- Threshold filtering

## Success Criteria
- Returns top 3 suggestions
"
```

---

## List Issues

Open issues:

```bash
gh issue list
```

All issues:

```bash
gh issue list --state all
```

---

## View an Issue

```bash
gh issue view 7
```

---

## Get Issue URL

```bash
gh issue view 7 --json url
```

---

# Adding Issues To Projects

## Create Issue Directly In Project

```bash
gh issue create \
  --title "Feature: WordNet Integration" \
  --label feature \
  --project "Offline Thesaurus Plugin"
```

---

## Add Existing Issue To Project

Syntax:

```bash
gh project item-add PROJECT_NUMBER \
  --owner OWNER \
  --url ISSUE_URL
```

Example:

```bash
gh project item-add 1 \
  --owner Ach57 \
  --url https://github.com/Ach57/joplin-comp-354-dev/issues/7
```

This is useful when:

- The issue already exists
- The issue was removed from the project
- You wish to move planning items into an existing project

---

# Removing vs Deleting Issues

## Remove From Project

If you remove an item from a project:

✅ Issue remains in repository

✅ Comments remain

✅ Labels remain

✅ History remains

❌ No longer appears on the project board

---

## Delete Issue

If you delete an issue:

❌ Issue is permanently removed

❌ Comments are lost

❌ Project association is lost

Use caution.

---

# Recovering Removed Issues

If an issue was removed from the project:

1. Verify it still exists

```bash
gh issue view 7
```

2. Re-add it

```bash
gh project item-add 1 \
  --owner Ach57 \
  --url https://github.com/Ach57/joplin-comp-354-dev/issues/7
```

---

# Recommended Project Structure

## Epic

```text
Offline Thesaurus Plugin
```

---

## Features

```text
Plugin Foundation & Infrastructure
User Interaction & UX
WordNet Synonym Retrieval
Semantic Ranking Engine
Offline Experience
Performance & Optimization
Quality Assurance
Documentation & Release Readiness
```

---

## Backlog Items

Create later during backlog refinement.

Examples:

```text
Research Joplin Plugin Architecture

Context Menu Integration

Capture Word and Sentence Context

Cosine Similarity Ranking

Offline Validation

Create NLP Test Dataset
```

---

# Shell Script Example

```bash
#!/bin/bash

PROJECT="Offline Thesaurus Plugin"

gh issue create \
  --title "EPIC: Offline Thesaurus Plugin" \
  --label epic \
  --project "$PROJECT"

gh issue create \
  --title "Feature: Plugin Foundation & Infrastructure" \
  --label feature \
  --project "$PROJECT"

gh issue create \
  --title "Feature: User Interaction & UX" \
  --label feature \
  --project "$PROJECT"

gh issue create \
  --title "Feature: Semantic Ranking Engine" \
  --label feature \
  --project "$PROJECT"
```

Execute:

```bash
chmod +x create-issues.sh
./create-issues.sh
```

---

# Useful Troubleshooting Commands

Check login:

```bash
gh auth status
```

Refresh project permissions:

```bash
gh auth refresh -s project
```

View repository:

```bash
gh repo view
```

List projects:

```bash
gh project list --owner Ach57
```

List issues:

```bash
gh issue list --state all
```

View project items:

```bash
gh project item-list 1 --owner Ach57
```

---

# Best Practices

- Create Epics and Features first.
- Create Backlog Items during refinement.
- Use labels consistently.
- Avoid creating dozens of detailed tickets too early.
- Remove issues from projects only when reorganizing work.
- Prefer closing issues over deleting them.
- Keep project management scripts separate from application code.
