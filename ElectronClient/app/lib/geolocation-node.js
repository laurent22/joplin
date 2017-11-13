const { shim } = require('lib/shim.js');
const { netUtils } = require('lib/net-utils.js');

class GeolocationNode {

	static async currentPosition(options = null) {
		if (!options) options = {};

		const ip = await netUtils.ip();

		let response = await shim.fetch('https://freegeoip.net/json/' + ip);
		if (!response.ok) throw new Error('Could not get geolocation: ' + await response.text());

		response = await response.json();

		return {
			timestamp: (new Date()).getTime(),
			coords: {
				longitude: response.longitude,
				altitude: 0,
				latitude: response.latitude
			}
		}
	}

}

module.exports = { GeolocationNode };