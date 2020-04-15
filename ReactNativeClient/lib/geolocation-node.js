const { shim } = require('lib/shim.js');

class GeolocationNode {
	static async currentPosition(options = null) {
		if (!options) options = {};

		let response = await shim.fetch('https://freegeoip.app/json/');
		if (!response.ok) throw new Error(`Could not get geolocation: ${await response.text()}`);

		response = await response.json();

		if (!('latitude' in response) || !('longitude' in response)) throw new Error(`Invalid geolocation response: ${response ? JSON.stringify(response) : '<null>'}`);

		return {
			timestamp: new Date().getTime(),
			coords: {
				longitude: response.longitude,
				altitude: 0,
				latitude: response.latitude,
			},
		};
	}
}

module.exports = { GeolocationNode };
