---
name: review
description: review the difference between two specified commit hash values and analyze the changes.
argument-hint: Please provide two commit hash values to compare.
---

Review the difference between two specified commit hash values.
The hash values may not be in chronological order.
Determine which commit is older using the follwing command

```
git merge-base --is-ancestor <hash1>  <hash2>; echo $status
```

Then analyze the changes using:

```
git diff <older-hash> <newer-hash>
```

After review is finished, please reply results in Japanese.
