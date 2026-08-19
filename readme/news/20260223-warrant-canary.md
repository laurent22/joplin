---
forum_url: https://discourse.joplinapp.org/t/48805
---

# Introducing our Warrant Canary

We have introduced a publicly signed warrant canary for Joplin.

A warrant canary is a regularly updated statement confirming that, as of the stated date, the project has not received secret legal orders, gag orders, or demands requiring the introduction of backdoors into the software or its infrastructure.

The canary is:

- Cryptographically signed using a dedicated OpenPGP key

- Updated every 60 days

- Published in plain text for independent verification

If the canary is not updated within its stated validity window, it should be considered expired.

You can view and verify the current canary here:

https://raw.githubusercontent.com/laurent22/joplin/refs/heads/dev/readme/canary.txt

With additional information on how it is generated and managed there:

https://github.com/laurent22/joplin/blob/dev/readme/canary.md

This measure is intended to improve transparency and provide an additional signal to the community. It does not prevent legal orders, but it helps ensure that any material change in our legal status cannot occur silently.
