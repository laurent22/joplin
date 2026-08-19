import type { Context } from 'koa';

declare module 'knex/types/tables' {
	interface Job {
		id: string;
		name: string;
		data: string;
		state: number;
		retry_count: number;
		output: string;
		started_on: string;
		completed_on: string;
		created_on: string;
		updated_on: string;
	}

	interface Queue {
		name: string;
		created_on: string;
		updated_on: string;
	}

	interface Tables {
		job: Job;
	}
}

export type Resource = {
	id: number;
	resource_path: string;
	created_time: Date;
	updated_time: Date;
};

export type JobData = {
	filePath: string;
};

export type Result = {
	result: string;
};

export interface BaseQueue {
	send(data: JobData): Promise<string>;
	fetch(): Promise<JobWithData | null>;
	fail(jobId: string, error: Error): Promise<void>;
	complete(jobId: string, data: Result): Promise<void>;
	getJobById(id: string): Promise<JobWithResult>;
	stop(): Promise<void>;
	hasJobFailedTooManyTimes(job: JobWithData): boolean;
}

export interface ContentStorage {
	store(filepath: string): Promise<string>;
	remove(filepath: string): Promise<void>;
}

export type AppDefinedContext = {
	queue: BaseQueue;
	storage: ContentStorage;
};

export type AppContext = Context & AppDefinedContext;

export type JobWithData = {
	id: string;
	retryCount: number;
	data: JobData;
};

export type OutputError = { stack: string; message: string };
export type OutputSuccess = { result: string };
export type Output = OutputError | OutputSuccess;

export type JobWithResult = {
	id: string;
	completedOn?: Date;
	output?: Output;
	state: string;
};

export enum JobStates {
	Created = 0,
	Retry = 1,
	Active = 2,
	Completed = 3,
	Cancelled = 4,
	Failed = 5,
}

export const jobStateToEnum = (j: JobStates) => {
	switch (j) {
	case 0:
		return 'created';
	case 1:
		return 'retry';
	case 2:
		return 'active';
	case 3:
		return 'completed';
	case 4:
		return 'cancelled';
	case 5:
		return 'failed';
	default:
		throw new Error(`Invalid job state: ${j}`);
	}
};

export interface WorkHandler {
	run(image: string): Promise<string>;
	init(): Promise<void>;
}

export type QueueConfiguration = {
	database: {
		name: string;
		user?: string;
		password?: string;
		port?: number;
		host?: string;
	};
	ttl: number;
	retryCount: number;
	maintenanceInterval: number;
};
