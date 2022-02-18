#!/usr/bin/env bash
set -Eeo pipefail

if [[ "$*" == node*dist/app.js* ]] && [ "$(id -u)" = '0' ]; then
	USER_UID=${USER_UID:-1002}
	USER_GID=${USER_GID:-1002}
	Current_id=$(id -u)
	Current_group_id=$(id -g)
	if [ "$USER_UID" != "$Current_id" ]; then
		groupmod -o -g "$USER_UID" joplinUSER
		echo 'user uid is changed'
	fi
	if [ "$USER_UID" != "$Current_group_id" ]; then
		groupmod -o -g "$USER_UID" joplinUSER
		echo 'user gid is changed'
	fi
	find $Path \! -user USER -exec chown joplinUSER '{}' +
	exec /usr/bin/tini -- /usr/sbin/gosu joplinUSER:joplinyUSER "$@"
fi

if [[ "$*" == node*dist/app.js* ]]; then
	set -- /usr/bin/tini -- "$@"
fi

exec "$@"
