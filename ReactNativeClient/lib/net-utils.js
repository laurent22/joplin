const { shim } = require('lib/shim.js');

const netUtils = {};

netUtils.ip = async () => {
	let response = await shim.fetch('https://api.ipify.org/?format=json');
	if (!response.ok) {
		throw new Error(`Could not retrieve IP: ${await response.text()}`);
	}

	let ip = await response.json();
	return ip.ip;
};

netUtils.findAvailablePort = async (possiblePorts, extraRandomPortsToTry = 20) => {
	const tcpPortUsed = require('tcp-port-used');

	for (let i = 0; i < extraRandomPortsToTry; i++) {
		possiblePorts.push(Math.floor(8000 + Math.random() * 2000));
	}

	let port = null;
	for (let i = 0; i < possiblePorts.length; i++) {
		let inUse = await tcpPortUsed.check(possiblePorts[i]);
		if (!inUse) {
			port = possiblePorts[i];
			break;
		}
	}
	return port;
};

netUtils.mimeTypeFromHeaders = headers => {
	if (!headers || !headers['content-type']) return null;

	const splitted = headers['content-type'].split(';');
	return splitted[0].trim().toLowerCase();
};

module.exports = { netUtils };
