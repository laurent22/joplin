import * as React from 'react';
import { WarningBannerComponent } from './WarningBanner';
import Setting from '@joplin/lib/models/Setting';
import NavService from '@joplin/lib/services/NavService';
import { render, screen, userEvent } from '@testing-library/react-native';

interface WrapperProps {
	showMissingMasterKeyMessage?: boolean;
	hasDisabledSyncItems?: boolean;
	shouldUpgradeSyncTarget?: boolean;
	showShouldUpgradeSyncTargetMessage?: boolean;
	hasDisabledEncryptionItems?: boolean;
	mustUpgradeAppMessage?: string;
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
		shareInvitations={[]}
		processingShareInvitationResponse={false}
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
});
