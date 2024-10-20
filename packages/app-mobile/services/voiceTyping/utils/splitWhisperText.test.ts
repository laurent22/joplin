import splitWhisperText from './splitWhisperText';

describe('splitWhisperText', () => {
	test.each([
		{
			// Should trim at sentence breaks
			input: '<|0.00|> This is a test. <|5.00|><|6.00|> This is another sentence. <|7.00|>',
			recordingLength: 8,
			expected: {
				trimTo: 6,
				dataBeforeTrim: '<|0.00|> This is a test. ',
				dataAfterTrim: ' This is another sentence. <|7.00|>',
			},
		},
		{
			// Should prefer sentence break splits to non sentence break splits
			input: '<|0.00|> This is <|4.00|><|4.50|> a test. <|5.00|><|5.50|> Testing, <|6.00|><|7.00|> this is a test. <|8.00|>',
			recordingLength: 8,
			expected: {
				trimTo: 5.50,
				dataBeforeTrim: '<|0.00|> This is <|4.00|><|4.50|> a test. ',
				dataAfterTrim: ' Testing, <|6.00|><|7.00|> this is a test. <|8.00|>',
			},
		},
		{
			// Should avoid splitting for very small timestamps
			input: '<|0.00|> This is a test. <|2.00|><|2.30|> Testing! <|3.00|>',
			recordingLength: 4,
			expected: {
				trimTo: 0,
				dataBeforeTrim: '',
				dataAfterTrim: ' This is a test. <|2.00|><|2.30|> Testing! <|3.00|>',
			},
		},
		{
			// For larger timestamps, should allow splitting at pauses, even if not on sentence breaks.
			input: '<|0.00|> This is a test, <|10.00|><|12.00|> of splitting on timestamps. <|15.00|>',
			recordingLength: 16,
			expected: {
				trimTo: 12,
				dataBeforeTrim: '<|0.00|> This is a test, ',
				dataAfterTrim: ' of splitting on timestamps. <|15.00|>',
			},
		},
		{
			// Should prefer to break at the end, if a large gap after the last timestamp.
			input: '<|0.00|> This is a test, <|10.00|><|12.00|> of splitting on timestamps. <|15.00|>',
			recordingLength: 30,
			expected: {
				trimTo: 15,
				dataBeforeTrim: '<|0.00|> This is a test, <|10.00|><|12.00|> of splitting on timestamps. ',
				dataAfterTrim: '',
			},
		},
	])('should prefer to split at the end of sentences (case %#)', ({ input, recordingLength, expected }) => {
		const actual = splitWhisperText(input, recordingLength);
		expect(actual.trimTo).toBeCloseTo(expected.trimTo);
		expect(actual.dataBeforeTrim).toBe(expected.dataBeforeTrim);
		expect(actual.dataAfterTrim).toBe(expected.dataAfterTrim);
	});
});
