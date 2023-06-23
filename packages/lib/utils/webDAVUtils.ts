import { _ } from '../locale';
import Setting from '../models/Setting';
import { URL } from 'url';

const pathContainsUnsupportedProvider = (path: string, unsupportedProviders: string[]) => {
	try {
		const url = new URL(path.toLowerCase());
		const splitted = url.host.split('.');

		for (const s of splitted) {
			if (unsupportedProviders.includes(s)) return true;
		}

		return false;
	} catch (error) {
		// The URL is probably invalid, but it's not here that we should handle
		// this.
		return false;
	}
};

export const checkProviderIsSupported = (path: string): void => {
	if (Setting.value('sync.allowUnsupportedProviders') === 1) return;

	const unsupportedProviders = ['pcloud', 'jianguoyun'];
	for (const p of unsupportedProviders) {
		if (pathContainsUnsupportedProvider(path, unsupportedProviders)) {
			throw new Error(_('The WebDAV implementation of %s is incompatible with Joplin, and as such is no longer supported. Please use a different sync method.', p));
		}
	}
};

export default checkProviderIsSupported;
