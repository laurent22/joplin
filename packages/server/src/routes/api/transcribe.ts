import { readFile } from 'fs-extra';
import { ErrorBadGateway, ErrorBadRequest, ErrorNotImplemented, ErrorServiceUnavailable } from '../../utils/errors';
import { formParse } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { SubPath } from '../../utils/routeUtils';
import { AppContext, RouteType } from '../../utils/types';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';
import config from '../../config';
import { safeRemove } from '../../utils/fileUtils';

const logger = Logger.create('api/transcribe');

const router = new Router(RouteType.Api);

const isHtrSupported = () => {
	return config().TRANSCRIBE_ENABLED;
};

const parseResponseSafely = async (response: Response) => {
	const text = await response.text();

	try {
		return JSON.parse(text);
	} catch (parseError) {
		const truncatedText = text.substring(0, 1000);

		return { error: truncatedText };
	}
};

router.get('api/transcribe/:id', async (path: SubPath, _ctx: AppContext) => {
	if (!isHtrSupported()) {
		throw new ErrorNotImplemented('HTR feature is not enabled in this server');
	}

	try {
		logger.info(`Checking Transcribe for Job: ${path.id}`);
		const response = await fetch(`${config().TRANSCRIBE_BASE_URL}/transcribe/${path.id}`,
			{
				headers: {
					'Authorization': config().TRANSCRIBE_API_KEY,
				},
			},
		);

		if (response.status >= 400 && response.status < 500) {
			const responseJson = await response.json();
			throw new ErrorBadRequest(responseJson.error);
		} else if (response.status >= 500) {
			const responseParsed = await parseResponseSafely(response);
			throw new ErrorBadGateway(responseParsed.error);
		}

		const responseJson = await response.json();
		return responseJson;
	} catch (error) {
		if (shim.fetchRequestCanBeRetried(error) || shim.fetchRequestCanBeRetried(error.cause)) {
			throw new ErrorServiceUnavailable('Transcribe Server not available right now.', error);
		}
		throw error;
	}
});

router.post('api/transcribe', async (_path: SubPath, ctx: AppContext) => {
	if (!isHtrSupported()) {
		throw new ErrorNotImplemented('HTR feature is not enabled in this server');
	}

	const request = await formParse(ctx.req);
	if (!request.files.file) throw new ErrorBadRequest('No file provided. Use a multipart/form request with a \'file\' property.');

	const form = new FormData();
	const file = await readFile(request.files.file.filepath);
	const blob = new Blob([file]);
	form.append('file', blob, 'file');

	try {
		logger.info('Sending file to Transcribe Server');
		const response = await fetch(`${config().TRANSCRIBE_BASE_URL}/transcribe`, {
			method: 'POST',
			body: form,
			headers: {
				'Authorization': config().TRANSCRIBE_API_KEY,
			},
		});

		if (response.status >= 400 && response.status < 500) {
			const responseJson = await response.json();
			throw new ErrorBadRequest(responseJson.error);
		} else if (response.status >= 500) {
			const responseParsed = await parseResponseSafely(response);
			throw new ErrorBadGateway(responseParsed.error);
		}

		const responseJson = await response.json();
		logger.info(`Job created successfully: ${responseJson.jobId}`);
		return responseJson;
	} catch (error) {
		if (shim.fetchRequestCanBeRetried(error) || shim.fetchRequestCanBeRetried(error.cause)) {
			throw new ErrorServiceUnavailable('Transcribe Server not available right now.', error);
		}
		throw error;
	} finally {
		await safeRemove(request.files.file.filepath);
	}
});

export default router;
