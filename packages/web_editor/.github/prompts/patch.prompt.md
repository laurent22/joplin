---
name: patch
description: create patch from specified hash
argument-hint: hash1 hash2 patch-file-name
---

create patch from specified hash
The hash values may not be in chronological order.
Determine which commit is older using the follwing command

```
git merge-base --is-ancestor <hash1>  <hash2>; echo $status
```

Then create patch using the following command

```
git diff <older-hash> <newer-hash> > <patch-file-name>
```
