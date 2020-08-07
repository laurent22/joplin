const { basicDelta } = require('lib/file-api');
const { basename } = require('lib/path-utils');
const { shim } = require('lib/shim');
const JoplinError = require('lib/JoplinError');

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
		if (!error || typeof error.code !== 'string') return false;
		return error.code.indexOf(errorCode) >= 0;
	}

	// Need to make a custom promise, built-in promise is broken: https://github.com/aws/aws-sdk-js/issues/1436
	async s3GetObject(key) {
		return new Promise((resolve, reject) => {
			this.api().getObject({
				Bucket: this.s3_bucket_,
				Key: key,
			}, (err, response) => {
				if (err) reject(err);
				else resolve(response);
			});
		});
	}

	async s3ListObjects(key, cursor) {
		return new Promise((resolve, reject) => {
			this.api().listObjectsV2({
				Bucket: this.s3_bucket_,
				Prefix: key,
				Delimiter: '/',
				ContinuationToken: cursor,
			}, (err, response) => {
				if (err) reject(err);
				else resolve(response);
			});
		});
	}

	async s3HeadObject(key) {
		return new Promise((resolve, reject) => {
			this.api().headObject({
				Bucket: this.s3_bucket_,
				Key: key,
			}, (err, response) => {
				if (err) reject(err);
				else resolve(response);
			});
		});
	}

	async s3PutObject(key, body) {
		return new Promise((resolve, reject) => {
			this.api().putObject({
				Bucket: this.s3_bucket_,
				Key: key,
				Body: body,
			}, (err, response) => {
				if (err) reject(err);
				else resolve(response);
			});
		});
	}

	async s3UploadFileFrom(path, key) {
		if (!shim.fsDriver().exists(path)) throw new Error('s3UploadFileFrom: file does not exist');
		const body = await shim.fsDriver().readFile(path, 'Buffer');
		return new Promise((resolve, reject) => {
			this.api().upload({
				Bucket: this.s3_bucket_,
				Key: key,
				Body: body,
			}, (err, response) => {
				if (err) reject(err);
				else resolve(response);
			});
		});
	}

	async s3DeleteObject(key) {
		return new Promise((resolve, reject) => {
			this.api().deleteObject({
				Bucket: this.s3_bucket_,
				Key: key,
			},
			(err, response) => {
				if (err) {
					console.log(err.code);
					console.log(err.message);
					reject(err);
				} else { resolve(response); }
			});
		});
	}

	// Assumes key is formatted, like `{Key: 's3 path'}`
	async s3DeleteObjects(keys) {
		return new Promise((resolve, reject) => {
			this.api().deleteObjects({
				Bucket: this.s3_bucket_,
				Delete: { Objects: keys },
			},
			(err, response) => {
				if (err) {
					console.log(err.code);
					console.log(err.message);
					reject(err);
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
			const response = await this.s3GetObject(remotePath);
			output = response.Body;

			if (options.target === 'file') {
				const filePath = options.path;
				if (!filePath) throw new Error('get: target options.path is missing');

				// TODO: check if this ever hits on RN
				await shim.fsDriver().writeBinaryFile(filePath, output);
				return {
					ok: true,
					path: filePath,
					text: () => {
						return response.statusMessage;
					},
					json: () => {
						return { message: `${response.statusCode}: ${response.statusMessage}` };
					},
					status: response.statusCode,
					headers: response.headers,
				};
			}

			if (responseFormat === 'text') {
				output = output.toString();
			}

			return output;
		} catch (error) {
			if (this.hasErrorCode_(error, 'NoSuchKey')) {
				return null;
			} else if (this.hasErrorCode_(error, 'AccessDenied')) {
				throw new JoplinError('Do not have proper permissions to Bucket', 'rejectedByTarget');
			} else {
				throw error;
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
			this.api().copyObject({
				Bucket: this.s3_bucket_,
				CopySource: this.makePath_(oldPath),
				Key: newPath,
			},(err, response) => {
				if (err) reject(err);
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
				return this.api().listObjectsV2({
					Bucket: this.s3_bucket_,
					ContinuationToken: cursor,
				}, (err, response) => {
					if (err) reject(err);
					else resolve(response);
				});
			});
		};

		let response = await listRecursive();
		let keys = response.Contents.map((content) => content.Key);

		while (response.IsTruncated) {
			response = await listRecursive(response.NextContinuationToken);
			keys = keys.concat(response.Contents.map((content) => content.Key));
		}

		this.batchDeletes(keys);
	}
}

module.exports = { FileApiDriverAmazonS3 };
