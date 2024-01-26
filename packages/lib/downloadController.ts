import Logger from '@joplin/utils/Logger';
import JoplinError from './JoplinError';
import { ErrorCode } from './errors';

const logger = Logger.create('downloadController');

export interface DownloadController {
	totalBytes: number;
	imagesCount: number;
	imageCountExpected: number;
	printStats(imagesCountExpected: number): void;
	handleNewChunk(request: any): (chunk: any)=> void;
	limitMessage(): string;
}

export class DummyDownloadController implements DownloadController {
	public totalBytes = 0;
	public imagesCount = 0;
	public imageCountExpected = 0;
	public printStats(): void {}
	public handleNewChunk() { return () => {}; }
	public limitMessage() { return ''; }
}

export class LimitedDownloadController implements DownloadController {
	private totalBytes_ = 0;
	// counts before the downloaded has finished, so at the end if the totalBytes > maxTotalBytesAllowed
	// it means that imageCount will be higher than the total download during the process
	private imagesCount_ = 0;
	// how many images links the email has
	private imageCountExpected_ = 0;
	private isLimitExceeded_ = false;

	private maxTotalBytes = 0;
	private maxImagesCount = 0;
	private ownerId = '';

	public constructor(ownerId: string, maxTotalBytes: number, maxImagesCount: number) {
		this.ownerId = ownerId;
		this.maxTotalBytes = maxTotalBytes;
		this.maxImagesCount = maxImagesCount;
	}

	public set totalBytes(value: number) {
		if (this.totalBytes_ >= this.maxTotalBytes) {
			throw new JoplinError(`Total bytes stored (${this.totalBytes_}) has exceeded the amount established (${this.maxTotalBytes})`, ErrorCode.DownloadLimiter);
		}
		this.totalBytes_ = value;
	}

	public get totalBytes() {
		return this.totalBytes_;
	}

	public set imagesCount(value: number) {
		if (this.imagesCount_ > this.maxImagesCount) {
			throw new JoplinError(`Total images to be stored (${this.imagesCount_}) has exceeded the amount established (${this.maxImagesCount})`, ErrorCode.DownloadLimiter);
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

	public handleNewChunk(request: any) {
		return (chunk: any) => {
			try {
				this.totalBytes += chunk.length;
			} catch (error) {
				request.destroy(error);
			}
		};
	}

	public printStats() {
		if (!this.isLimitExceeded_) return;

		const owner = `Owner id: ${this.ownerId}`;
		const totalBytes = `Total bytes stored: ${this.totalBytes}. Maximum: ${this.maxTotalBytes}`;
		const totalImages = `Images initiated for download: ${this.imagesCount_}. Maximum: ${this.maxImagesCount}. Expected: ${this.imageCountExpected}`;
		logger.info(`${owner} - ${totalBytes} - ${totalImages}`);
	}

	private bytesToHuman(bytes: number) {
		const units = ['Bytes', 'KB', 'MB', 'GB'];
		let unitIndex = 0;

		while (bytes >= 1024 && unitIndex < units.length - 1) {
			bytes /= 1024;
			unitIndex++;
		}

		return `${bytes.toFixed(1)} ${units[unitIndex]}`;
	}

	public limitMessage() {
		if (this.imagesCount_ > this.maxImagesCount) {
			return `Your email has ${this.imageCountExpected} images, exceeding the limit of ${this.maxImagesCount}.`;
		}
		if (this.totalBytes >= this.maxTotalBytes) {
			return `The size of your email (${this.bytesToHuman(this.totalBytes)}) was larger than the allowed limit (${this.bytesToHuman(this.maxTotalBytes)}).`;
		}
		return '';
	}
}
