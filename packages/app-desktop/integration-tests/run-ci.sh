#!/bin/sh

echo "Running desktop integration tests..."

export CI=true

if test "$RUNNER_OS" = "Linux" ; then
	# The Ubuntu Github CI doesn't have a display server.
	# Start a virtual one with xvfb-run. 
	xvfb-run -- yarn playwright test
else
	yarn playwright test
fi
