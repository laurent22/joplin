#!/usr/bin/env bash
set -Eeo pipefail

if [[ "$*" == node*dist/app.js* ]] && [ "$(id -u)" = '0' ]; then
	find $Path \! -user USER -exec chown USER '{}' +
	exec /usr/bin/tini -- /usr/sbin/gosu USER:USER "$@"
fi

if [[ "$*" == node*dist/app.js* ]]; then
	set -- /usr/bin/tini -- "$@"
fi

exec "$@"
