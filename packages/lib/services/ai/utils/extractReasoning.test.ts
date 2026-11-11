import extractReasoning from './extractReasoning';

describe('extractReasoning', () => {

	test.each([
		[
			'Gemma channel markers',
			'<|channel>thought\nI should greet them.<channel|>Hello there!',
			'Hello there!',
			'thought\nI should greet them.',
		],
		[
			'think tags',
			'<think>Let me work this out.</think>The answer is 42.',
			'The answer is 42.',
			'Let me work this out.',
		],
		[
			'thinking tags',
			'<thinking>Considering options.</thinking>Done.',
			'Done.',
			'Considering options.',
		],
		[
			'no markers',
			'Just a plain reply.',
			'Just a plain reply.',
			'',
		],
		[
			'empty content',
			'',
			'',
			'',
		],
		[
			'leading whitespace before the marker',
			'\n  <think>Deliberating.</think>The answer.',
			'The answer.',
			'Deliberating.',
		],
		[
			'a marker-like tag that is part of the reply',
			'The `<think>` tag marks internal reasoning, like <think>this</think>.',
			'The `<think>` tag marks internal reasoning, like <think>this</think>.',
			'',
		],
		[
			'a reply whose code block shows the tag',
			'<think>They want an example.</think>Here:\n\n```\n<think>hello</think>\n```',
			'Here:\n\n```\n<think>hello</think>\n```',
			'They want an example.',
		],
	])('should split %s', (_name, content, expectedText, expectedReasoning) => {
		const result = extractReasoning(content);
		expect(result.text).toBe(expectedText);
		expect(result.reasoning).toBe(expectedReasoning);
	});

	it('should treat an unterminated marker as reasoning rather than leaking it as the reply', () => {
		const result = extractReasoning('<|channel>thought\nI was cut off mid-sent');
		expect(result.text).toBe('');
		expect(result.reasoning).toBe('thought\nI was cut off mid-sent');
	});

	it('should preserve a reply that opens with a fenced block showing the tag', () => {
		const content = '```\n<think>hello</think>\n```\n\nThat tag marks internal reasoning.';
		const result = extractReasoning(content);
		expect(result.text).toBe(content.trim());
		expect(result.reasoning).toBe('');
	});

});
