import Setting from '../models/Setting';

interface CheckResult {
	isUnsupported: boolean;
	unsupportedProvider: string;
}

export const checkProviderIsUnsupported = (path: string): CheckResult => {
	if (Setting.value('sync.allowUnsupportedProviders') === 1) return { isUnsupported: false, unsupportedProvider: '' };

	const unsupportedProviders = require('./unsupportedWebDAVProviders.json');
	for (const p of unsupportedProviders.providers) {
		// For a provider named abc, this regex will match the provider's name if enclosed by either '/', '.' or '-'.
		// E.g: https://abc.com, https://api.abc.com, https://api-abc-test.com
		//
		// It will not match a provider which name happens to contain an unsupported provider (i.e a substring).
		// E.g: https://fooabc.com
		const pattern = `(?<=[/.-])${p}(?=[/.-])`;
		if (path.search(new RegExp(pattern)) !== -1) {
			return {
				isUnsupported: true,
				unsupportedProvider: p,
			};
		}
	}

	return {
		isUnsupported: false,
		unsupportedProvider: '',
	};
};

export default checkProviderIsUnsupported;
