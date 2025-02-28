import { setupDatabase } from '@joplin/lib/testing/test-utils';
import whisper from './whisper';
import { dirname, join } from 'path';
import { exists, mkdir, remove, writeFile } from 'fs-extra';

jest.mock('react-native', () => {
	const reactNative = jest.requireActual('react-native');

	// Set properties on reactNative rather than creating a new object with
	// {...reactNative, ...}. Creating a new object triggers deprecation warnings.
	// See https://github.com/facebook/react-native/issues/28839.
	reactNative.NativeModules.SpeechToTextModule = {
		convertNext: () => 'Test. This is test output. Test!',
		getPreview: () => 'A preview of future output.',
		runTests: ()=> {},
		openSession: jest.fn(() => {
			const someId = 1234;
			return someId;
		}),
		closeSession: jest.fn(),
		startRecording: jest.fn(),
	};

	return reactNative;
});

describe('whisper', () => {
	beforeEach(async () => {
		await setupDatabase(0);
	});
	afterEach(async () => {
		const whisperDirectory = dirname(whisper.modelLocalFilepath('en'));
		await remove(whisperDirectory);
	});

	test('should remove legacy models when deleting cached models', async () => {
		const whisperDirectory = dirname(whisper.modelLocalFilepath('en'));
		const legacyModelPath = join(whisperDirectory, 'whisper_tiny.onnx');
		await mkdir(whisperDirectory);
		await writeFile(legacyModelPath, 'test', 'utf-8');

		await whisper.deleteCachedModels('en');

		expect(await exists(legacyModelPath)).toBe(false);
	});

	test('should apply post-processing replacements specified in the model config', async () => {
		const whisperBaseDirectory = dirname(whisper.modelLocalFilepath('en'));
		await mkdir(whisperBaseDirectory);

		const modelDirectory = join(whisperBaseDirectory, 'model');
		await mkdir(modelDirectory);

		await writeFile(join(modelDirectory, 'model.bin'), 'mock model', 'utf-8');
		await writeFile(join(modelDirectory, 'config.json'), JSON.stringify({
			output: {
				stringReplacements: [
					['Test', 'replaced'],
				],
				regexReplacements: [
					['replace[d]', 'replaced again!'],
				],
			},
		}), 'utf-8');

		let lastFinalizedText = '';
		const onFinalize = jest.fn((text: string) => {
			lastFinalizedText = text;
			// Stop the session after the first data is fetched.
			return session.stop();
		});
		const onPreview = jest.fn();
		const session = await whisper.build({
			modelPath: modelDirectory,
			callbacks: {
				onFinalize, onPreview,
			},
			locale: 'en',
		});

		await session.start();

		// Should have applied string, then regex replacements.
		expect(
			lastFinalizedText,
		).toBe('replaced again!. This is test output. replaced again!!');
	});
});
