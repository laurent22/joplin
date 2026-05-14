import Logger from '@joplin/utils/Logger';
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

const fetchJson = async (url: string): Promise<Record<string, unknown>> => {
	const response = await shim.fetch(url);
	if (!response.ok) throw new Error(`Could not get geolocation: ${await response.text()}`);
	return await response.json();
};

const geoipServices: Record<string, GeoipService> = {

	ipwhois: async (): Promise<CurrentPositionResponse> => {
		const r = await fetchJson('https://ipwho.is/');
		if (!('latitude' in r) || !('longitude' in r)) throw new Error(`Invalid geolocation response: ${r ? JSON.stringify(r) : '<null>'}`);

		return {
			timestamp: Date.now(),
			coords: {
				longitude: r.longitude as number,
				altitude: 0,
				latitude: r.latitude as number,
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
