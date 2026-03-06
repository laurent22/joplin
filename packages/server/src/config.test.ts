import { initConfig } from './config';
import { Env } from './utils/types';
import { EnvVariables } from './env';

describe('config', () => {

	it('should throw an error with the environment variable name when STORAGE_DRIVER is malformed', async () => {
		const env = {
			STORAGE_DRIVER: 'Type=InvalidType',
			RUNNING_IN_DOCKER: 0,
			DB_CLIENT: 'sqlite',
		} as EnvVariables;

		await expect(async () => initConfig(Env.Dev, env)).rejects.toThrow('Invalid configuration for STORAGE_DRIVER');
	});

	it('should throw an error with the environment variable name when STORAGE_DRIVER_FALLBACK is malformed', async () => {
		const env = {
			STORAGE_DRIVER_FALLBACK: 'Path=/only/path/no/type',
			RUNNING_IN_DOCKER: 0,
			DB_CLIENT: 'sqlite',
		} as EnvVariables;

		await expect(async () => initConfig(Env.Dev, env)).rejects.toThrow('Invalid configuration for STORAGE_DRIVER_FALLBACK');
	});

});
