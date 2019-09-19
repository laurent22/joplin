const { shim } = require('lib/shim.js');
const { netUtils } = require('lib/net-utils.js');

class GeolocationNode {
	static async currentPosition(options = null) {
		if (!options) options = {};

		const ip = await netUtils.ip();

		let response = await shim.fetch(`http://ip-api.com/json/${ip}`);
		if (!response.ok) throw new Error(`Could not get geolocation: ${await response.text()}`);

		response = await response.json();

		if (!('lat' in response) || !('lon' in response)) throw new Error(`Invalid geolocation response: ${response ? JSON.stringify(response) : '<null>'}`);

		return {
			timestamp: new Date().getTime(),
			coords: {
				longitude: response.lon,
				altitude: 0,
				latitude: response.lat,
			},
		};
	}
}

module.exports = { GeolocationNode };
