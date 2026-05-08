const { execCommand } = require('@joplin/utils');

if (!process.env.IS_CONTINUOUS_INTEGRATION || process.env.SKIP_ONENOTE_CONVERTER_BUILD) {
	// eslint-disable-next-line no-console
	console.info([
		'Skipping tests. Either SKIP_ONENOTE_CONVERTER_BUILD is enabled or IS_CONTINUOUS_INTEGRATION is unset.',
		'Consider running the tests manually with the "cargo test" command.',
	].join('\n'));
	return;
}

void execCommand('cargo test');
