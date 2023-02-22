import { _ } from '../locale';
import Setting from '../models/Setting';

export const checkProviderIsSupported = (path: string): void => {
	if (Setting.value('sync.allowUnsupportedProviders') === 1) return;

	const unsupportedProviders = ['pcloud', 'jianguoyun'];
	for (const p of unsupportedProviders) {
		// For a provider named abc, this regex will match the provider's name if enclosed by either '/', '.', '-', '=' or end of string.
		// E.g: https://abc.com, https://api.abc.com, https://api-abc-test.com, https://api/test?param=abc
		//
		// It will not match a provider which name happens to contain an unsupported provider (i.e a substring).
		// E.g: https://fooabc.com
		const pattern = `(?<=[-/.=])${p}(?=[-/.=]|$)`;
		if (path.search(new RegExp(pattern)) !== -1) {
			throw new Error(_('The WebDAV implementation of %s is incompatible with Joplin, and as such is no longer supported. Please use a different sync method.', p));
		}
	}
};

export default checkProviderIsSupported;
