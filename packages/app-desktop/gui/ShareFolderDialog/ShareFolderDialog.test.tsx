import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { createMockReduxStore, encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import mockShareService from '@joplin/lib/testing/share/mockShareService';
import { formatPublicKeyFingerprint, generateKeyPair, ppkPublicKeyFingerprint, PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk/ppk';
import { loadMasterKeysFromSettings, setupAndEnableEncryption } from '@joplin/lib/services/e2ee/utils';
import { setPpk } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import ShareService from '@joplin/lib/services/share/ShareService';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import { ModelType } from '@joplin/lib/BaseModel';
import ShareFolderDialog from './ShareFolderDialog';
import '../../utils/initReact';
import { Minute } from '@joplin/utils/time';

const password = '111111';
const shareId = 'test-share-id';
const email = 'bob@example.com';

type ServerPublicKey = Pick<PublicPrivateKeyPair, 'id'|'publicKey'>|null;
interface PublicKeyRequest {
	email: string;
	isShared: boolean;
	requestIndex: number;
}
type OnGetPublicKey = (request: PublicKeyRequest)=> ServerPublicKey;

const makeKey = async () => {
	const { id, publicKey } = await generateKeyPair(encryptionService(), password);
	return { id, publicKey };
};

const setUpDialog = async (onGetPublicKey: OnGetPublicKey) => {
	await setupAndEnableEncryption(encryptionService(), await loadEncryptionMasterKey(), password);
	await loadMasterKeysFromSettings(encryptionService());
	setPpk(await generateKeyPair(encryptionService(), password));

	const folder = await Folder.save({ title: 'folder' });
	const store = createMockReduxStore();
	Setting.dispatch = store.dispatch;
	Setting.dispatchUpdateAll();

	let isShared = false;
	let publicKeyRequestCount = 0;
	const postedPpkIds: string[] = [];
	const shareInfo = async () => {
		const { master_key_id } = await Folder.load(folder.id);
		return { id: shareId, type: ModelType.Folder, folder_id: folder.id, master_key_id };
	};

	mockShareService({
		onExec: async (method, path, _query, body) => {
			if (path === 'api/shares') {
				if (method === 'POST') isShared = true;
				return method === 'POST' ? shareInfo() : { items: isShared ? [await shareInfo()] : [] };
			}
			if (path === `api/shares/${shareId}/users`) {
				if (method === 'GET') return { items: [] };
				postedPpkIds.push(JSON.parse(JSON.parse(body.master_key).content).ppkId);
				return null;
			}
			const publicKeyMatch = path.match(/^api\/users\/([^/]*)\/public_key$/);
			if (publicKeyMatch) {
				if (!publicKeyMatch[1]) throw new Error('Not found');
				return onGetPublicKey({ email: decodeURIComponent(publicKeyMatch[1]), isShared, requestIndex: publicKeyRequestCount++ });
			}
			return null;
		},
	}, ShareService.instance(), store);

	const view = render(
		<Provider store={store}>
			<ThemeProvider theme={themeStyle(Setting.THEME_LIGHT)}>
				<ShareFolderDialog themeId={Setting.THEME_LIGHT} folderId={folder.id} onClose={jest.fn()}/>
			</ThemeProvider>
		</Provider>,
	);
	await waitForIdle();

	return { ...view, postedPpkIds, isShared: () => isShared, publicKeyRequestCount: () => publicKeyRequestCount };
};

const waitForIdle = () => waitFor(() => {
	expect(screen.queryByText(/^(Sharing notebook|Synchronizing)/)).toBeNull();
}, { timeout: Minute });

const setRecipient = (recipient: string) => {
	fireEvent.change(document.getElementById('share-folder-dialog-recipient-email'), { target: { value: recipient } });
};

const clickShare = async () => {
	fireEvent.click(screen.getByRole('button', { name: 'Share', hidden: true }));
	await waitForIdle();
};

describe('ShareFolderDialog', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		HTMLDialogElement.prototype.showModal = jest.fn();
		jest.spyOn(reg, 'waitForSyncFinishedThenSync').mockResolvedValue(undefined);
		jest.spyOn(reg, 'scheduleSync').mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should ask for review, and not share, when the recipient key has changed', async () => {
		const knownKey = await makeKey();
		const changedKey = await makeKey();
		const showMessageBox = jest.spyOn(shim, 'showMessageBox').mockResolvedValue(0);
		const { postedPpkIds, unmount } = await setUpDialog(() => changedKey);
		await ShareService.instance().markPublicKeyAsSeen_(email, knownKey as PublicPrivateKeyPair);

		setRecipient(email);
		await clickShare();

		expect(showMessageBox).toHaveBeenCalledTimes(1);
		expect(postedPpkIds).toEqual([]);
		expect(await screen.findByText(formatPublicKeyFingerprint(await ppkPublicKeyFingerprint(changedKey as PublicPrivateKeyPair)))).toBeTruthy();

		unmount();
	});

	it('should share without asking for review when the changed key was confirmed', async () => {
		const knownKey = await makeKey();
		const changedKey = await makeKey();
		const showMessageBox = jest.spyOn(shim, 'showMessageBox').mockResolvedValue(0);
		const { postedPpkIds, unmount } = await setUpDialog(() => changedKey);
		await ShareService.instance().markPublicKeyAsSeen_(email, knownKey as PublicPrivateKeyPair);
		await ShareService.instance().markPublicKeyAsConfirmed(email, changedKey as PublicPrivateKeyPair);

		setRecipient(email);
		await clickShare();

		expect(showMessageBox).not.toHaveBeenCalled();
		expect(postedPpkIds).toEqual([changedKey.id]);

		unmount();
	});
});
