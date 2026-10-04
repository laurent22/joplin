import * as React from 'react';
import WarningBanner from './WarningBanner';
import Setting from '@joplin/lib/models/Setting';
import { act, fireEvent, render, screen, userEvent } from '../../utils/testing/testingLibrary';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import makeShareInvitation from '@joplin/lib/testing/share/makeMockShareInvitation';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import TestProviderStack from '../testing/TestProviderStack';
import { AppState } from '../../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import MasterKey from '@joplin/lib/models/MasterKey';

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


describe('WarningBanner', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		jest.useFakeTimers();
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
});
