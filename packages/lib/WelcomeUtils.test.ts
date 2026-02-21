import { setupDatabaseAndSynchronizer, switchClient } from './testing/test-utils';
import WelcomeUtils from './WelcomeUtils';
import Folder from './models/Folder';
import { FolderIconType } from './services/database/types';

describe('WelcomeUtils', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should create welcome items with waving hand emoji icon for the folder', async () => {
		const result = await WelcomeUtils.createWelcomeItems('en_GB');

		expect(result.defaultFolderId).toBeTruthy();

		const folder = await Folder.load(result.defaultFolderId);
		expect(folder).toBeTruthy();

		const icon = Folder.unserializeIcon(folder.icon);
		expect(icon.type).toBe(FolderIconType.Emoji);
		expect(icon.emoji).toBe('👋');
	});

});
