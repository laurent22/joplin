import * as React from 'react';
import { useState } from 'react';
import { connect } from 'react-redux';
import { Platform } from 'react-native';
import { AppState } from '../../utils/types';
import WarningBox, { WarningBoxTarget } from './WarningBox';
import { _ } from '@joplin/lib/locale';
import { showMissingMasterKeyMessage } from '@joplin/lib/services/e2ee/utils';
import { localSyncInfoFromState } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import Setting from '@joplin/lib/models/Setting';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { hasValidBaseUrl, isJoplinOAuthSyncTarget } from '@joplin/lib/services/joplinOAuthUtils';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import { reg } from '@joplin/lib/registry';

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
	showInvalidJoplinOAuthCredential: boolean;
	syncTargetId: number;
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

const WarningBannerComponent: React.FC<Props> = props => {
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

	const renderWarningBox = (key: string, message: string, target: WarningBoxTarget) => {
		return <WarningBox
			key={key}
			themeId={props.themeId}
			target={target}
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
						{ url: androidPreReleaseUrl },
					);
				}

				return renderWarningBox(
					'UpgradeApp',
					upgradeMessage(_('Update it from Google Play')),
					{ url: androidGooglePlayUrl },
				);
			}

			if (Platform.OS === 'ios') {
				return renderWarningBox(
					'UpgradeApp',
					upgradeMessage(_('Update it from the App Store')),
					{ url: iosAppStoreUrl },
				);
			}

			return renderWarningBox('UpgradeApp', _('In order to synchronise, Please upgrade your application to version %s', props.syncTargetAppMinVersion), null);
		}

		return renderWarningBox('UpgradeApp', props.mustUpgradeAppMessage, null);
	};

	if (props.showMissingMasterKeyMessage) {
		warningComps.push(renderWarningBox('missing_master_key', _('Press to set the decryption password.'), { screen: 'EncryptionConfig' }));
	}
	if (props.hasDisabledSyncItems) {
		warningComps.push(renderWarningBox('disabled_items', _('Some items cannot be synchronised. Press for more info.'), { screen: 'Status' }));
	}
	if (props.shouldUpgradeSyncTarget && props.showShouldUpgradeSyncTargetMessage !== false) {
		warningComps.push(renderWarningBox('upgrade_sync', _('The sync target needs to be upgraded. Press this banner to proceed.'), { screen: 'UpgradeSyncTarget' }));
	}
	if (props.mustUpgradeAppMessage) {
		warningComps.push(renderMustUpgradeAppMessage());
	}
	if (props.hasDisabledEncryptionItems) {
		warningComps.push(renderWarningBox('cannot_decrypt', _('Some items cannot be decrypted.'), { screen: 'Status' }));
	}
	if (props.showInvalidJoplinOAuthCredential) {
		const syncTarget = reg.syncTarget(props.syncTargetId);
		const syncTargetLabel = SyncTargetRegistry.idToLabelOrEmpty(props.syncTargetId);
		if (isJoplinOAuthSyncTarget(props.syncTargetId) && !hasValidBaseUrl(props.syncTargetId, null)) {
			warningComps.push(renderWarningBox(
				'auth', _('Invalid or missing %s URL.', syncTargetLabel), { screen: 'Config', screenProps: { sectionName: 'sync' } },
			));
		} else {
			warningComps.push(renderWarningBox(
				'auth', _('Your %s credentials are invalid, please log in.', syncTargetLabel), { screen: syncTarget.authRouteName() },
			));
		}
	}

	const shareInvitation = props.shareInvitations.find(inv => inv.status === ShareUserStatus.Waiting);
	if (
		!props.processingShareInvitationResponse
		&& !!shareInvitation
	) {
		const invitation = props.shareInvitations.find(inv => inv.status === ShareUserStatus.Waiting);
		const sharer = invitation.share.user;

		warningComps.push(renderWarningBox(
			'share',
			_('%s (%s) would like to share a notebook with you.',
				substrWithEllipsis(sharer?.full_name ?? 'Unknown', 0, 48),
				substrWithEllipsis(sharer?.email ?? 'Unknown', 0, 52)),
			{ screen: 'ShareManager' },
		));
	}

	return warningComps;
};

const isSyncLoginRoute = (state: AppState) => {
	const syncTargetId = state.settings['sync.target'];
	const syncTarget = syncTargetId ? reg.syncTarget(syncTargetId) : null;
	if (syncTarget) {
		return state.route?.routeName === syncTarget.authRouteName();
	}

	return false;
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
		showInvalidJoplinOAuthCredential: isJoplinOAuthSyncTarget(state.settings['sync.target']) && !isSyncLoginRoute(state) && state.mustAuthenticate,
		syncTargetId: state.settings['sync.target'],
	};
})(WarningBannerComponent);
