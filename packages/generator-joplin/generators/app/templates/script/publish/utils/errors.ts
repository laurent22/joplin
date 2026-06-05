import logger from './logger';

export class FatalError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'FatalError';
	}
}

// If the error is expected FatalError simply log the message
export function handleFatalError(error: unknown) {
	if (error instanceof FatalError) {
		logger.error(error.message);
	} else if (error instanceof Error) {
		logger.error(`An unexpected error occurred: ${error.message}`);
	} else {
		logger.error(`An unknown error occurred: ${String(error)}`);
	}
	process.exit(1);
}
