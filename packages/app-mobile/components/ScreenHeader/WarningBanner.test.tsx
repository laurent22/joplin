import * as React from 'react';
import WarningBanner from './WarningBanner';
import Setting from '@joplin/lib/models/Setting';
import { act, fireEvent, render, screen, userEvent, waitFor } from '../../utils/testing/testingLibrary';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import makeShareInvitation from '@joplin/lib/testing/share/makeMockShareInvitation';
import { encryptionService, loadEncryptionMasterKey, mockMobilePlatform, runWithFakeTimers, setupDatabaseAndSynchronizer, switchClient, synchronizer, synchronizerStart, withWarningSilenced } from '@joplin/lib/testing/test-utils';
import { fetchSyncInfo, getEncryptionEnabled, setEncryptionEnabled, uploadSyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import TestProviderStack from '../testing/TestProviderStack';
import { AppState } from '../../utils/types';
import { Dispatch, Store } from 'redux';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import MasterKey from '@joplin/lib/models/MasterKey';
import { setupAndEnableEncryption } from '@joplin/lib/services/e2ee/utils';
import { Second } from '@joplin/utils/time';
import shim, { MobilePlatform } from '@joplin/lib/shim';
import { reg } from '@joplin/lib/registry';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ErrorCode } from '@joplin/lib/errors';
import checkDisabledSyncItemsNotification from '@joplin/lib/services/synchronizer/utils/checkDisabledSyncItemsNotification';

interface WrapperProps {
	store: Store<AppState>;
}

const WarningBannerWrapper: React.FC<WrapperProps> = ({ store }) => {
	return <TestProviderStack store={store}>
		<WarningBanner />
	</TestProviderStack>;
};

const createMockStore = () => {
	const store = createMockReduxStore();
	setupGlobalStore(store);

	return {
		store,
		getRouteName: () => store.getState().route.routeName,
		simulateNotLoadedMasterKey: async () => {
			const key = await MasterKey.save(await encryptionService().generateMasterKey('111111'));

			act(() => {
				store.dispatch({
					type: 'MASTERKEY_ADD_NOT_LOADED',
					id: key.id,
				});
			});
		},
		setShareInvitations: (invitations: ShareInvitation[]) => {
			act(() => {
				store.dispatch({
					type: 'SHARE_INVITATION_SET',
					shareInvitations: invitations,
				});
			});
		},
		setIsProcessingShareInvitations: (processing: boolean) => {
			act(() => {
				store.dispatch({
					type: 'SHARE_INVITATION_RESPONSE_PROCESSING',
					value: processing,
				});
			});
		},
		setMustAuthenticate: () => {
			act(() => {
				store.dispatch({
					type: 'MUST_AUTHENTICATE',
					value: true,
				});
			});
		},
	};
};

const setupAndDisableE2eeRemotely = async (dispatch: Dispatch) => runWithFakeTimers(async () => {
	await setupDatabaseAndSynchronizer(1);
	await switchClient(0);

	synchronizer().dispatch = dispatch;

	const masterKey = await loadEncryptionMasterKey();
	await setupAndEnableEncryption(encryptionService(), masterKey, '123456');
	await synchronizerStart();

	await switchClient(1);
	await synchronizerStart();

	jest.advanceTimersByTime(Second);
	expect(getEncryptionEnabled()).toBe(true);
	setEncryptionEnabled(false);

	await synchronizerStart();
	await switchClient(0);
	await withWarningSilenced(/Encryption has been disabled remotely|There was some errors:/, async () => {
		await synchronizerStart();
	}, { requireWarning: true });
});


