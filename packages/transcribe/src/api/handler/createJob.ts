import Logger from '@joplin/utils/Logger';
import { JobData } from '../../types';

const logger = Logger.create('createJob');

type CreateJobContext = {
	storeImage: (filePath: string)=> Promise<string>;
	sendToQueue: (data: JobData)=> Promise<string | null>;
	filepath: string;
};

const createJob = async (context: CreateJobContext) => {
	const filePath = await context.storeImage(context.filepath);

	const jobId = await context.sendToQueue({ filePath });

	logger.info('Created resource: ', jobId);
	return { jobId };
};

export default createJob;
