import * as React from 'react';
import { ShareManagerComponent } from './index';
import Setting from '@joplin/lib/models/Setting';
import mockShareService from '@joplin/lib/testing/share/mockShareService';
import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import ShareService from '@joplin/lib/services/share/ShareService';
import makeMockShareInvitation from '@joplin/lib/testing/share/makeMockShareInvitation';
import { Provider } from 'react-redux';
import createMockReduxStore from '../../../utils/testing/createMockReduxStore';
import { AppState } from '../../../utils/types';
import { Store } from 'redux';

interface WrapperProps {
	shareInvitations: ShareInvitation[];
	store: Store<AppState>;
}

const ShareManagerWrapper: React.FC<WrapperProps> = props => {
	return (
		<Provider store={props.store}>
			<ShareManagerComponent
				themeId={Setting.THEME_LIGHT}
				shareInvitations={props.shareInvitations}
				processingShareInvitationResponse={false}
			/>
		</Provider>
	);
};

describe('ShareManager', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		jest.useRealTimers();
	});

	test('should refresh incoming share invitations on pull', async () => {
		const store = createMockReduxStore();

		let shares: ShareInvitation[] = [makeMockShareInvitation('UserNameHere', 'usernamehere@example.com', ShareUserStatus.Waiting)];
		const getShareInvitationsMock = jest.fn(async () => {
			return {
				items: shares,
			};
		});
		mockShareService({
			getShareInvitations: getShareInvitationsMock,
			getShares: async () => ({ items: [] }),
			postShares: async () => ({ id: 'test-id' }),
		}, ShareService.instance(), store);

		render(<ShareManagerWrapper shareInvitations={shares} store={store}/>);
		expect(await screen.findByText('Share from UserNameHere (usernamehere@example.com)')).toBeVisible();

		getShareInvitationsMock.mockClear();

		shares = [
			...shares,
			makeMockShareInvitation('Username2', 'test@example.com', ShareUserStatus.Waiting),
		];

		// See https://github.com/callstack/react-native-testing-library/issues/809#issuecomment-984823700
		const { refreshControl } = screen.getByTestId('refreshControl').props;
		fireEvent(refreshControl, 'refresh');

		// Should try to refresh shares
		expect(getShareInvitationsMock).toHaveBeenCalled();
		render(<ShareManagerWrapper shareInvitations={shares} store={store}/>);

		// Should now list both
		expect(await screen.findByText(/^Share from UserNameHere/)).toBeVisible();
		expect(await screen.findByText(/^Share from Username2/)).toBeVisible();
	});

	test('should support accepting shares', async () => {
		const store = createMockReduxStore();
		let shares = [makeMockShareInvitation('UserNameHere', 'usernamehere@example.com', ShareUserStatus.Waiting)];
		const onUpdateShareItems = jest.fn();
		mockShareService({
			async onExec(method, path, _query, body: Record<string, unknown>) {
				if (method === 'GET' && path === 'api/share_users') {
					return { items: shares };
				}
				if (method === 'PATCH' && path.startsWith('api/share_users/')) {
					onUpdateShareItems(body.status as ShareUserStatus);
					return null;
				}
				return null;
			},
		}, ShareService.instance(), store);

		render(<ShareManagerWrapper shareInvitations={shares} store={store}/>);

		const acceptButton = await screen.findByRole('button', { name: 'Accept' });
		expect(acceptButton).toBeVisible();

		// Use fake timers to silence a userEvents warning.
		jest.useFakeTimers();
		const user = userEvent.setup();
		await user.press(acceptButton);

		await waitFor(() => {
			expect(onUpdateShareItems).toHaveBeenCalledWith(ShareUserStatus.Accepted);
		});

		shares = [makeMockShareInvitation('UserNameHere', 'usernamehere@example.com', ShareUserStatus.Accepted)];
		render(<ShareManagerWrapper shareInvitations={shares} store={store}/>);

		// Should now allow leaving
		expect(await screen.findByRole('button', { name: 'Leave notebook' })).toBeVisible();
	});
});
