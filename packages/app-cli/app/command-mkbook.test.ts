import { execCommand2 } from '@joplin/tools/tool-utils';
import { homedir } from 'os';
import { removeSync } from 'fs-extra';

const profileDir = `${homedir()}/.config/joplindev-populate/joplindev-testing-command-mkbook`;
removeSync(profileDir);

// eC2W is an wrapper for execCommand2
const eC2W = async (command: string) => {
	await execCommand2(`yarn start-no-build --profile ${profileDir} ${command}`, { quiet: true });
};

describe('command-mkbook', function() {

	it('should create first and second folder', async () => {
		await expect(eC2W('mkbook test1')).resolves.not.toThrowError();
		await expect(eC2W('mkbook test2')).resolves.not.toThrowError();
	});

	it('should create a subfolder in first folder', async () => {
		await expect(eC2W('use test1')).resolves.not.toThrowError();
		await expect(eC2W('mkbook -s test1.1')).resolves.not.toThrowError();
	});

	it('should create a subfolder in the second destination folder', async () => {
		await expect(eC2W('mkbook -s test2.1 test2')).resolves.not.toThrowError();
	});

	it('should not be possible to create subfolder in ambiguous destination folder', async () => {
		await expect(eC2W('mkbook test3')).resolves.not.toThrowError();
		await expect(eC2W('mkbook test3')).resolves.not.toThrowError();	// ambiguous folder
		await expect(eC2W('use test3')).resolves.not.toThrowError(); // use the first folder
		await expect(eC2W('mkbook -s test3.1 test3')).rejects.toThrowError();
	});
});

