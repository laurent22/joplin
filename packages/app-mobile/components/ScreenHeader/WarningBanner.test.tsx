import * as React from 'react';
import WarningBanner, { WarningBannerComponent } from './WarningBanner';
import Setting from '@joplin/lib/models/Setting';
import NavService from '@joplin/lib/services/NavService';
import { act, fireEvent, render, screen, userEvent, waitFor } from '../../utils/testing/testingLibrary';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import makeShareInvitation from '@joplin/lib/testing/share/makeMockShareInvitation';
import { encryptionService, loadEncryptionMasterKey, mockMobilePlatform, runWithFakeTimers, setupDatabaseAndSynchronizer, switchClient, synchronizer, synchronizerStart, withWarningSilenced } from '@joplin/lib/testing/test-utils';
import { fetchSyncInfo, getEncryptionEnabled, setEncryptionEnabled, uploadSyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import TestProviderStack from '../testing/TestProviderStack';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import { Dispatch } from 'redux';
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
	showMissingMasterKeyMessage?: boolean;
	hasDisabledSyncItems?: boolean;
	shouldUpgradeSyncTarget?: boolean;
	showShouldUpgradeSyncTargetMessage?: boolean;
	hasDisabledEncryptionItems?: boolean;
	mustUpgradeAppMessage?: string;
	shareInvitations?: ShareInvitation[];
	processingShareInvitationResponse?: boolean;
	showInvalidJoplinCloudCredential?: boolean;
	showReEnableEncryptionBanner?: boolean;
	mustFixPpk?: boolean;
}

const WarningBannerWrapper: React.FC<WrapperProps> = props => {
	return <WarningBannerComponent
		dispatch={jest.fn()}
		themeId={Setting.THEME_LIGHT}
		showMissingMasterKeyMessage={props.showMissingMasterKeyMessage ?? false}
		hasDisabledSyncItems={props.hasDisabledSyncItems ?? false}
		shouldUpgradeSyncTarget={props.shouldUpgradeSyncTarget ?? false}
		showShouldUpgradeSyncTargetMessage={props.showShouldUpgradeSyncTargetMessage ?? false}
		hasDisabledEncryptionItems={props.hasDisabledEncryptionItems ?? false}
		mustUpgradeAppMessage={props.mustUpgradeAppMessage ?? ''}
		shareInvitations={props.shareInvitations ?? []}
		processingShareInvitationResponse={props.processingShareInvitationResponse ?? false}
		showInvalidJoplinCloudCredential={props.showInvalidJoplinCloudCredential ?? false}
		showReEnableEncryptionBanner={props.showReEnableEncryptionBanner ?? false}
		mustFixPpk={props.mustFixPpk ?? false}
		plaintextUploadHeldBackItemIds={[]}
		routeName=''
	/>;
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
	let navServiceMock: jest.Mock<(route: unknown)=> void>;
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		navServiceMock = jest.fn();
		NavService.dispatch = navServiceMock;
		jest.useFakeTimers();
		// Avoid warnings related background syncs running after tests complete
		reg.scheduleSync = jest.fn();
	});

	test('the missing master key alert should link to the encryption config screen', async () => {
		render(<WarningBannerWrapper showMissingMasterKeyMessage={true}/>);
		expect(await screen.findAllByTestId('warning-box')).toHaveLength(1);

		expect(navServiceMock).not.toHaveBeenCalled();

		const masterKeyWarning = screen.getByText(/decryption password/);
		const user = userEvent.setup();
		await user.press(masterKeyWarning);

		expect(navServiceMock.mock.lastCall).toMatchObject([{ routeName: 'EncryptionConfig' }]);
	});

	test.each([
		[makeShareInvitation('Test user', 'email@example.com', ShareUserStatus.Waiting), true],
		[makeShareInvitation('Test user', 'email@example.com', ShareUserStatus.Accepted), false],
		[makeShareInvitation('Test user', 'email@example.com', ShareUserStatus.Rejected), false],
	])('should display a warning banner when there is an incoming share (case %#)', (invitation, shouldShow) => {
		const invitations = [invitation];
		render(<WarningBannerWrapper shareInvitations={invitations}/>);
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
			render(
				<WarningBannerWrapper
					shareInvitations={[...invitations, makeShareInvitation('A', 'a@example.com', inviteType)]}
				/>,
			);
			checkShownState();
		}
	});

	test('should not display a share warning banner while processing shares', () => {
		const invitations = [makeShareInvitation('Test Name', 'email@example.com', ShareUserStatus.Waiting)];
		const query = /Test Name \(email@example\.com\) would like to share a notebook/;
		render(<WarningBannerWrapper shareInvitations={invitations} processingShareInvitationResponse={false}/>);
		expect(screen.getByText(query)).toBeVisible();

		render(<WarningBannerWrapper shareInvitations={invitations} processingShareInvitationResponse={true}/>);
		expect(screen.queryByText(query)).toBeNull();

		render(<WarningBannerWrapper shareInvitations={invitations} processingShareInvitationResponse={false}/>);
		expect(screen.getByText(query)).toBeVisible();
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
		const store = createMockReduxStore();
		setupGlobalStore(store);
		const folder = await Folder.save({ title: 'folder' });
		const holdBack = async (title: string) => {
			const note = await Note.save({ title, parent_id: folder.id });
			await BaseItem.saveSyncDisabled(Setting.value('sync.target'), note, ErrorCode.PlaintextUploadNotConfirmed);
			await act(() => checkDisabledSyncItemsNotification(store.dispatch));
		};
		await holdBack('note 1');
		await holdBack('note 2');
		reg.waitForSyncFinishedThenSync = jest.fn();
		const confirmSpy = jest.spyOn(shim, 'showConfirmationDialog').mockResolvedValue(true);

		render(<TestProviderStack store={store}><WarningBanner/></TestProviderStack>);
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
			const store = createMockReduxStore();
			setupGlobalStore(store);
			await setupAndDisableE2eeRemotely(store.dispatch);

			render(<TestProviderStack store={store}><WarningBanner/></TestProviderStack>);

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
