import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';
import WarningBox from './WarningBox';
import { _ } from '@joplin/lib/locale';
import { showMissingMasterKeyMessage } from '@joplin/lib/services/e2ee/utils';
import { localSyncInfoFromState } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	themeId: number;
	showMissingMasterKeyMessage: boolean;
	hasDisabledSyncItems: boolean;
	shouldUpgradeSyncTarget: boolean;
	showShouldUpgradeSyncTargetMessage: boolean|undefined;
	hasDisabledEncryptionItems: boolean;
	mustUpgradeAppMessage: string;
}


export const WarningBannerComponent: React.FC<Props> = props => {
	const warningComps = [];

	const renderWarningBox = (screen: string, message: string) => {
		return <WarningBox
			key={screen}
			themeId={props.themeId}
			targetScreen={screen}
			message={message}
			testID='warning-box'
		/>;
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
		warningComps.push(renderWarningBox('UpgradeApp', props.mustUpgradeAppMessage));
	}
	if (props.hasDisabledEncryptionItems) {
		warningComps.push(renderWarningBox('Status', _('Some items cannot be decrypted.')));
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
	};
})(WarningBannerComponent);
