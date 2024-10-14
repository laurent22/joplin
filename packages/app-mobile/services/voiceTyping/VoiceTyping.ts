import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { PermissionsAndroid, Platform } from 'react-native';
import { unzip } from 'react-native-zip-archive';
const md5 = require('md5');

const logger = Logger.create('voiceTyping');

export type OnTextCallback = (text: string)=> void;

export interface SpeechToTextCallbacks {
	// Called with a block of text that might change in the future
	onPreview: OnTextCallback;
	// Called with text that will not change and should be added to the document
	onFinalize: OnTextCallback;
}

export interface VoiceTypingSession {
	start(): Promise<void>;
	stop(): Promise<void>;
}

export interface BuildProviderOptions {
	locale: string;
	modelPath: string;
	callbacks: SpeechToTextCallbacks;
}

export interface VoiceTypingProvider {
	modelName: string;
	supported(): boolean;
	modelLocalFilepath(locale: string): string;
	getDownloadUrl(locale: string): string;
	getUuidPath(locale: string): string;
	build(options: BuildProviderOptions): Promise<VoiceTypingSession>;
}

export default class VoiceTyping {
	private provider: VoiceTypingProvider|null = null;
	public constructor(
		private locale: string,
		providers: VoiceTypingProvider[],
	) {
		this.provider = providers.find(p => p.supported()) ?? null;
	}

	public supported() {
		return this.provider !== null;
	}

	private getModelPath() {
		const localFilePath = shim.fsDriver().resolveRelativePathWithinDir(
			shim.fsDriver().getAppDirectoryPath(),
			this.provider.modelLocalFilepath(this.locale),
		);
		if (localFilePath === shim.fsDriver().getAppDirectoryPath()) {
			throw new Error('Invalid local file path!');
		}

		return localFilePath;
	}

	private getUuidPath() {
		return shim.fsDriver().resolveRelativePathWithinDir(
			shim.fsDriver().getAppDirectoryPath(),
			this.provider.getUuidPath(this.locale),
		);
	}

	public async isDownloaded() {
		return await shim.fsDriver().exists(this.getUuidPath());
	}

	public async download() {
		const modelPath = this.getModelPath();
		const modelUrl = this.provider.getDownloadUrl(this.locale);

		await shim.fsDriver().remove(modelPath);
		logger.info(`Downloading model from: ${modelUrl}`);

		const isZipped = modelUrl.endsWith('.zip');
		const downloadPath = isZipped ? `${modelPath}.zip` : modelPath;
		const response = await shim.fetchBlob(modelUrl, {
			path: downloadPath,
		});

		if (!response.ok || response.status >= 400) throw new Error(`Could not download from ${modelUrl}: Error ${response.status}`);

		if (isZipped) {
			const modelName = this.provider.modelName;
			const unzipDir = `${shim.fsDriver().getCacheDirectoryPath()}/voice-typing-extract/${modelName}/${this.locale}`;
			try {
				logger.info(`Unzipping ${downloadPath} => ${unzipDir}`);

				await unzip(downloadPath, unzipDir);

				const contents = await shim.fsDriver().readDirStats(unzipDir);
				if (contents.length !== 1) {
					logger.error('Expected 1 file or directory but got', contents);
					throw new Error(`Expected 1 file or directory, but got ${contents.length}`);
				}

				const fullUnzipPath = `${unzipDir}/${contents[0].path}`;

				logger.info(`Moving ${fullUnzipPath} => ${modelPath}`);
				await shim.fsDriver().move(fullUnzipPath, modelPath);

				await shim.fsDriver().writeFile(this.getUuidPath(), md5(modelUrl), 'utf8');
				if (!await this.isDownloaded()) {
					logger.warn('Model should be downloaded!');
				}
			} finally {
				await shim.fsDriver().remove(unzipDir);
				await shim.fsDriver().remove(downloadPath);
			}
		}
	}

	public async build(callbacks: SpeechToTextCallbacks) {
		if (!this.provider) {
			throw new Error('No supported provider found!');
		}

		if (!await this.isDownloaded()) {
			await this.download();
		}

		const audioPermission = 'android.permission.RECORD_AUDIO';
		if (Platform.OS === 'android' && !await PermissionsAndroid.check(audioPermission)) {
			await PermissionsAndroid.request(audioPermission);
		}

		return this.provider.build({
			locale: this.locale,
			modelPath: this.getModelPath(),
			callbacks,
		});
	}
}
