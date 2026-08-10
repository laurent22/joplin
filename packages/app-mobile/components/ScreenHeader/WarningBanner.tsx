import * as React from 'react';
import { useState } from 'react';
import { connect } from 'react-redux';
import { Platform } from 'react-native';
import { AppState } from '../../utils/types';
import WarningBox from './WarningBox';
import { _ } from '@joplin/lib/locale';
import { showMissingMasterKeyMessage } from '@joplin/lib/services/e2ee/utils';
import { localSyncInfoFromState } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import Setting from '@joplin/lib/models/Setting';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('WarningBanner');

interface Props {
	themeId: number;
	showMissingMasterKeyMessage: boolean;
	hasDisabledSyncItems: boolean;
	shouldUpgradeSyncTarget: boolean;
	showShouldUpgradeSyncTargetMessage: boolean|undefined;
	hasDisabledEncryptionItems: boolean;
	mustUpgradeAppMessage: string;
	syncTargetAppMinVersion?: string;
	shareInvitations: ShareInvitation[];
	processingShareInvitationResponse: boolean;
	showInvalidJoplinCloudCredential: boolean;
}

const androidGooglePlayUrl = 'https://play.google.com/store/apps/details?id=net.cozic.joplin';
const androidPreReleaseUrl = 'https://github.com/laurent22/joplin-android/tags';
const iosAppStoreUrl = 'https://apps.apple.com/app/id1315599797';

const fetchAndroidVersionIsPreRelease = async (version: string) => {
	const response = await shim.fetch(`https://api.github.com/repos/laurent22/joplin-android/releases/tags/android-v${version}`);
	if (!response.ok) return null;
	const release = await response.json();
	return !!release.prerelease;
};

export const WarningBannerComponent: React.FC<Props> = props => {
	const warningComps = [];

	const [isAndroidTargetPreRelease, setIsAndroidTargetPreRelease] = useState<boolean|null>(null);

	useAsyncEffect(async event => {
		setIsAndroidTargetPreRelease(null);
		if (Platform.OS !== 'android' || !props.mustUpgradeAppMessage || !props.syncTargetAppMinVersion) return;

		try {
			const isPreRelease = await fetchAndroidVersionIsPreRelease(props.syncTargetAppMinVersion);
			if (!event.cancelled) setIsAndroidTargetPreRelease(isPreRelease);
		} catch (error) {
			logger.error('Could not load release metadata for version', props.syncTargetAppMinVersion, error);
		}
	}, [props.mustUpgradeAppMessage, props.syncTargetAppMinVersion]);

	const renderWarningBox = (screen: string, message: string, url?: string) => {
		return <WarningBox
			key={screen}
			themeId={props.themeId}
			targetScreen={screen}
			url={url}
			message={message}
			testID='warning-box'
		/>;
	};

	const renderMustUpgradeAppMessage = () => {
		if (props.syncTargetAppMinVersion) {
			const upgradeMessage = (message: string) => _(
				'In order to synchronise, Please upgrade your application to version %s: %s',
				props.syncTargetAppMinVersion,
				message,
			);

			if (Platform.OS === 'android' && isAndroidTargetPreRelease !== null) {
				if (isAndroidTargetPreRelease) {
					return renderWarningBox(
						'UpgradeApp',
						upgradeMessage(_('Download it from the Joplin Android repository')),
						androidPreReleaseUrl,
					);
				}

				return renderWarningBox(
					'UpgradeApp',
					upgradeMessage(_('Update it from Google Play')),
					androidGooglePlayUrl,
				);
			}

			if (Platform.OS === 'ios') {
				return renderWarningBox(
					'UpgradeApp',
					upgradeMessage(_('Update it from the App Store')),
					iosAppStoreUrl,
				);
			}

			return renderWarningBox('UpgradeApp', _('In order to synchronise, Please upgrade your application to version %s', props.syncTargetAppMinVersion));
		}

		return renderWarningBox('UpgradeApp', props.mustUpgradeAppMessage);
	};

	if (props.showMissingMasterKeyMessage) {
		warningComps.push(renderWarningBox('EncryptionConfig', _('Press to set the decryption password.')));
	}
	if (props.hasDisabledSyncItems) {
		warningComps.push(renderWarningBox('Status', _('Some items cannot be synchronised. Press for more info.')));
	}
	if (props.shouldUpgradeSyncTarget && props.showShouldUpgradeSyncTargetMessage !== false) {
		warningComps.push(renderWarningBox('UpgradeSyncTarget', _('The sync target needs to be upgraded. Press this banner to proceed.')));
	}
	if (props.mustUpgradeAppMessage) {
		warningComps.push(renderMustUpgradeAppMessage());
	}
	if (props.hasDisabledEncryptionItems) {
		warningComps.push(renderWarningBox('Status', _('Some items cannot be decrypted.')));
	}
	if (props.showInvalidJoplinCloudCredential) {
		warningComps.push(renderWarningBox('JoplinCloudLogin', _('Your Joplin Cloud credentials are invalid, please login.')));
	}

	const shareInvitation = props.shareInvitations.find(inv => inv.status === ShareUserStatus.Waiting);
	if (
		!props.processingShareInvitationResponse
		&& !!shareInvitation
	) {
		const invitation = props.shareInvitations.find(inv => inv.status === ShareUserStatus.Waiting);
		const sharer = invitation.share.user;

		warningComps.push(renderWarningBox(
			'ShareManager',
			_('%s (%s) would like to share a notebook with you.',
				substrWithEllipsis(sharer?.full_name ?? 'Unknown', 0, 48),
				substrWithEllipsis(sharer?.email ?? 'Unknown', 0, 52)),
		));
	}

	return warningComps;
};

export default connect((state: AppState) => {
	const syncInfo = localSyncInfoFromState(state);

	return {
		themeId: state.settings.theme,
		hasDisabledEncryptionItems: state.hasDisabledEncryptionItems,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedFolderId: state.selectedFolderId,
		notesParentType: state.notesParentType,
		showMissingMasterKeyMessage: showMissingMasterKeyMessage(syncInfo, state.notLoadedMasterKeys),
		hasDisabledSyncItems: state.hasDisabledSyncItems,
		shouldUpgradeSyncTarget: state.settings['sync.upgradeState'] === Setting.SYNC_UPGRADE_STATE_SHOULD_DO,
		mustUpgradeAppMessage: state.mustUpgradeAppMessage,
		syncTargetAppMinVersion: syncInfo.appMinVersion,
		shareInvitations: state.shareService.shareInvitations,
		processingShareInvitationResponse: state.shareService.processingShareInvitationResponse,
		showInvalidJoplinCloudCredential: state.settings['sync.target'] === 10 && state.mustAuthenticate,
	};
})(WarningBannerComponent);
