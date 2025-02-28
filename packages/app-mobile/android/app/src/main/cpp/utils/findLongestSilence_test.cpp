#include "findLongestSilence_test.h"
#include "findLongestSilence.h"
#include "androidUtil.h"

#include <string>
#include <vector>
#include <sstream>
#include <cmath>
#include <random>

static void testTones();
static void testToneWithPause();
static void testSilence();
static void testNoise();

static void fail(const std::string& message);

struct GeneratedAudio {
	std::vector<float> data;
	int sampleRate;
	int sampleCount;
};

using AudioGenerator = std::function<const float(float)>;
static GeneratedAudio makeAudio(const AudioGenerator& generator, int sampleRate, float duration);
static void expectNoSilence(const GeneratedAudio& audio, const std::string& testLabel);
static void expectSilenceBetween(const GeneratedAudio& audio, float startTimeSeconds, float stopTimeSeconds, const std::string& testLabel);


void findLongestSilence_test() {
	testTones();
	testToneWithPause();
	testSilence();
	testNoise();
}


static void testTones() {
	for (int frequency = 440; frequency < 1600; frequency += 300) {
		std::stringstream messageBuilder;
		messageBuilder << "Should not find silence in tone with frequency " << frequency << " HZ.";

		auto audioTone = makeAudio([frequency](float t) {
			// Also set the amplitude to 0.2f (to more closely match mic input).
			return std::sin(t * static_cast<float>(frequency)) * 0.2f;
		}, 15000, 10.0f);

		expectNoSilence(audioTone, messageBuilder.str());
	}

	auto lowFrequencyTone = makeAudio([](float t) {
		return std::sin(t * 8) * 0.3f;
	}, 15000, 10.0f);
	expectSilenceBetween(lowFrequencyTone, 0.0f, 10.0f, "Should find silence in a very low-frequency tone");
}

static void testToneWithPause() {
	auto audioToneWithPause = makeAudio([](float t) {
		if (t < 5.0f || t > 6.0f) {
			return std::sin(t * 880);
		} else {
			return 0.0f;
		}
	}, 15000, 11.0f);
	expectSilenceBetween(audioToneWithPause, 5.0f, 6.0f, "Should find silence when completely silent in a region");

	auto audioToneWithTwoPauses = makeAudio([](float t) {
		if (t < 1.0f || (t > 8.0f && t < 10.0f)) {
			return 0.0f;
		} else {
			return std::sin(t * 880);
		}
	}, 15000, 20.0f);
	expectSilenceBetween(audioToneWithPause, 5.0f, 6.0f, "Should find silence when completely silent in a region");
}

static void testSilence() {
	auto silence = makeAudio([](float t) {
		return 0.0f;
	}, 16000, 10.0f);
	expectSilenceBetween(silence, 0.0f, 10.0f, "Should find silence in a completely silent signal");
}

static void testNoise() {
	std::minstd_rand randomness {2};
	std::uniform_real_distribution noiseGenerator {-1.0, 1.0};
	auto quietNoise = makeAudio([&](float t) {
		return noiseGenerator(randomness) * 0.02f;
	}, 16000, 5.0f);
	expectSilenceBetween(quietNoise, 0.0f, 5.0f, "Should find silence in a tone with low-amplitude noise");
}


static void fail(const std::string& message) {
	throw std::runtime_error(message);
}

static GeneratedAudio makeAudio(const AudioGenerator& generator, int sampleRate, float duration) {
	std::vector<float> result { };

	int numSamples = static_cast<int>(static_cast<float>(sampleRate) * duration);
	for (int i = 0; i < numSamples; i++) {
		float time = static_cast<float>(i) / static_cast<float>(sampleRate);
		result.push_back(generator(time));
	}

	return {
		.data=result,
		.sampleRate=sampleRate,
		.sampleCount=numSamples,
	};
}

static void logTestPass(const std::string& message) {
	LOGI("Test PASS: %s", message.c_str());
}

static float samplesToSeconds(int samples, int sampleRate) {
	return static_cast<float>(samples) / static_cast<float>(sampleRate);
}

static void expectNoSilence(const GeneratedAudio& audio, const std::string& testLabel) {
	auto silence = findLongestSilence(
			audio.data,
			audio.sampleRate,
			0.02f,
			audio.sampleCount
	);
	if (silence.isValid) {
		std::stringstream errorBuilder;
		float startSeconds = samplesToSeconds(silence.start, audio.sampleRate);
		float stopSeconds = samplesToSeconds(silence.end, audio.sampleRate);
		errorBuilder << "Error: Found silence between " << startSeconds << "s and " << stopSeconds << "s";
		errorBuilder << ": " << testLabel;
		fail(errorBuilder.str());
	}

	logTestPass(testLabel);
}

static void expectSilenceBetween(const GeneratedAudio& audio, float startTimeSeconds, float stopTimeSeconds, const std::string& testLabel) {
	auto silenceResult = findLongestSilence(
			audio.data,
			audio.sampleRate,
			0.02f,
			audio.sampleCount
	);

	if (!silenceResult.isValid) {
		fail("Error: No silence found: " + testLabel);
	}

	auto checkEndpoint = [&] (int actualValueSamples, float expectedValueSeconds, const std::string& description) {
		float actualValueSeconds = samplesToSeconds(actualValueSamples, audio.sampleRate);
		float tolerance = 0.1f; // 100ms
		if (std::abs(expectedValueSeconds - actualValueSeconds) > tolerance) {
			std::stringstream messageBuilder;
			messageBuilder << "Error: Silence " << description << " mismatch: ";
			messageBuilder << "got " << actualValueSeconds << "s expected " << expectedValueSeconds << "s. ";
			messageBuilder << testLabel;
			fail(messageBuilder.str());
		}
	};

	checkEndpoint(silenceResult.start, startTimeSeconds, "start time");
	checkEndpoint(silenceResult.end, stopTimeSeconds, "stop time");

	logTestPass(testLabel);
}
