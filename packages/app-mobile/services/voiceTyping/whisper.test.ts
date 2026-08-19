import { setupDatabase } from '@joplin/lib/testing/test-utils';
import whisper from './whisper';
import { dirname, join } from 'path';
import { exists, mkdir, remove, writeFile } from 'fs-extra';
import Setting from '@joplin/lib/models/Setting';
const { testing__lastPrompt } = require('@joplin/whisper-voice-typing');

jest.mock('@joplin/whisper-voice-typing', () => {
	let lastPrompt: string|null = null;


	return {
		runTests: ()=> {},
		openSession: jest.fn((options) => {
			lastPrompt = options.prompt;

			return {
				open: jest.fn(),
				close: jest.fn(),
				convertNext: jest.fn(() => 'Test. This is test output. Test!'),
				convertAvailable: jest.fn(() => ''),
			};
		}),
		test: ()=>{},
		testing__lastPrompt: () => {
			return lastPrompt;
		},
	};
});

interface ModelConfig {
	output: {
		stringReplacements: string[][];
		regexReplacements: string[][];
	};
}

const defaultModelConfig: ModelConfig = {
	output: { stringReplacements: [], regexReplacements: [] },
};

const createMockModel = async (config: ModelConfig = defaultModelConfig) => {
	const whisperBaseDirectory = dirname(whisper.modelLocalFilepath('en'));
	await mkdir(whisperBaseDirectory);

	const modelDirectory = join(whisperBaseDirectory, 'model');
	await mkdir(modelDirectory);

	await writeFile(join(modelDirectory, 'model.bin'), 'mock model', 'utf-8');
	await writeFile(join(modelDirectory, 'config.json'), JSON.stringify(config), 'utf-8');

	return modelDirectory;
};

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
		const modelDirectory = await createMockModel({
			output: {
				stringReplacements: [
					['Test', 'replaced'],
				],
				regexReplacements: [
					['replace[d]', 'replaced again!'],
				],
			},
		});

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
		).toBe('\n\nreplaced again!. This is test output. replaced again!!');
	});

	it.each([
		{ glossary: '', expectedPrompt: '' },
		{ glossary: 'test', expectedPrompt: 'Glossary: test' },
		{ glossary: 'Joplin, app', expectedPrompt: 'Glossary: Joplin, app' },
		// Should not include the "Glossary:" prefix if there's no translation for it
		{ glossary: 'Joplin, app', expectedPrompt: 'Joplin, app', locale: 'testLocale-test' },
	])('should construct a prompt from the user-specified glossary (%j)', async ({ glossary, expectedPrompt, locale }) => {
		Setting.setValue('voiceTyping.glossary', glossary);

		const modelDirectory = await createMockModel();
		const session = await whisper.build({
			modelPath: modelDirectory,
			callbacks: {
				onFinalize: () => {
					return session.stop();
				},
				onPreview: jest.fn(),
			},
			locale: locale ?? 'en',
		});
		await session.start();

		expect(testing__lastPrompt()).toBe(expectedPrompt);
	});
});
