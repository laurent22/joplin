# Updating Readability

Because of the way content scripts are loaded, we need to manually copy the whole Readability files here. That should be fine since they rarely change.

The files to update are:

- Readability.js
- Readability-readerable.js (for the function isProbablyReaderable)
- JSDOMParser.js

When updating, **make sure you add the commit and version number at the top of each file**.
