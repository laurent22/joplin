#!/bin/bash
set -e

xgettext --output=translation.pot --language=JavaScript --copyright-holder="Laurent Cozic" --package-name=Joplin-CLI --package-version=1.0.0 app/*.js
cp translation.pot app/locale/en_GB.po