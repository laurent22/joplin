import { ProviderClassification, ProviderType } from './types';

// The split is "does this leave the user's device", because that is what
// ai.allowRemote asks them to consent to. Only loopback stays on the device, so
// LAN and internal-only hostnames are remote: a note sent to 192.168.1.50 goes
// to another machine, over a link that is often plaintext HTTP. `.local` is
// remote for the same reason plus mDNS resolving it to an untrusted machine.
const loopbackHosts = new Set(['localhost', '::1']);

const loopbackSuffixes = ['.localhost'];

// Dotted quad is enough because new URL() has already canonicalised octal, hex,
// decimal and short forms - `http://2130706433/` arrives here as "127.0.0.1".
const isPrivateNetworkIpV4 = (host: string) => {
	const parts = host.split('.');
	if (parts.length !== 4) return false;

	const bytes = parts.map(p => (/^\d{1,3}$/.test(p) ? Number(p) : -1));

	if (bytes.some(b => b < 0 || b > 255)) return false;

	const [first, second] = bytes;

	return (
		first === 127 ||
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 169 && second === 254)
	);
};

const isPrivateNetworkIpV6 = (host: string) => {
	const address = host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();

	if (address === '::1') return true;

	if (address.startsWith('fc') || address.startsWith('fd')) return true;

	if (
		address.startsWith('fe8') ||
        address.startsWith('fe9') ||
        address.startsWith('fea') ||
        address.startsWith('feb')
	) {
		return true;
	}

	return false;
};

const isInternalHostname = (host: string) => {
	return (
		host.endsWith('.internal') ||
        host.endsWith('.home.arpa')
	);
};

const isLoopbackHost = (host: string) => {
	if (!host) return false;
	if (loopbackHosts.has(host)) return true;
	if (loopbackSuffixes.some(suffix => host === suffix.substring(1) || host.endsWith(suffix))) return true;
	return false;
};

const isPrivateNetworkHost = (host: string) => {
	if (isLoopbackHost(host)) return true;
	if (isPrivateNetworkIpV4(host)) return true;
	if (isPrivateNetworkIpV6(host)) return true;
	if (isInternalHostname(host)) return true;
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
		return isPrivateNetworkHost(hostFromBaseUrl(baseUrl)) ? 'local' : 'remote';
	}
	return 'remote';
};

export default deriveClassification;
