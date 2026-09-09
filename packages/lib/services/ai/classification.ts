import { ProviderClassification, ProviderType } from './types';

// The split is "does my data leave my private network", so loopback, LAN and
// internal-only hostnames all count as local. `.local` is excluded on purpose:
// mDNS can resolve it to any machine on an untrusted network.
const loopbackHosts = new Set(['localhost', '::1', '0.0.0.0', '::']);

const privateSuffixes = ['.localhost', '.internal', '.home.arpa'];

// Dotted quad is enough because new URL() has already canonicalised octal, hex,
// decimal and short forms - `http://2130706433/` arrives here as "127.0.0.1".
const isPrivateIpV4 = (host: string) => {
	const parts = host.split('.');
	if (parts.length !== 4) return false;

	const bytes = parts.map(p => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
	if (bytes.some(b => b < 0 || b > 255)) return false;

	const [a, b] = bytes;
	if (a === 10) return true;
	if (a === 127) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 169 && b === 254) return true;
	return false;
};

const isPrivateIpV6 = (host: string) => {
	// URL.hostname keeps the brackets around IPv6 literals.
	const address = host.replace(/^\[/, '').replace(/\]$/, '');
	if (loopbackHosts.has(address)) return true;
	// Unique local (fc00::/7) then link-local (fe80::/10).
	if (/^f[cd][0-9a-f]{2}:/.test(address)) return true;
	if (/^fe[89ab][0-9a-f]:/.test(address)) return true;
	return false;
};

const isPrivateHost = (host: string) => {
	if (!host) return false;
	if (loopbackHosts.has(host)) return true;
	if (privateSuffixes.some(suffix => host === suffix.substring(1) || host.endsWith(suffix))) return true;
	if (isPrivateIpV4(host)) return true;
	if (isPrivateIpV6(host)) return true;
	return false;
};

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
		return isPrivateHost(hostFromBaseUrl(baseUrl)) ? 'local' : 'remote';
	}
	return 'remote';
};

export default deriveClassification;
