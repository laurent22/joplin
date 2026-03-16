const mockAddWordToSpellCheckerDictionary = jest.fn();

jest.doMock('../bridge', () => ({
	__esModule: true,
	default: () => ({
		mainWindow: () => ({
			webContents: {
				session: {
					addWordToSpellCheckerDictionary: mockAddWordToSpellCheckerDictionary,
				},
			},
		}),
	}),
}));

import { mkdtemp, readFile, remove, writeFile } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import SpellCheckerServiceDriverNative from './SpellCheckerServiceDriverNative';

const dictionaryFilename = 'Custom Dictionary.txt';
const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 100));

describe('SpellCheckerServiceDriverNative', () => {

	let profileDir: string;
	let driver: SpellCheckerServiceDriverNative;

	beforeEach(async () => {
		profileDir = await mkdtemp(join(tmpdir(), 'joplin-spell-test-'));
		driver = new SpellCheckerServiceDriverNative(profileDir);
		mockAddWordToSpellCheckerDictionary.mockClear();
	});

	afterEach(async () => {
		await remove(profileDir);
	});

	test('should save word to profile directory', async () => {
		driver.addWordToSpellCheckerDictionary('', 'joplin');
		await flushPromises();

		const content = await readFile(join(profileDir, dictionaryFilename), 'utf8');
		expect(content).toBe('joplin\n');
	});

	test('should load saved words from profile directory into Electron session', async () => {
		await writeFile(join(profileDir, dictionaryFilename), 'joplin\nnote\n', 'utf8');

		await driver.loadSavedWords();

		expect(mockAddWordToSpellCheckerDictionary).toHaveBeenCalledWith('joplin');
		expect(mockAddWordToSpellCheckerDictionary).toHaveBeenCalledWith('note');
	});

	test('should not write duplicate word to file', async () => {
		driver.addWordToSpellCheckerDictionary('', 'joplin');
		await flushPromises();
		driver.addWordToSpellCheckerDictionary('', 'joplin');
		await flushPromises();

		const words = (await readFile(join(profileDir, dictionaryFilename), 'utf8'))
			.split('\n')
			.filter(w => w.length > 0);
		expect(words).toEqual(['joplin']);
	});

});
