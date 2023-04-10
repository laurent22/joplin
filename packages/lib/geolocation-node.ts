import Logger from './Logger';
import shim from './shim';

const logger = Logger.create('geolocation-node');

interface CurrentPositionResponseCoordinates {
	longitude: number;
	latitude: number;
	altitude: number;
}

interface CurrentPositionResponse {
	timestamp: number;
	coords: CurrentPositionResponseCoordinates;
}

interface CurrentPositionOptions {}

type GeoipService = ()=> Promise<CurrentPositionResponse>;

const fetchJson = async (url: string): Promise<any> => {
	let r = await shim.fetch(url);
	if (!r.ok) throw new Error(`Could not get geolocation: ${await r.text()}`);
	r = await r.json();
	return r;
};

const geoipServices: Record<string, GeoipService> = {

	ipwhois: async (): Promise<CurrentPositionResponse> => {
		const r = await fetchJson('https://ipwho.is/');
		if (!('latitude' in r) || !('longitude' in r)) throw new Error(`Invalid geolocation response: ${r ? JSON.stringify(r) : '<null>'}`);

		return {
			timestamp: Date.now(),
			coords: {
				longitude: r.longitude,
				altitude: 0,
				latitude: r.latitude,
			},
		};
	},

	geoplugin: async (): Promise<CurrentPositionResponse> => {
		const r = await fetchJson('http://www.geoplugin.net/json.gp');
		if (!('geoplugin_latitude' in r) || !('geoplugin_longitude' in r)) throw new Error(`Invalid geolocation response: ${r ? JSON.stringify(r) : '<null>'}`);

		return {
			timestamp: Date.now(),
			coords: {
				longitude: Number(r.geoplugin_longitude),
				altitude: 0,
				latitude: Number(r.geoplugin_latitude),
			},
		};
	},

};

export default class {
	public static async currentPosition(options: CurrentPositionOptions = null) {
		if (!options) options = {};

		for (const [serviceName, handler] of Object.entries(geoipServices)) {
			try {
				const response = await handler();
				return response;
			} catch (error) {
				logger.warn(`Could not get geolocation from service "${serviceName}"`);
				logger.warn(error);
			}
		}

		throw new Error('Could not get geolocation from any of the services');
	}
}
