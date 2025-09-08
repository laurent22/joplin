import env from '../../env';
import { ErrorBadRequest } from '../../errors';
import createFilename from '../../services/createFilename';
import { AppContext, JobData } from '../../types';
import isFileAValidImage, { supportedImageFormat } from './isFileAValidImage';

export const parseCreateJobRequest = async (ctx: AppContext) => {
	if (!ctx.request.files) throw new ErrorBadRequest('Invalid file property.');
	if (Array.isArray(ctx.request.files)) throw new ErrorBadRequest('Invalid file property.');
	if (!Object.keys(ctx.request.files).includes('file')) throw new ErrorBadRequest('Invalid file property.');
	if (Array.isArray(ctx.request.files.file)) throw new ErrorBadRequest('Invalid file property.');

	const file = ctx.request.files.file;

	if (!file) {
		throw new ErrorBadRequest('Request property "file" was not set.');
	}

	const [isValid, formatProvided] = await isFileAValidImage(file.filepath);

	if (!isValid) {
		throw new ErrorBadRequest(`Image format not accepted: ${formatProvided}. Try using: ${supportedImageFormat.join(' or ')}`);
	}

	return {
		storeImage: (file: string) => ctx.storage.store(file),
		sendToQueue: (data: JobData) => ctx.queue.send(data),
		filepath: file.filepath,
		imageMaxDimension: env().IMAGE_MAX_DIMENSION,
		randomName: createFilename(),
	};
};

export const parseGetJobRequest = (ctx: AppContext) => {
	const jobId = ctx.path.split('/')[ctx.path.split('/').length - 1];
	if (!jobId) {
		throw new ErrorBadRequest('Not possible to parse jobId value, expected: /transcribe/{job-uuid}');
	}

	return {
		jobId,
		getJobById: (jobId: string) => ctx.queue.getJobById(jobId),
	};
};
