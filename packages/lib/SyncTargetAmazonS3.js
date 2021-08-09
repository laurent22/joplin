const BaseSyncTarget = require('./BaseSyncTarget').default;
const { _ } = require('./locale');
const Setting = require('./models/Setting').default;
const { FileApi } = require('./file-api.js');
const Synchronizer = require('./Synchronizer').default;
const { FileApiDriverAmazonS3 } = require('./file-api-driver-amazon-s3.js');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');

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
			// We need to set a region. See https://github.com/aws/aws-sdk-js-v3/issues/1845#issuecomment-754832210
			region: 'us-east-1',
			credentials: {
				accessKeyId: Setting.value('sync.8.username'),
				secretAccessKey: Setting.value('sync.8.password'),
			},
			UseArnRegion: true, // override the request region with the region inferred from requested resource's ARN
			forcePathStyle: true,
			endpoint: Setting.value('sync.8.url'),
		};
	}

	api() {
		if (this.api_) return this.api_;

		this.api_ = new S3Client(this.s3AuthParameters());

		// There is a bug with auto skew correction in aws-sdk-js-v3
		// and this attempts to remove the skew correction for all calls.
		// There are some additional spots in the app where we reset this
		// to zero as well as it appears the skew logic gets triggered
		// which makes "RequestTimeTooSkewed" errors...
		// See https://github.com/aws/aws-sdk-js-v3/issues/2208
		this.api_.config.systemClockOffset = 0;
		return this.api_;
	}

	static async newFileApi_(syncTargetId, options) {
		const apiOptions = {
			region: 'us-east-1',
			credentials: {
				accessKeyId: options.username(),
				secretAccessKey: options.password(),
			},
			UseArnRegion: true, // override the request region with the region inferred from requested resource's ARN
			forcePathStyle: true,
			endpoint: options.url(),
		};

		const api = new S3Client(apiOptions);
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
				fileApi.driver().api().send(

					new HeadBucketCommand({
						Bucket: options.path(),
					}),(err, response) => {
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
