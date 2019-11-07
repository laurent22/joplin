```
# List issues assigned to you that are labeled "urgent"
$ hub issue -a YOUR_USER -l urgent

# List the URLs of at most 20 PRs based on "develop" branch:
$ hub pr list -L 20 -b develop --format='%t [%H] | %U%n'

# Create a GitHub release with notes from a file and copy the URL to clipboard:
$ hub release create -c -F release-notes.txt v2.3.0
```