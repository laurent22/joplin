import Logger from '@joplin/utils/Logger';
import { JobData } from '../../types';
import resizeImage from '../utils/resizeImage';

const logger = Logger.create('createJob');

type CreateJobContext = {
	storeImage: (filePath: string)=> Promise<string>;
	sendToQueue: (data: JobData)=> Promise<string | null>;
	filepath: string;
};

const createJob = async (context: CreateJobContext) => {
	const resizedFilePath = await resizeImage(context.filepath);

	const filePath = await context.storeImage(resizedFilePath);

	const jobId = await context.sendToQueue({ filePath });

	logger.info('Created resource: ', jobId);
	return { jobId };
};

export default createJob;
