import { join } from 'path';
import { writeFile } from 'fs-extra';

// Writes the profile's settings.json before the app starts, so that these values are
// picked up during startup. Currently used to keep the editor+viewer layout that many
// integration tests rely on -- the app's default only shows the editor.
const seedProfileSettings = async (profileDirectory: string, values: Record<string, unknown>) => {
	const settingFilePath = join(profileDirectory, 'settings.json');
	await writeFile(settingFilePath, JSON.stringify(values), 'utf8');
};

export default seedProfileSettings;
