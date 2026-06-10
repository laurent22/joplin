import { ProviderClassification, ProviderType } from './types';

// Hosts treated as on-device. LAN addresses are deliberately classified as
// remote — the spec's local/remote split is "does my data leave my network",
// so LAN traffic still requires the user's ai.allowRemote opt-in.
const localHosts = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

const hostFromBaseUrl = (baseUrl: string): string => {
	if (!baseUrl) return '';
	try {
		return new URL(baseUrl).hostname.toLowerCase();
	} catch {
		return '';
	}
};

const deriveClassification = (
	providerType: ProviderType,
	baseUrl: string,
): ProviderClassification => {
	if (providerType === 'anthropic') return 'remote';
	if (providerType === 'joplin-cloud') return 'remote';
	if (providerType === 'openai-compatible') {
		const host = hostFromBaseUrl(baseUrl);
		return localHosts.has(host) ? 'local' : 'remote';
	}
	return 'remote';
};

export default deriveClassification;
