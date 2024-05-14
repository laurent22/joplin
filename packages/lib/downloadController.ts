import Logger from '@joplin/utils/Logger';
import JoplinError from './JoplinError';
import { ErrorCode } from './errors';
import { bytesToHuman } from '@joplin/utils/bytes';

const logger = Logger.create('downloadController');

export interface DownloadController {
	totalBytes: number;
	imagesCount: number;
	maxImagesCount: number;
	imageCountExpected: number;
	printStats(imagesCountExpected: number): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	handleChunk(request: any, url: string): (chunk: any)=> void;
	limitMessage(): string;
}

export class LimitedDownloadController implements DownloadController {
	private totalBytes_ = 0;
	// counts before the downloaded has finished, so at the end if the totalBytes > maxTotalBytesAllowed
	// it means that imageCount will be higher than the total downloaded during the process
	private imagesCount_ = 0;
	// how many images links the content has
	private imageCountExpected_ = 0;
	private largeImageBytes = Number.POSITIVE_INFINITY;
	private requestId = '';

	private maxTotalBytes = 0;
	public readonly maxImagesCount: number;
	private ownerId = '';
	private bytesPerUrl: { [url: string]: number } = {};

	public constructor(ownerId: string, maxTotalBytes: number, maxImagesCount: number, largeImageBytes: number, requestId: string) {
		this.ownerId = ownerId;
		this.maxTotalBytes = maxTotalBytes;
		this.maxImagesCount = maxImagesCount;
		this.largeImageBytes = largeImageBytes;
		this.requestId = requestId;
	}

	public set totalBytes(value: number) {
		if (this.totalBytes_ >= this.maxTotalBytes) {
			throw new JoplinError(`${this.requestId}: Total bytes stored (${this.totalBytes_}) has exceeded the amount established (${this.maxTotalBytes})`, ErrorCode.DownloadLimiter);
		}
		this.totalBytes_ = value;
	}

	public get totalBytes() {
		return this.totalBytes_;
	}

	public set imagesCount(value: number) {
		if (this.imagesCount_ > this.maxImagesCount) {
			throw new JoplinError(`${this.requestId}: Total images to be stored (${this.imagesCount_}) has exceeded the amount established (${this.maxImagesCount})`, ErrorCode.DownloadLimiter);
		}
		this.imagesCount_ = value;
	}

	public get imagesCount() {
		return this.imagesCount_;
	}

	public set imageCountExpected(value: number) {
		this.imageCountExpected_ = value;
	}

	public get imageCountExpected() {
		return this.imageCountExpected_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public handleChunk(request: any, url: string) {
		this.bytesPerUrl[url] = 0;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return (chunk: any) => {
			try {
				this.bytesPerUrl[url] += chunk.length;
				this.totalBytes += chunk.length;
			} catch (error) {
				request.destroy(error);
			}
		};
	}

	public printStats() {
		const largeImages = Object.entries(this.bytesPerUrl).filter(e => e[1] > this.largeImageBytes);
		for (const image of largeImages) {
			const [url, bytes] = image;
			logger.info(`${this.requestId}: Large image found: ${url} - ${bytesToHuman(bytes)}`);
		}
		const owner = `User: ${this.ownerId}`;
		const totalBytes = `Total downloaded: ${bytesToHuman(this.totalBytes)}. Maximum: ${bytesToHuman(this.maxTotalBytes)}`;
		const totalImages = `Images initiated for download: ${this.imagesCount_}. Maximum: ${this.maxImagesCount}. Expected: ${this.imageCountExpected}`;
		logger.info(`${this.requestId}: ${owner}`);
		logger.info(`${this.requestId}: ${totalBytes}`);
		logger.info(`${this.requestId}: ${totalImages}`);
	}

	public limitMessage() {
		if (this.imagesCount_ > this.maxImagesCount) {
			return `The maximum image count of ${this.maxImagesCount} has been exceeded. Image count in your content: ${this.imageCountExpected}`;
		}
		if (this.totalBytes >= this.maxTotalBytes) {
			return `The maximum content size ${bytesToHuman(this.maxTotalBytes)} has been exceeded. Content size: (${bytesToHuman(this.totalBytes)})`;
		}
		return '';
	}
}
