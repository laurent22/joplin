---
name: rename_diff
description: show renamed source code difference using vscode
argument-hint: <hash1> <hash2> <new-file-path>
---

hash1 and hash2 are the two commits between which you want to see the difference.

The hash values may not be in chronological order.
Determine which commit is older using the follwing command

```
git merge-base --is-ancestor <hash1>  <hash2>; echo $status
```

Then you can use the following command to show the renamed source code difference using VSCode.

```
git show <older_hash>:<old_filename_path> > /tmp/old.<extension> && git show <newer_hash>:<new_filename_path> > /tmp/new.<extension> && code --diff /tmp/old.<extension> /tmp/new.<extension>
```
