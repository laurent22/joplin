import '../../../testing/dom-test-environment';
import { renderHook } from '@testing-library/react';
import { encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import { setupAndEnableEncryption } from '../../../services/e2ee/utils';
import Folder from '../../../models/Folder';
import ShareService from '../../../services/share/ShareService';
import { ShareType, StateShare } from '../../../services/share/reducer';
import mockShareService from '../../../testing/share/mockShareService';
import { reg } from '../../../registry';
import useOnPublishFolderLinkClick from './useOnPublishFolderLinkClick';
import { SharingStatus } from '../ShareNoteDialog/types';

describe('useOnPublishFolderLinkClick', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		jest.spyOn(reg, 'waitForSyncFinishedThenSync').mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should mark the folder as published when a share exists on the server, but the folder is not published locally (E2EE)', async () => {
		await setupAndEnableEncryption(encryptionService(), await loadEncryptionMasterKey());

		// For example, if the app crashed after the share was created, but before is_shared was set:
		const folder = await Folder.save({ title: 'folder' });
		const share: StateShare = {
			id: 'published-folder',
			type: ShareType.PublishedFolder,
			folder_id: folder.id,
			note_id: '',
			master_key_id: '',
		};
		const service = mockShareService({
			getShares: async () => ({ items: [share] }),
			postShares: async () => share,
			getShareInvitations: async () => ({ items: [] }),
		}, ShareService.instance());
		await service.refreshShares();

		const statuses: SharingStatus[] = [];
		const { result } = renderHook(() => useOnPublishFolderLinkClick({
			folderId: folder.id,
			publishedShare: share,
			setPublishFolderStatus: status => statuses.push(status),
			onShareUrlReady: () => {},
		}));
		await result.current();

		expect(statuses[statuses.length - 1]).toBe(SharingStatus.Created);
		expect((await Folder.load(folder.id)).is_shared).toBe(1);
	});
});
