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
const isLoopbackIpV4 = (host: string) => {
	const parts = host.split('.');
	if (parts.length !== 4) return false;

	const bytes = parts.map(p => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
	if (bytes.some(b => b < 0 || b > 255)) return false;

	return bytes[0] === 127;
};

const isLoopbackIpV6 = (host: string) => {
	// URL.hostname keeps the brackets around IPv6 literals.
	const address = host.replace(/^\[/, '').replace(/\]$/, '');
	return loopbackHosts.has(address);
};

const isLoopbackHost = (host: string) => {
	if (!host) return false;
	if (loopbackHosts.has(host)) return true;
	if (loopbackSuffixes.some(suffix => host === suffix.substring(1) || host.endsWith(suffix))) return true;
	if (isLoopbackIpV4(host)) return true;
	if (isLoopbackIpV6(host)) return true;
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
		return isLoopbackHost(hostFromBaseUrl(baseUrl)) ? 'local' : 'remote';
	}
	return 'remote';
};

export default deriveClassification;
