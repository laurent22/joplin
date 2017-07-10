import { shim } from 'lib/shim.js'

const netUtils = {};

netUtils.ip = async () => {
	let response = await shim.fetch('https://api.ipify.org/?format=json');
	if (!response.ok) {
		throw new Error('Could not retrieve IP: ' + await response.text());
	}

	let ip = await response.json();
	return ip.ip;
}

export { netUtils };