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
		return _('S3');
	}

	static description() {
		return 'A service offered by Amazon Web Services (AWS) that provides object storage through a web service interface.';
	}

	async isAuthenticated() {
		return true;
	}

	static requiresPassword() {
		return true;
	}

	static s3BucketName() {
		return Setting.value('sync.8.path');
	}

	// These are the settings that get read from disk to instantiate the API.
	s3AuthParameters() {
		return {
			// We need to set a region. See https://github.com/aws/aws-sdk-js-v3/issues/1845#issuecomment-754832210
			region: Setting.value('sync.8.region'),
			credentials: {
				accessKeyId: Setting.value('sync.8.username'),
				secretAccessKey: Setting.value('sync.8.password'),
			},
			UseArnRegion: true, // override the request region with the region inferred from requested resource's ARN.
			forcePathStyle: Setting.value('sync.8.forcePathStyle'), // Older implementations may not support more modern access, so we expose this to allow people the option to toggle.
			endpoint: Setting.value('sync.8.url'),
			ignoreTlsErrors: Setting.value('net.ignoreTlsErrors'),
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
		// These options are read from the form on the page
		// so we can test new config choices without overriding the current settings.
		const apiOptions = {
			region: options.region(),
			credentials: {
				accessKeyId: options.username(),
				secretAccessKey: options.password(),
			},
			UseArnRegion: true, // override the request region with the region inferred from requested resource's ARN.
			forcePathStyle: options.forcePathStyle(),
			endpoint: options.url(),
			ignoreTlsErrors: options.ignoreTlsErrors(),
		};

		const api = new S3Client(apiOptions);
		const driver = new FileApiDriverAmazonS3(api, SyncTargetAmazonS3.s3BucketName());
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(syncTargetId);
		return fileApi;
	}

	// With the aws-sdk-v3-js some errors (301/403) won't get their XML parsed properly.
	// I think it's this issue: https://github.com/aws/aws-sdk-js-v3/issues/1596
	// If you save the config on desktop, restart the app and attempt a sync, we should get a clearer error message because the sync logic has more robust XML error parsing.
	// We could implement that here, but the above workaround saves some code.

	static async checkConfig(options) {
		const output = {
			ok: false,
			errorMessage: '',
		};
		try {
			const fileApi = await SyncTargetAmazonS3.newFileApi_(SyncTargetAmazonS3.id(), options);
			fileApi.requestRepeatCount_ = 0;

			const headBucketReq = new Promise((resolve, reject) => {
				fileApi.driver().api().send(

					new HeadBucketCommand({
						Bucket: options.path(),
					}), (error, response) => {
						if (error) reject(error);
						else resolve(response);
					});
			});
			const result = await headBucketReq;

			if (!result) throw new Error(`AWS S3 bucket not found: ${SyncTargetAmazonS3.s3BucketName()}`);
			output.ok = true;
		} catch (error) {
			if (error.message) {
				output.errorMessage = error.message;
			}
			if (error.code) {
				output.errorMessage += ` (Code ${error.code})`;
			}
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
