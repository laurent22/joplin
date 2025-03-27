#pragma once

#include <vector>
#include <optional>
#include <tuple>

struct SilenceRange {
	bool isValid;
	int start;
	int end;
};

struct LongestSilenceOptions {
	int sampleRate;

	// Minimum length of a silence range (e.g. 3.0 seconds)
	float minSilenceLengthSeconds;

	// The maximum position for a silence range to start (ignore
	// all silences after this position).
	int maximumSilenceStartSamples;

	// Return the first silence satisfying the conditions instead of
	// the longest.
	bool returnFirstMatch;
};

SilenceRange findLongestSilence(
	const std::vector<float>& audioData,
	LongestSilenceOptions options
);


