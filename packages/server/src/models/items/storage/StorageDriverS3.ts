import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, ObjectIdentifier, HeadObjectCommand } from '@aws-sdk/client-s3';
import { CustomError, CustomErrorCode } from '../../../utils/errors';
import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import StorageDriverBase from './StorageDriverBase';

function stream2buffer(stream: any): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const buffer: Uint8Array[] = [];
		let hasError = false;

		stream.on('data', (chunk: Uint8Array) => {
			if (hasError) return;
			buffer.push(chunk);
		});

		stream.on('end', () => {
			if (hasError) return;
			resolve(Buffer.concat(buffer));
		});

		stream.on('error', (error: any) => {
			if (hasError) return;
			hasError = true;
			reject(error);
		});
	});
}

export default class StorageDriverS3 extends StorageDriverBase {

	private client_: S3Client;

	public constructor(id: number, config: StorageDriverConfig) {
		super(id, { type: StorageDriverType.S3, ...config });

		this.client_ = new S3Client({
			// We need to set a region. See https://github.com/aws/aws-sdk-js-v3/issues/1845#issuecomment-754832210
			region: this.config.region,
			credentials: {
				accessKeyId: this.config.accessKeyId,
				secretAccessKey: this.config.secretAccessKeyId,
			},
		});
	}

	public async write(itemId: string, content: Buffer): Promise<void> {
		await this.client_.send(new PutObjectCommand({
			Bucket: this.config.bucket,
			Key: itemId,
			Body: content,
		}));
	}

	public async read(itemId: string): Promise<Buffer | null> {
		try {
			const response = await this.client_.send(new GetObjectCommand({
				Bucket: this.config.bucket,
				Key: itemId,
			}));

			return stream2buffer(response.Body);
		} catch (error) {
			if (error?.$metadata?.httpStatusCode === 404) throw new CustomError(`No such item: ${itemId}`, CustomErrorCode.NotFound);
			error.message = `Could not get item "${itemId}": ${error.message}`;
			throw error;
		}
	}

	public async delete(itemId: string | string[]): Promise<void> {
		const itemIds = Array.isArray(itemId) ? itemId : [itemId];

		const objects: ObjectIdentifier[] = itemIds.map(id => {
			return { Key: id };
		});

		await this.client_.send(new DeleteObjectsCommand({
			Bucket: this.config.bucket,
			Delete: {
				Objects: objects,
			},
		}));
	}

	public async exists(itemId: string): Promise<boolean> {
		try {
			await this.client_.send(new HeadObjectCommand({
				Bucket: this.config.bucket,
				Key: itemId,
			}));

			return true;
		} catch (error) {
			if (error?.$metadata?.httpStatusCode === 404) return false;
			error.message = `Could not check if object exists: "${itemId}": ${error.message}`;
			throw error;
		}
	}

}
