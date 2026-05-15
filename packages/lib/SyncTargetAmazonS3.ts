import BaseSyncTarget from './BaseSyncTarget';
import { _ } from './locale';
import Setting from './models/Setting';
import { FileApi } from './file-api';
import Synchronizer from './Synchronizer';
import FileApiDriverAmazonS3 from './file-api-driver-amazon-s3';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

export default class SyncTargetAmazonS3 extends BaseSyncTarget {
	private api_: any;

	public static id() {
		return 8;
	}

	public static supportsConfigCheck() {
		return true;
	}

	public constructor(db: any, options: any = null) {
		super(db, options);
		this.api_ = null;
	}

	public static targetName() {
		return 'amazon_s3';
	}

	public static label() {
		return _('S3');
	}

	public static description() {
		return 'A service offered by Amazon Web Services (AWS) that provides object storage through a web service interface.';
	}

	public async isAuthenticated() {
		return true;
	}

	public static requiresPassword() {
		return true;
	}

	public static s3BucketName() {
		return Setting.value('sync.8.path');
	}

	// These are the settings that get read from disk to instantiate the API.
	public s3AuthParameters() {
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

	public api() {
		if (this.api_) return this.api_;

		this.api_ = new S3Client(this.s3AuthParameters() as any);

		// There is a bug with auto skew correction in aws-sdk-js-v3
		// and this attempts to remove the skew correction for all calls.
		// There are some additional spots in the app where we reset this
		// to zero as well as it appears the skew logic gets triggered
		// which makes "RequestTimeTooSkewed" errors...
		// See https://github.com/aws/aws-sdk-js-v3/issues/2208
		this.api_.config.systemClockOffset = 0;

		return this.api_;
	}

	public static async newFileApi_(syncTargetId: number, options: any) {
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

	public static async checkConfig(options: any) {
		const output = {
			ok: false,
			errorMessage: '',
		};
		try {
			const fileApi = await SyncTargetAmazonS3.newFileApi_(SyncTargetAmazonS3.id(), options);
			(fileApi as any).requestRepeatCount_ = 0;

			const headBucketReq = new Promise((resolve, reject) => {
				(fileApi.driver() as any).api().send(

					new HeadBucketCommand({
						Bucket: options.path(),
					}), (error: any, response: any) => {
						if (error) reject(error);
						else resolve(response);
					});
			});
			const result = await headBucketReq;

			if (!result) throw new Error(`AWS S3 bucket not found: ${SyncTargetAmazonS3.s3BucketName()}`);
			output.ok = true;
		} catch (error) {
			if ((error as Error).message) {
				output.errorMessage = (error as Error).message;
			}
			if ((error as any).code) {
				output.errorMessage += ` (Code ${(error as any).code})`;
			}
		}

		return output;
	}

	public async initFileApi() {
		const appDir = '';
		const fileApi = new FileApi(appDir, new FileApiDriverAmazonS3(this.api(), SyncTargetAmazonS3.s3BucketName()));
		fileApi.setSyncTargetId(SyncTargetAmazonS3.id());

		return fileApi;
	}

	public async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
