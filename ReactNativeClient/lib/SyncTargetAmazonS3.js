const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApiDriverAmazonS3 } = require('lib/file-api-driver-amazon-s3.js');
const S3 = require('aws-sdk/clients/s3');

class SyncTargetAmazonS3 extends BaseSyncTarget {
	static id() {
		return 8;
	}

	static supportsConfigCheck() {
		return true;
	}

	constructor(db, options = null) {
		super(db, options);
		this.api_ = null;
	}

	static targetName() {
		return 'amazon_s3';
	}

	static label() {
		return `${_('AWS S3')} (Beta)`;
	}

	async isAuthenticated() {
		return true;
	}

	static s3BucketName() {
		return Setting.value('sync.8.path');
	}

	s3AuthParameters() {
		return {
			accessKeyId: Setting.value('sync.8.username'),
			secretAccessKey: Setting.value('sync.8.password'),
			s3UseArnRegion: true, // override the request region with the region inferred from requested resource's ARN
		};
	}

	api() {
		if (this.api_) return this.api_;

		this.api_ = new S3(this.s3AuthParameters());
		return this.api_;
	}

	static async newFileApi_(syncTargetId, options) {
		const apiOptions = {
			accessKeyId: options.username(),
			secretAccessKey: options.password(),
			s3UseArnRegion: true,
		};

		const api = new S3(apiOptions);
		const driver = new FileApiDriverAmazonS3(api, SyncTargetAmazonS3.s3BucketName());
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(syncTargetId);
		return fileApi;
	}

	static async checkConfig(options) {
		const fileApi = await SyncTargetAmazonS3.newFileApi_(SyncTargetAmazonS3.id(), options);
		fileApi.requestRepeatCount_ = 0;

		const output = {
			ok: false,
			errorMessage: '',
		};

		try {
			const headBucketReq = new Promise((resolve, reject) => {
				fileApi.driver().api().headBucket({
					Bucket: options.path(),
				},(err, response) => {
					if (err) reject(err);
					else resolve(response);
				});
			});
			const result = await headBucketReq;
			if (!result) throw new Error(`AWS S3 bucket not found: ${SyncTargetAmazonS3.s3BucketName()}`);
			output.ok = true;
		} catch (error) {
			output.errorMessage = error.message;
			if (error.code) output.errorMessage += ` (Code ${error.code})`;
		}

		return output;
	}

	async initFileApi() {
		const appDir = '';
		const fileApi = new FileApi(appDir, new FileApiDriverAmazonS3(this.api(), SyncTargetAmazonS3.s3BucketName()));
		fileApi.setSyncTargetId(SyncTargetAmazonS3.id());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetAmazonS3;
