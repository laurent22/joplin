#!/bin/bash
# Retry a command up to a few times. Used to absorb random CI flakes (network
# failures, slow mirrors, etc).
#
# Usage: retry [attempts] [sleep_seconds] -- command [args...]
# Both attempts and sleep_seconds are optional and default to 3 and 10.
retry() {
	local attempts=3
	local sleep_seconds=10

	if [[ "$1" =~ ^[0-9]+$ ]]; then
		attempts="$1"
		shift
	fi
	if [[ "$1" =~ ^[0-9]+$ ]]; then
		sleep_seconds="$1"
		shift
	fi
	if [ "$1" = '--' ]; then
		shift
	fi

	local i=1
	while true; do
		"$@"
		local result=$?
		if [ $result -eq 0 ]; then
			return 0
		fi
		if [ $i -ge $attempts ]; then
			return $result
		fi
		echo "\`$*\` failed (attempt $i/$attempts) - retrying in ${sleep_seconds}s..."
		i=$((i + 1))
		sleep "$sleep_seconds"
	done
}
