/* eslint-disable @typescript-eslint/no-explicit-any */
import { basicDelta } from './file-api';
import { basename } from './path-utils';
import shim from './shim';
import JoplinError from './JoplinError';
import { Buffer } from 'buffer';
import { GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const parser = require('fast-xml-parser');

const S3_MAX_DELETES = 1000;

export default class FileApiDriverAmazonS3 {
	private s3_bucket_: string;
	private api_: any;

	public constructor(api: any, s3_bucket: string) {
		this.s3_bucket_ = s3_bucket;
		this.api_ = api;
	}

	public api() {
		return this.api_;
	}

	public requestRepeatCount() {
		return 3;
	}

	private makePath_(path: string) {
		if (!path) return '';
		return path;
	}

	private hasErrorCode_(error: any, errorCode: string) {
		if (!error) return false;

		if (error.name) {
			return error.name.indexOf(errorCode) >= 0;
		} else if (error.code) {
			return error.code.indexOf(errorCode) >= 0;
		} else if (error.Code) {
			return error.Code.indexOf(errorCode) >= 0;
		} else {
			return false;
		}
	}

	// Because of the way AWS-SDK-v3 works for getting data from a bucket we will
	// use a pre-signed URL to avoid https://github.com/aws/aws-sdk-js-v3/issues/1877
	public async s3GenerateGetURL(key: string) {
		const signedUrl = await getSignedUrl(this.api(), new GetObjectCommand({
			Bucket: this.s3_bucket_,
			Key: key,
		}), {
			expiresIn: 3600,
		});
		return signedUrl;
	}

	public async s3ListObjects(key: string, cursor: string = null) {
		return new Promise<any>((resolve, reject) => {
			this.api().send(new ListObjectsV2Command({
				Bucket: this.s3_bucket_,
				Prefix: key,
				Delimiter: '/',
				ContinuationToken: cursor,
			}), (error: any, response: any) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}

	public async s3HeadObject(key: string) {
		return new Promise<any>((resolve, reject) => {
			this.api().send(new HeadObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
			}), (error: any, response: any) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}

	public async s3PutObject(key: string, body: any) {
		return new Promise<any>((resolve, reject) => {
			this.api().send(new PutObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
				Body: body,
			}), (error: any, response: any) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}

	public async s3UploadFileFrom(path: string, key: string) {
		if (!(await shim.fsDriver().exists(path))) throw new Error('s3UploadFileFrom: file does not exist');
		const body = await shim.fsDriver().readFile(path, 'base64');
		const fileStat = await shim.fsDriver().stat(path);
		return new Promise<any>((resolve, reject) => {
			this.api().send(new PutObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
				Body: Buffer.from(body, 'base64'),
				ContentLength: fileStat.size,
			}), (error: any, response: any) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}

	public async s3DeleteObject(key: string) {
		return new Promise<any>((resolve, reject) => {
			this.api().send(new DeleteObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
			}),
			(error: any, response: any) => {
				if (error) {
					console.error(error);
					reject(error);
				} else { resolve(response); }
			});
		});
	}

	// Assumes key is formatted, like `{Key: 's3 path'}`
	public async s3DeleteObjects(keys: any[]) {
		return new Promise<any>((resolve, reject) => {
			this.api().send(new DeleteObjectsCommand({
				Bucket: this.s3_bucket_,
				Delete: { Objects: keys },
			}),
			(error: any, response: any) => {
				if (error) {
					console.error(error);
					reject(error);
				} else { resolve(response); }
			});
		});
	}

	public async stat(path: string) {
		try {
			const metadata = await this.s3HeadObject(this.makePath_(path));

			return this.metadataToStat_(metadata, path);
		} catch (error) {
			if (this.hasErrorCode_(error, 'NotFound')) {
				// ignore
			} else {
				throw error;
			}
		}
		return null;
	}

	private metadataToStat_(md: any, path: string) {
		const relativePath = basename(path);
		const lastModifiedDate = md['LastModified'] ? new Date(md['LastModified']) : new Date();

		const output = {
			path: relativePath,
			updated_time: lastModifiedDate.getTime(),
			isDeleted: !!md['DeleteMarker'],
			isDir: false,
		};

		return output;
	}

	private metadataToStats_(mds: any[]) {
		if (!mds) return [];

		const output = [];
		for (let i = 0; i < mds.length; i++) {
			output.push(this.metadataToStat_(mds[i], mds[i].Key));
		}
		return output;
	}

	public async setTimestamp() {
		throw new Error('Not implemented'); // Not needed anymore
	}

	public async delta(path: string, options: any) {
		const getDirStats = async (path: string) => {
			const result = await this.list(path);
			return result.items;
		};

		return await basicDelta(path, getDirStats, options);
	}

	public async list(path: string) {
		let prefixPath = this.makePath_(path);
		const pathLen = prefixPath.length;
		if (pathLen > 0 && prefixPath[pathLen - 1] !== '/') {
			prefixPath = `${prefixPath}/`;
		}

		this.api().config.systemClockOffset = 0;

		let response = await this.s3ListObjects(prefixPath);

		let output = this.metadataToStats_(response.Contents);

		while (response.IsTruncated) {
			response = await this.s3ListObjects(prefixPath, response.NextContinuationToken);

			output = output.concat(this.metadataToStats_(response.Contents));
		}

		return {
			items: output,
			hasMore: false,
			context: { cursor: response.NextContinuationToken },
		};
	}

	public async get(path: string, options: any) {
		const remotePath = this.makePath_(path);
		if (!options) options = {};
		const responseFormat = options.responseFormat || 'text';

		try {
			let output: any = null;
			let response: any = null;

			const s3Url = await this.s3GenerateGetURL(remotePath);

			if (options.target === 'file') {
				output = await shim.fetchBlob(s3Url, options);
			} else if (responseFormat === 'text') {
				response = await shim.fetch(s3Url, options);

				output = await response.text();
				// we need to make sure that errors get thrown as we are manually fetching above.
				if (!response.ok) {
					// eslint-disable-next-line no-throw-literal
					throw { name: response.statusText, output: output };
				}
			}

			return output;
		} catch (error) {
			if ((error as any).name === 'FetchError') { throw (error as any).message; }

			let parsedOutput: any = '';

			if ((error as any).output) {
				parsedOutput = parser.parse((error as any).output);
				if (this.hasErrorCode_(parsedOutput.Error, 'AuthorizationHeaderMalformed')) {
					throw (error as any).output;
				}

				if (this.hasErrorCode_(parsedOutput.Error, 'NoSuchKey')) {
					return null;
				} else if (this.hasErrorCode_(parsedOutput.Error, 'AccessDenied')) {
					throw new JoplinError('Do not have proper permissions to Bucket', 'rejectedByTarget');
				}
			} else {
				if ((error as any).output) {
					throw (error as any).output;
				} else {
					throw error;
				}
			}
		}
		return null;
	}

	public async mkdir() {
		return true;
	}

	public async put(path: string, content: any, options: any = null) {
		const remotePath = this.makePath_(path);
		if (!options) options = {};

		try {
			if (options.source === 'file') {
				await this.s3UploadFileFrom(options.path, remotePath);
				return;
			}

			await this.s3PutObject(remotePath, content);
		} catch (error) {
			if (this.hasErrorCode_(error, 'AccessDenied')) {
				throw new JoplinError('Do not have proper permissions to Bucket', 'rejectedByTarget');
			} else {
				throw error;
			}
		}
	}

	public async delete(path: string) {
		try {
			await this.s3DeleteObject(this.makePath_(path));
		} catch (error) {
			if (this.hasErrorCode_(error, 'NoSuchKey')) {
				// ignore
			} else {
				throw error;
			}
		}
	}

	public async batchDeletes(paths: string[]) {
		const keys = paths.map(path => { return { Key: path }; });
		while (keys.length > 0) {
			const toDelete = keys.splice(0, S3_MAX_DELETES);

			try {
				await this.s3DeleteObjects(toDelete);
			} catch (error) {
				if (this.hasErrorCode_(error, 'NoSuchKey')) {
					// ignore
				} else {
					throw error;
				}
			}
		}
	}

	public async move(oldPath: string, newPath: string) {
		const req = new Promise<any>((resolve, reject) => {
			this.api().send(new CopyObjectCommand({
				Bucket: this.s3_bucket_,
				CopySource: this.makePath_(oldPath),
				Key: newPath,
			}), (error: any, response: any) => {
				if (error) reject(error);
				else resolve(response);
			});
		});

		try {
			await req;

			await this.delete(oldPath);
		} catch (error) {
			if (this.hasErrorCode_(error, 'NoSuchKey')) {
				// ignore
			} else {
				throw error;
			}
		}
	}

	public format() {
		throw new Error('Not supported');
	}

	public async clearRoot() {
		const listRecursive = async (cursor: string = null) => {
			return new Promise<any>((resolve, reject) => {
				return this.api().send(new ListObjectsV2Command({
					Bucket: this.s3_bucket_,
					ContinuationToken: cursor,
				}), (error: any, response: any) => {
					if (error) reject(error);
					else resolve(response);
				});
			});
		};

		let response = await listRecursive();
		if (response.Contents === undefined) response.Contents = [];
		let keys = response.Contents.map((content: any) => content.Key);

		while (response.IsTruncated) {
			response = await listRecursive(response.NextContinuationToken);
			keys = keys.concat(response.Contents.map((content: any) => content.Key));
		}

		await this.batchDeletes(keys);
	}
}
