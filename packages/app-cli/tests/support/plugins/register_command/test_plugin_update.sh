#!/bin/bash

# - Update src/manifest.json with the new version number
# - Run the below command
# - Then the file /manifests.json also needs to be updated with the new manifest file

yarn run dist && cp publish/org.joplinapp.plugins.RegisterCommandDemo.jpl ~/src/joplin-plugins-test/plugins/org.joplinapp.plugins.RegisterCommandDemo/plugin.jpl && cp publish/org.joplinapp.plugins.RegisterCommandDemo.json ~/src/joplin-plugins-test/plugins/org.joplinapp.plugins.RegisterCommandDemo/plugin.json