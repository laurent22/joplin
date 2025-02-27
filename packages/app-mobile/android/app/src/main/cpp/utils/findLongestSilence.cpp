#include "findLongestSilence.h"
#include "androidUtil.h"

static void highpass(std::vector<float>& data, int sampleRate) {
	// Highpass filter. See https://en.wikipedia.org/wiki/High-pass_filter and
	// the example in whisper.cpp/streaming.
	float highpassCutoffHz = 60.0f;
	float RC = 1.0f / (2 * 3.1416f * highpassCutoffHz);
	float timePerSample = 1.0f / sampleRate;
	float alpha = RC / (RC + timePerSample);

	float lastInput = data[0];
	for (int i = 1; i < data.size(); i++) {
		float currentInput = data[i];
		data[i] = alpha * data[i - 1] + alpha * (currentInput - lastInput);
		lastInput = currentInput;
	}
}

SilenceRange findLongestSilence(
	const std::vector<float>& audioData,
	int sampleRate,
	float minSilenceLengthSeconds,
	int maxSilencePosition
) {
	int bestCandidateLength = 0;
	int bestCandidateStart = -1;
	int bestCandidateEnd = -1;

	int currentCandidateStart = -1;

	std::vector<float> processedAudio { audioData };
	highpass(processedAudio, sampleRate);

	// Break into windows of size `windowSize`:
	int windowSize = 256;
	int windowsPerSecond = sampleRate / windowSize;
	int quietWindows = 0;

	// Finishes the current candidate for longest silence
	auto finalizeCandidate = [&] (int currentOffset) {
		bool hasCandidate = currentCandidateStart >= 0;
		if (!hasCandidate) {
			return;
		}

		int currentCandidateLength = currentOffset - currentCandidateStart;
		if (currentCandidateLength > bestCandidateLength && currentCandidateStart <= maxSilencePosition) {
			bestCandidateLength = currentCandidateLength;
			bestCandidateStart = currentCandidateStart;
			bestCandidateEnd = currentOffset;
			LOGD("New best candidate with length %d", currentCandidateLength);
		}

		currentCandidateStart = -1;
	};

	int windowOffset;
	for (windowOffset = 0; windowOffset < processedAudio.size() && windowOffset <= maxSilencePosition; windowOffset += windowSize) {
		int rollingAverageSize = 24;
		float threshold = static_cast<float>(rollingAverageSize) / 80.0f;

		// Count the number of samples that (when averaged with the nearby samples)
		// are below some threshold value.
		float absSum = 0;
		int silentSamples = 0;
		for (int i = windowOffset; i < windowOffset + windowSize && i < processedAudio.size(); i++) {
			absSum += abs(processedAudio[i]);

			bool isSumComplete = i - rollingAverageSize >= windowOffset;
			if (isSumComplete) {
				absSum -= abs(processedAudio[i - rollingAverageSize]);

				if (absSum < threshold) {
					silentSamples++;
				}
			}
		}

		// The window should be considered "quiet" if enough samples were below the threshold.
		// Don't require all of them to be to allow clicks and pops.
		if (silentSamples >= windowSize * 3 / 4) {
			quietWindows ++;
		} else {
			quietWindows = 0;
		}

		int minQuietWindows = static_cast<int>(windowsPerSecond * minSilenceLengthSeconds);
		if (quietWindows >= minQuietWindows && currentCandidateStart == -1) {
			// Found a candidate. Start it.
			currentCandidateStart = windowOffset;
		} else if (quietWindows == 0) {
			// Ended a candidate. Is it better than the best?
			finalizeCandidate(windowOffset);
		}
	}

	finalizeCandidate(windowOffset);

	// Return the best candidate.
	if (bestCandidateLength == 0) {
		return { .isValid = false, .start = 0, .end = 0 };
	} else {
		return {
			.isValid=true,
			.start=bestCandidateStart,
			.end=bestCandidateEnd
		};
	}
}