describe('WarningBanner', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		jest.useFakeTimers();
		// Avoid warnings related background syncs running after tests complete
		reg.scheduleSync = jest.fn();
	});

	test('the missing master key alert should link to the encryption config screen', async () => {
		const mock = createMockStore();
		const defaultRoute = mock.getRouteName();

		await mock.simulateNotLoadedMasterKey();

		render(<WarningBannerWrapper store={mock.store}/>);
		expect(await screen.findAllByTestId('warning-box')).toHaveLength(1);

		expect(mock.getRouteName()).toBe(defaultRoute);

		const masterKeyWarning = screen.getByText(/decryption password/);
		const user = userEvent.setup();
		await user.press(masterKeyWarning);

		expect(mock.getRouteName()).toBe('EncryptionConfig');
	});

	test.each([
		[makeShareInvitation('Test user', 'email@example.com', ShareUserStatus.Waiting), true],
		[makeShareInvitation('Test user', 'email@example.com', ShareUserStatus.Accepted), false],
		[makeShareInvitation('Test user', 'email@example.com', ShareUserStatus.Rejected), false],
	])('should display a warning banner when there is an incoming share (case %#)', (invitation, shouldShow) => {
		const mock = createMockStore();
		mock.setShareInvitations([invitation]);

		render(<WarningBannerWrapper store={mock.store}/>);
		const checkShownState = () => {
			if (shouldShow) {
				expect(screen.getByText(/would like to share a notebook/)).toBeVisible();
			} else {
				expect(screen.queryByText(/would like to share a notebook/)).toBeNull();
			}
		};
		checkShownState();

		// Should not be affected by additional rejected/accepted invitations
		for (const inviteType of [ShareUserStatus.Accepted, ShareUserStatus.Rejected]) {
			mock.setShareInvitations([invitation, makeShareInvitation('A', 'a@example.com', inviteType)]);
			checkShownState();
		}
	});

	test('should not display a share warning banner while processing shares', () => {
		const invitations = [makeShareInvitation('Test Name', 'email@example.com', ShareUserStatus.Waiting)];
		const query = /Test Name \(email@example\.com\) would like to share a notebook/;

		const { store, setShareInvitations, setIsProcessingShareInvitations } = createMockStore();
		setShareInvitations(invitations);
		setIsProcessingShareInvitations(false);

		render(<WarningBannerWrapper store={store}/>);
		expect(screen.getByText(query)).toBeVisible();

		setIsProcessingShareInvitations(true);
		expect(screen.queryByText(query)).toBeNull();

		setIsProcessingShareInvitations(false);
		expect(screen.getByText(query)).toBeVisible();
	});

	test('the note lock key conflict banner should link to the migration screen', () => {
		Setting.setValue('featureFlag.noteLock', true);
		Setting.setValue('noteLock.conflictNoteLockKey', { noteLockKey: { id: 'sync-target-key' } });
		const mock = createMockStore();

		render(<WarningBannerWrapper store={mock.store}/>);
		const banner = screen.getByText(/different note lock key/);
		expect(banner).toBeVisible();
		fireEvent.press(banner);

		expect(mock.getRouteName()).toBe('NoteLockMigration');
	});

	test('the note lock migration banner should follow the run and be dismissed once it has completed', () => {
		Setting.setValue('featureFlag.noteLock', true);
		Setting.setValue('noteLock.conflictNoteLockKey', { noteLockKey: { id: 'sync-target-key' } });
		const mock = createMockStore();
		const setStatus = (value: unknown) => act(() => {
			mock.store.dispatch({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value });
		});
		render(<WarningBannerWrapper store={mock.store}/>);

		setStatus({ running: true, failed: 0, skipped: 0 });
		expect(screen.getByText(/Migration is in progress/)).toBeVisible();
		expect(screen.queryByText(/different note lock key/)).toBeNull();

		setStatus({ running: false, failed: 2, skipped: 0 });
		expect(screen.getByText(/2 locked notes could not be migrated/)).toBeVisible();
		const showMessageBox = jest.spyOn(shim, 'showMessageBox').mockResolvedValue(1);
		fireEvent.press(screen.getByText('Skip'));
		expect(showMessageBox).toHaveBeenCalled();
		showMessageBox.mockRestore();
		fireEvent.press(screen.getByText('Retry'));
		expect(mock.getRouteName()).toBe('NoteLockMigration');

		setStatus({ running: false, failed: 0, skipped: 1 });
		expect(screen.getByText(/has completed.*1 locked note was skipped/)).toBeVisible();
		fireEvent.press(screen.getByText(/has completed/));
		expect(mock.store.getState().noteLockMigrationStatus).toBeNull();
	});

	test('invalid credentials banner for Joplin Cloud should link to a login screen', () => {
		Setting.setValue('sync.target', 10);
		const mock = createMockStore();

		mock.setMustAuthenticate();
		render(<WarningBannerWrapper store={mock.store}/>);

		const buttonName = 'Your Joplin Cloud credentials are invalid, please login.';
		const button = screen.getByRole('button', { name: buttonName });
		expect(button).toBeVisible();
		fireEvent.press(button);

		// Should open the login screen
		expect(mock.getRouteName()).toBe('JoplinCloudLogin');

		// Should hide the warning banner
		expect(screen.queryByRole('button', { name: buttonName })).toBeNull();
	});

	test('should show the bulk note lock banner only while the notes change', () => {
		const mock = createMockStore();
		render(<WarningBannerWrapper store={mock.store}/>);
		const setRunning = (value: boolean) => act(() => {
			mock.store.dispatch({ type: 'NOTE_LOCK_BULK_CHANGE_RUNNING_SET', value });
		});

		setRunning(true);
		expect(screen.getByText('Applying note lock changes. Please wait…')).toBeVisible();

		setRunning(false);
		expect(screen.queryByText('Applying note lock changes. Please wait…')).toBeNull();
	});

	test('should show the sync target minimum version in the upgrade app banner', async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		await synchronizerStart();
		const store = createMockReduxStore();
		setupGlobalStore(store);

		const remoteInfo = await fetchSyncInfo(synchronizer().api());
		remoteInfo.appMinVersion = '3.9.0';
		await uploadSyncInfo(synchronizer().api(), remoteInfo);

		synchronizer().dispatch = store.dispatch;
		await synchronizerStart();

		render(<TestProviderStack store={store}><WarningBanner/></TestProviderStack>);
		expect(screen.getByTestId('warning-box')).toHaveTextContent('In order to synchronise, Please upgrade your application to version 3.9.0: Update it from the App Store');
	});

	test('the unencrypted upload banner should allow uploads on this device, or keep the changes until another one is held back', async () => {
		const mock = createMockStore();
		const folder = await Folder.save({ title: 'folder' });
		const holdBack = async (title: string) => {
			const note = await Note.save({ title, parent_id: folder.id });
			await BaseItem.saveSyncDisabled(Setting.value('sync.target'), note, ErrorCode.PlaintextUploadNotConfirmed);
			await act(() => checkDisabledSyncItemsNotification(mock.store.dispatch));
		};
		await holdBack('note 1');
		await holdBack('note 2');
		reg.waitForSyncFinishedThenSync = jest.fn();
		const confirmSpy = jest.spyOn(shim, 'showConfirmationDialog').mockResolvedValue(true);

		render(<WarningBannerWrapper store={mock.store}/>);
		const bannerName = /^Publishing is turned off while end-to-end encryption is on/;
		expect(screen.getByRole('button', { name: /: 2 changes weren't uploaded\.$/ })).toBeVisible();

		const choose = async (choice: string) => {
			fireEvent.press(screen.getByRole('button', { name: bannerName }));
			await act(async () => {
				fireEvent.press(screen.getByRole('button', { name: choice }));
			});
		};

		await choose('Don\'t upload');
		await waitFor(() => expect(screen.queryByRole('button', { name: bannerName })).toBeNull());

		await holdBack('note 3');
		expect(screen.getByRole('button', { name: /: 1 change wasn't uploaded\.$/ })).toBeVisible();

		await choose('Allow on this device');
		await waitFor(() => expect(Setting.value('encryption.allowUnencryptedUploads')).toBe(true));
		expect(reg.waitForSyncFinishedThenSync).toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	it('should show a warning banner when E2EE has been disabled on the sync target', async () => {
		// Mock the web app so that the confirmation dialog uses a React components,
		// rather than Alert.alert:
		const { reset } = mockMobilePlatform(MobilePlatform.Web);
		try {
			const mock = createMockStore();
			await setupAndDisableE2eeRemotely(mock.store.dispatch);

			render(<WarningBannerWrapper store={mock.store}/>);

			const warningButtonName = 'Encryption needs to be reconfigured.';
			const encryptionWarningButton = screen.getByRole('button', { name: warningButtonName });
			expect(encryptionWarningButton).toBeVisible();
			fireEvent.press(encryptionWarningButton);

			const keepEnabledButton = screen.getByRole('button', { name: 'Keep encryption enabled' });
			expect(keepEnabledButton).toBeVisible();

			// Clicking "keep encryption enabled" should hide the warning
			fireEvent.press(keepEnabledButton);
			expect(screen.queryByRole('button', { name: warningButtonName })).toBeNull();
		} finally {
			reset();
		}
	});
});
