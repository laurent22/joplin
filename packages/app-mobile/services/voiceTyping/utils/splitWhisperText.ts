// Matches pairs of timestamps or single timestamps.
const timestampExp = /<\|(\d+\.\d*)\|>(?:<\|(\d+\.\d*)\|>)?/g;

const timestampMatchToNumber = (match: RegExpMatchArray) => {
	const firstTimestamp = match[1];
	const secondTimestamp = match[2];
	// Prefer the second timestamp in the pair, to remove leading silence.
	const timestamp = Number(secondTimestamp ? secondTimestamp : firstTimestamp);

	// Should always be a finite number (i.e. not NaN)
	if (!isFinite(timestamp)) throw new Error(`Timestamp match failed with ${match[0]}`);

	return timestamp;
};

const splitWhisperText = (textWithTimestamps: string, recordingLengthSeconds: number) => {
	const timestamps = [
		...textWithTimestamps.matchAll(timestampExp),
	].map(match => {
		const timestamp = timestampMatchToNumber(match);
		return { timestamp, match };
	});

	if (!timestamps.length) {
		return { trimTo: 0, dataBeforeTrim: '', dataAfterTrim: textWithTimestamps };
	}

	const firstTimestamp = timestamps[0];
	let breakAt = firstTimestamp;

	const lastTimestamp = timestamps[timestamps.length - 1];
	const hasLongPauseAfterData = lastTimestamp.timestamp + 4 < recordingLengthSeconds;
	if (hasLongPauseAfterData) {
		breakAt = lastTimestamp;
	} else {
		const textWithTimestampsContentLength = textWithTimestamps.trimEnd().length;

		for (const timestampData of timestamps) {
			const { match, timestamp } = timestampData;
			const contentBefore = textWithTimestamps.substring(Math.max(match.index - 3, 0), match.index);
			const isNearEndOfLatinSentence = contentBefore.match(/[.?!]/);
			const isNearEndOfData = match.index + match[0].length >= textWithTimestampsContentLength;

			// Use a heuristic to determine whether to move content from the preview to the document.
			// These are based on the maximum buffer length of 30 seconds -- as the buffer gets longer, the
			// data should be more likely to be broken into chunks. Where possible, the break should be near
			// the end of a sentence:
			const canBreak = (timestamp > 4 && isNearEndOfLatinSentence && !isNearEndOfData)
					|| (timestamp > 8 && !isNearEndOfData)
					|| timestamp > 16;
			if (canBreak) {
				breakAt = timestampData;
				break;
			}
		}
	}

	const trimTo = breakAt.timestamp;
	const dataBeforeTrim = textWithTimestamps.substring(0, breakAt.match.index);
	const dataAfterTrim = textWithTimestamps.substring(breakAt.match.index + breakAt.match[0].length);

	return { trimTo, dataBeforeTrim, dataAfterTrim };
};

export default splitWhisperText;
