import * as React from 'react';
import { WarningBannerComponent } from './WarningBanner';
import Setting from '@joplin/lib/models/Setting';
import NavService from '@joplin/lib/services/NavService';
import { render, screen, userEvent } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import makeShareInvitation from '@joplin/lib/testing/share/makeMockShareInvitation';

interface WrapperProps {
	showMissingMasterKeyMessage?: boolean;
	hasDisabledSyncItems?: boolean;
	shouldUpgradeSyncTarget?: boolean;
	showShouldUpgradeSyncTargetMessage?: boolean;
	hasDisabledEncryptionItems?: boolean;
	mustUpgradeAppMessage?: string;
	shareInvitations?: ShareInvitation[];
	processingShareInvitationResponse?: boolean;
}

const WarningBannerWrapper: React.FC<WrapperProps> = props => {
	return <WarningBannerComponent
		themeId={Setting.THEME_LIGHT}
		showMissingMasterKeyMessage={props.showMissingMasterKeyMessage ?? false}
		hasDisabledSyncItems={props.hasDisabledSyncItems ?? false}
		shouldUpgradeSyncTarget={props.shouldUpgradeSyncTarget ?? false}
		showShouldUpgradeSyncTargetMessage={props.showShouldUpgradeSyncTargetMessage ?? false}
		hasDisabledEncryptionItems={props.hasDisabledEncryptionItems ?? false}
		mustUpgradeAppMessage={props.mustUpgradeAppMessage ?? ''}
		shareInvitations={props.shareInvitations ?? []}
		processingShareInvitationResponse={props.processingShareInvitationResponse ?? false}
	/>;
};


describe('WarningBanner', () => {
	let navServiceMock: jest.Mock<(route: unknown)=> void>;
	beforeEach(() => {
		navServiceMock = jest.fn();
		NavService.dispatch = navServiceMock;
		jest.useFakeTimers();
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
});
