#pragma once

#include <vector>
#include <optional>
#include <tuple>

struct SilenceRange {
	bool isValid;
	int start;
	int end;
};

SilenceRange findLongestSilence(
	const std::vector<float>& audioData,
	int sampleRate,

	// Minimum length of silence in seconds
	float minSilenceLengthSeconds,

	// Doesn't check for silence at a position greater than maximumSilenceStart
	int maximumSilenceStart
);


