import * as Koa from 'koa';
import Logger from '@joplin/utils/Logger';
import authorizationGuard from './auth/authorizationGuard';
import createJob from './handler/createJob';
import { ApiError, ErrorNotFound } from '../errors';
import { AppContext } from '../types';
import { parseCreateJobRequest, parseGetJobRequest } from './utils/parseRequest';

const logger = Logger.create('router');

const ok = (ctx: AppContext, result: object) => {
	ctx.response.status = 200;
	ctx.response.set('Content-Type', 'application/json');
	ctx.response.body = result;
};

const router = (app: Koa, apiKey: string) => {

	app.use(async (ctx: AppContext) => {

		logger.info(`${ctx.request.method} ${ctx.request.URL.pathname}`);
		try {

			await authorizationGuard(ctx, apiKey);

			if (ctx.request.URL.pathname === '/transcribe' && ctx.request.method === 'POST') {
				const requirements = await parseCreateJobRequest(ctx);
				const response = await createJob(requirements);
				ok(ctx, response);
			} else if (ctx.request.URL.pathname.includes('/transcribe') && ctx.request.method === 'GET') {
				const requirements = parseGetJobRequest(ctx);
				const response = await requirements.getJobById(requirements.jobId);
				ok(ctx, response);
			} else {
				throw new ErrorNotFound();
			}

		} catch (error) {
			if (error instanceof ApiError) {
				logger.error(`${error.httpCode}: ${ctx.request.method} ${ctx.path}:`, error);
				ctx.response.status = error.httpCode ? error.httpCode : 500;
				ctx.response.set('Content-Type', 'application/json');
				ctx.response.body = { error: error.message };
			} else {
				const e = error as Error;
				logger.error(`${e.name}: ${ctx.request.method} ${ctx.path}:`, e);
				ctx.response.status = 500;
				ctx.response.set('Content-Type', 'application/json');
				ctx.response.body = { error: e.message };
			}
		}
	});

};

export default router;
