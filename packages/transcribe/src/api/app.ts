require('dotenv').config();
import * as Koa from 'koa';
import Logger from '@joplin/utils/Logger';
import koaBody from 'koa-body';
import initiateLogger from '../services/initiateLogger';
import createQueue from '../services/createQueue';
import FileStorage from '../services/FileStorage';
import router from './router';
import env, { EnvVariables } from '../env';
import HtrCli from '../core/HtrCli';
import JobProcessor from '../workers/JobProcessor';

initiateLogger();
const logger = Logger.create('api/app');

const init = async () => {
	const envVariables = env();

	await checkServerConfigurations(envVariables);

	const app = new Koa();
	app.use(koaBody({ multipart: true }));

	app.listen(envVariables.SERVER_PORT);
	logger.info(`Listening on http://localhost:${envVariables.SERVER_PORT}`);

	await router(app, envVariables.API_KEY);

	const queue = await createQueue(envVariables, true);

	const fileStorage = new FileStorage();

	app.context.queue = queue;
	app.context.storage = fileStorage;

	const htrCli = new HtrCli(envVariables.HTR_CLI_DOCKER_IMAGE, envVariables.HTR_CLI_IMAGES_FOLDER);

	const jobProcessor = new JobProcessor(queue, htrCli);

	logger.info('Starting worker');
	await jobProcessor.init();
};

const checkServerConfigurations = (envVariables: EnvVariables) => {
	if (!envVariables.API_KEY) throw Error('API_KEY environment variable not set.');
	if (!envVariables.HTR_CLI_IMAGES_FOLDER) throw Error('HTR_CLI_IMAGES_FOLDER environment variable not set. This should point to a folder where images will be stored.');
};

const main = async () => {
	logger.info('Starting...');
	await init();
};

main().catch(error => {
	console.error(error);
	logger.error(error);
	process.exit(1);
});
