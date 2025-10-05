import Logger from '@joplin/utils/Logger';
import { JobData } from '../../types';
import resizeImageAndDeleteInput from '../utils/resizeImageAndDeleteInput';
import { join } from 'path';

const logger = Logger.create('createJob');

type CreateJobContext = {
	storeImage: (filePath: string)=> Promise<string>;
	sendToQueue: (data: JobData)=> Promise<string | null>;
	filepath: string;
	imageMaxDimension: number;
	randomName: string;
};

const createJob = async (context: CreateJobContext) => {
	const imageResizedPath = join('images', context.randomName);

	await resizeImageAndDeleteInput(context.filepath, imageResizedPath, context.imageMaxDimension);

	const filePath = await context.storeImage(imageResizedPath);

	const jobId = await context.sendToQueue({ filePath });

	logger.info('Created resource: ', jobId);
	return { jobId };
};

export default createJob;
