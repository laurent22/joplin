import Setting from '../models/Setting';

interface CheckResult {
	isUnsupported: boolean;
	unsupportedProvider: string;
}

export const checkProviderIsUnsupported = (path: string): CheckResult => {
	if (Setting.value('sync.allowUnsupportedProviders') === 1) return { isUnsupported: false, unsupportedProvider: '' };

	const unsupportedProviders = require('./unsupportedWebDAVProviders.json');
	for (const p of unsupportedProviders.providers) {
		if (path.includes(p)) {
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
