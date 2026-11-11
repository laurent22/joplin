import { BlockList, isIP, LookupFunction } from 'node:net';
import { lookup } from 'node:dns';
import { buildConnector } from 'undici';

const nonPublicNetworks = new BlockList();

const ipv4Networks: [string, number][] = [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.0.2.0', 24],
	['192.88.99.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15],
	['198.51.100.0', 24],
	['203.0.113.0', 24],
	['224.0.0.0', 3],
];

// IPv4-mapped addresses (::ffff:a.b.c.d) are checked against the IPv4 ranges by BlockList itself. The other forms that
// embed or translate to an IPv4 address (NAT64, 6to4, Teredo) are blocked entirely, since they can reach those ranges.
const ipv6Networks: [string, number][] = [
	['::', 96],
	['64:ff9b::', 96],
	['64:ff9b:1::', 48],
	['100::', 64],
	['2001::', 32],
	['2001:db8::', 32],
	['2002::', 16],
	['fc00::', 7],
	['fe80::', 10],
	['fec0::', 10],
	['ff00::', 8],
];

for (const [network, prefix] of ipv4Networks) nonPublicNetworks.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of ipv6Networks) nonPublicNetworks.addSubnet(network, prefix, 'ipv6');

export const isPublicAddress = (address: string) => {
	const family = isIP(address);
	if (!family) return false;
	return !nonPublicNetworks.check(address, family === 4 ? 'ipv4' : 'ipv6');
};

const notPublicError = (host: string) => new Error(`Only public network addresses can be accessed: ${host}`);

// Filtering the addresses the connection is made to, rather than checking the URL beforehand, also covers redirects
// and DNS records that change between the check and the connection
const publicAddressLookup: LookupFunction = (hostname, options, callback) => {
	lookup(hostname, { ...options, all: true }, (error, addresses) => {
		if (error) return callback(error, '');
		const publicAddresses = addresses.filter(a => isPublicAddress(a.address));
		if (!publicAddresses.length) return callback(notPublicError(hostname), '');
		if (options.all) return callback(null, publicAddresses);
		return callback(null, publicAddresses[0].address, publicAddresses[0].family);
	});
};

const connectors = new Map<number, buildConnector.connector>();

// Connectors are cached so that the agent settings that contain them compare as equal, and the agent is reused
export const publicNetworkOnlyConnector = (timeout: number | undefined, ecdhCurve: string) => {
	const key = timeout ?? -1;
	if (!connectors.has(key)) {
		const connect = buildConnector({ timeout, ecdhCurve, lookup: publicAddressLookup } as buildConnector.BuildOptions);
		connectors.set(key, (options, callback) => {
			// IP addresses are connected to directly, without going through the lookup function
			if (isIP(options.hostname) && !isPublicAddress(options.hostname)) {
				callback(notPublicError(options.hostname), null);
				return;
			}
			connect(options, callback);
		});
	}
	return connectors.get(key);
};
