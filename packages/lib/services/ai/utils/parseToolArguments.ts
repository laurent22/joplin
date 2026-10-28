import Logger from '@joplin/utils/Logger';

const logger = Logger.create('ai/parseToolArguments');

const describeJsonParseFailure = (rawContent: string) => {
	const parseError = ['Failed to parse JSON.'];

	const suggestedRetryLengthLimit = 1000;
	if (rawContent.startsWith('{') && rawContent.length > suggestedRetryLengthLimit) {
		parseError.push(`It's likely that the tool call JSON is too long. Please try again with a message shorter than ${suggestedRetryLengthLimit} characters.`);
	}

	return parseError.join(' ');
};

const parseToolArguments = (argumentString: string) => {
	try {
		const args: Record<string, unknown> = JSON.parse(argumentString);
		return { args, parseError: null as string|null };
	} catch (error) {
		const parseError = describeJsonParseFailure(argumentString);
		logger.error('JSON parse failed', error, parseError);
		return { args: {}, parseError };
	}
};

export default parseToolArguments;
