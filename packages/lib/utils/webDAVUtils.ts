import Setting from '../models/Setting';

export const checkProviderIsSupported = (path: string): void => {
	if (Setting.value('sync.allowUnsupportedProviders') === 1) return;

	const unsupportedProviders = ['pcloud', 'jianguoyun'];
	for (const p of unsupportedProviders) {
		// For a provider named abc, this regex will match the provider's name if enclosed by either '/', '.' or '-'.
		// E.g: https://abc.com, https://api.abc.com, https://api-abc-test.com
		//
		// It will not match a provider which name happens to contain an unsupported provider (i.e a substring).
		// E.g: https://fooabc.com
		const pattern = `(?<=[/.-])${p}(?=[/.-])`;
		if (path.search(new RegExp(pattern)) !== -1) {
			throw new Error(`The WebDAV implementation of ${p} is incompatible with Joplin, and as such is no longer supported. Please use a different sync method.`);
		}
	}
};

export default checkProviderIsSupported;
