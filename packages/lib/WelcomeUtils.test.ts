import { setupDatabaseAndSynchronizer, switchClient } from './testing/test-utils';
import WelcomeUtils, { WelcomeAssetPlatform } from './WelcomeUtils';
import Folder from './models/Folder';
import { FolderIconType } from './services/database/types';
import Note from './models/Note';

describe('WelcomeUtils', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should create welcome items with waving hand emoji icon for the folder', async () => {
		const result = await WelcomeUtils.createWelcomeItems('en_GB', WelcomeAssetPlatform.Desktop);

		expect(result.defaultFolderId).toBeTruthy();

		const folder = await Folder.load(result.defaultFolderId);
		expect(folder).toBeTruthy();

		const icon = Folder.unserializeIcon(folder.icon);
		expect(icon.type).toBe(FolderIconType.Emoji);
		expect(icon.emoji).toBe('👋');
	});


	it.each([
		WelcomeAssetPlatform.Web, WelcomeAssetPlatform.Desktop,
	])('should create web welcome notes only on web (testing platform: %s)', async (platform) => {
		const result = await WelcomeUtils.createWelcomeItems('en_GB', platform);

		const notes = await Note.previews(result.defaultFolderId);

		const webAppNoteTitle = '0. About the web app';
		const noteTitles = notes.map(note => note.title);

		if (platform === WelcomeAssetPlatform.Web) {
			expect(noteTitles).toContain(webAppNoteTitle);
		} else {
			expect(noteTitles).not.toContain(webAppNoteTitle);
		}
	});
});
