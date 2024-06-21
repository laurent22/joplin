const { basicDelta } = require('./file-api');
const { basename } = require('./path-utils');
const shim = require('./shim').default;
const JoplinError = require('./JoplinError').default;
const { Buffer } = require('buffer');
const { GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const parser = require('fast-xml-parser');

const S3_MAX_DELETES = 1000;

class FileApiDriverAmazonS3 {
	constructor(api, s3_bucket) {
		this.s3_bucket_ = s3_bucket;
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	requestRepeatCount() {
		return 3;
	}

	makePath_(path) {
		if (!path) return '';
		return path;
	}

	hasErrorCode_(error, errorCode) {
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
	async s3GenerateGetURL(key) {
		const signedUrl = await getSignedUrl(this.api(), new GetObjectCommand({
			Bucket: this.s3_bucket_,
			Key: key,
		}), {
			expiresIn: 3600,
		});
		return signedUrl;
	}


	// We've now moved to aws-sdk-v3 and this note is outdated, but explains the promise structure.
	// Need to make a custom promise, built-in promise is broken: https://github.com/aws/aws-sdk-js/issues/1436
	// TODO: Re-factor to https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-s3#asyncawait
	async s3ListObjects(key, cursor) {
		return new Promise((resolve, reject) => {
			this.api().send(new ListObjectsV2Command({
				Bucket: this.s3_bucket_,
				Prefix: key,
				Delimiter: '/',
				ContinuationToken: cursor,
			}), (error, response) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}


	async s3HeadObject(key) {
		return new Promise((resolve, reject) => {
			this.api().send(new HeadObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
			}), (error, response) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}

	async s3PutObject(key, body) {
		return new Promise((resolve, reject) => {
			this.api().send(new PutObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
				Body: body,
			}), (error, response) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}

	async s3UploadFileFrom(path, key) {
		if (!shim.fsDriver().exists(path)) throw new Error('s3UploadFileFrom: file does not exist');
		const body = await shim.fsDriver().readFile(path, 'base64');
		const fileStat = await shim.fsDriver().stat(path);
		return new Promise((resolve, reject) => {
			this.api().send(new PutObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
				Body: Buffer.from(body, 'base64'),
				ContentLength: `${fileStat.size}`,
			}), (error, response) => {
				if (error) reject(error);
				else resolve(response);
			});
		});
	}

	async s3DeleteObject(key) {
		return new Promise((resolve, reject) => {
			this.api().send(new DeleteObjectCommand({
				Bucket: this.s3_bucket_,
				Key: key,
			}),
			(error, response) => {
				if (error) {
					console.error(error);
					reject(error);
				} else { resolve(response); }
			});
		});
	}

	// Assumes key is formatted, like `{Key: 's3 path'}`
	async s3DeleteObjects(keys) {
		return new Promise((resolve, reject) => {
			this.api().send(new DeleteObjectsCommand({
				Bucket: this.s3_bucket_,
				Delete: { Objects: keys },
			}),
			(error, response) => {
				if (error) {
					console.error(error);
					reject(error);
				} else { resolve(response); }
			});
		});
	}

	async stat(path) {
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
	}

	metadataToStat_(md, path) {
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

	metadataToStats_(mds) {
		// aws-sdk-js-v3 can rerturn undefined instead of an empty array when there is
		// no metadata in some cases.
		//
		// Thus, we handle the !mds case.
		if (!mds) return [];

		const output = [];
		for (let i = 0; i < mds.length; i++) {
			output.push(this.metadataToStat_(mds[i], mds[i].Key));
		}
		return output;
	}

	async setTimestamp() {
		throw new Error('Not implemented'); // Not needed anymore
	}

	async delta(path, options) {
		const getDirStats = async path => {
			const result = await this.list(path);
			return result.items;
		};

		return await basicDelta(path, getDirStats, options);
	}

	async list(path) {
		let prefixPath = this.makePath_(path);
		const pathLen = prefixPath.length;
		if (pathLen > 0 && prefixPath[pathLen - 1] !== '/') {
			prefixPath = `${prefixPath}/`;
		}

		// There is a bug/quirk of aws-sdk-js-v3 which causes the
		// S3Client systemClockOffset to be wildly inaccurate. This
		// effectively removes the offset and sets it to system time.
		// See https://github.com/aws/aws-sdk-js-v3/issues/2208 for more.
		// If the user's time actaully off, then this should correctly
		// result in a RequestTimeTooSkewed error from s3ListObjects.
		this.api().config.systemClockOffset = 0;

		let response = await this.s3ListObjects(prefixPath);

		let output = this.metadataToStats_(response.Contents, prefixPath);

		while (response.IsTruncated) {
			response = await this.s3ListObjects(prefixPath, response.NextContinuationToken);

			output = output.concat(this.metadataToStats_(response.Contents, prefixPath));
		}

		return {
			items: output,
			hasMore: false,
			context: { cursor: response.NextContinuationToken },
		};
	}

	async get(path, options) {
		const remotePath = this.makePath_(path);
		if (!options) options = {};
		const responseFormat = options.responseFormat || 'text';

		try {
			let output = null;
			let response = null;

			const s3Url = await this.s3GenerateGetURL(remotePath);

			if (options.target === 'file') {
				output = await shim.fetchBlob(s3Url, options);
			} else if (responseFormat === 'text') {
				response = await shim.fetch(s3Url, options);

				output = await response.text();
				// we need to make sure that errors get thrown as we are manually fetching above.
				if (!response.ok) {
					// eslint-disable-next-line no-throw-literal -- Old code before rule was applied
					throw { name: response.statusText, output: output };
				}
			}

			return output;
		} catch (error) {

			// This means that the error was on the Desktop client side and we need to handle that.
			// On Mobile it won't match because FetchError is a node-fetch feature.
			// https://github.com/node-fetch/node-fetch/blob/main/docs/ERROR-HANDLING.md
			if (error.name === 'FetchError') { throw error.message; }

			let parsedOutput = '';

			// If error.output is not xml the last else case should
			// actually let us see the output of error.
			if (error.output) {
				parsedOutput = parser.parse(error.output);
				if (this.hasErrorCode_(parsedOutput.Error, 'AuthorizationHeaderMalformed')) {
					throw error.output;
				}

				if (this.hasErrorCode_(parsedOutput.Error, 'NoSuchKey')) {
					return null;
				} else if (this.hasErrorCode_(parsedOutput.Error, 'AccessDenied')) {
					throw new JoplinError('Do not have proper permissions to Bucket', 'rejectedByTarget');
				}
			} else {
				if (error.output) {
					throw error.output;
				} else {
					throw error;
				}
			}
		}
	}

	// Don't need to make directories, S3 is key based storage.
	async mkdir() {
		return true;
	}

	async put(path, content, options = null) {
		const remotePath = this.makePath_(path);
		if (!options) options = {};

		// See https://github.com/facebook/react-native/issues/14445#issuecomment-352965210
		if (typeof content === 'string') content = shim.Buffer.from(content, 'utf8');

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

	async delete(path) {
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

	async batchDeletes(paths) {
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


	async move(oldPath, newPath) {
		const req = new Promise((resolve, reject) => {
			this.api().send(new CopyObjectCommand({
				Bucket: this.s3_bucket_,
				CopySource: this.makePath_(oldPath),
				Key: newPath,
			}), (error, response) => {
				if (error) reject(error);
				else resolve(response);
			});
		});

		try {
			await req;

			this.delete(oldPath);
		} catch (error) {
			if (this.hasErrorCode_(error, 'NoSuchKey')) {
				// ignore
			} else {
				throw error;
			}
		}
	}


	format() {
		throw new Error('Not supported');
	}

	async clearRoot() {
		const listRecursive = async (cursor) => {
			return new Promise((resolve, reject) => {
				return this.api().send(new ListObjectsV2Command({
					Bucket: this.s3_bucket_,
					ContinuationToken: cursor,
				}), (error, response) => {
					if (error) reject(error);
					else resolve(response);
				});
			});
		};

		let response = await listRecursive();
		// In aws-sdk-js-v3 if there are no contents it no longer returns
		// an empty array. This creates an Empty array to pass onward.
		if (response.Contents === undefined) response.Contents = [];
		let keys = response.Contents.map((content) => content.Key);

		while (response.IsTruncated) {
			response = await listRecursive(response.NextContinuationToken);
			keys = keys.concat(response.Contents.map((content) => content.Key));
		}

		this.batchDeletes(keys);
	}
}

module.exports = { FileApiDriverAmazonS3 };
