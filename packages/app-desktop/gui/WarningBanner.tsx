import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import * as React from 'react';
import { Dispatch } from 'redux';
import checkForUpdates, { isReleaseVersion } from '../checkForUpdates';
import bridge from '../services/bridge';
import restart from '../services/restart';
import invitationRespond from '@joplin/lib/services/share/invitationRespond';
import { _ } from '@joplin/lib/locale';
import { ShareInvitation } from '@joplin/lib/services/share/reducer';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { useEffect, useRef, useState } from 'react';
import Logger from '@joplin/utils/Logger';
import { AppState } from '../app.reducer';
import { localSyncInfoFromState } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { showMissingMasterKeyMessage, showUnknownKeyFormatBanner } from '@joplin/lib/services/e2ee/utils';
import shouldShowMissingPasswordWarning from '@joplin/lib/components/shared/config/shouldShowMissingPasswordWarning';
import { isJoplinOAuthSyncTarget, openSyncSettings } from '@joplin/lib/services/joplinOAuthUtils';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import NavService from '@joplin/lib/services/NavService';
import { connect } from 'react-redux';

const logger = Logger.create('WarningBanner');

interface Props {
	dispatch: Dispatch;
	isSafeMode: boolean;
	hasMissingSyncCredentials: boolean;
	shouldUpgradeSyncTarget: boolean;
	hasDisabledEncryptionItems: boolean;
	showNeedUpgradingMasterKeyMessage: boolean;
	showShouldReencryptMessage: boolean;
	processingShareInvitationResponse: boolean;
	shareInvitations: ShareInvitation[];
	hasDisabledSyncItems: boolean;
	showUnknownKeyFormatMessage: boolean;
	showMissingMasterKeyMessage: boolean;
	mustUpgradeAppMessage: string;
	syncTargetAppMinVersion: string;
	shouldSwitchToAppleSiliconVersion: boolean;
	showInvalidJoplinServerCredential: boolean;
	syncTargetName: string;

	onShow: ()=> void;
	onHide: ()=> void;
	height: number;
}

const WarningBanner: React.FC<Props> = props => {
	const propsRef = useRef(props);
	propsRef.current = props;

	const renderNotificationMessage = (
		message: string, callForAction: string = null, callForActionHandler: ()=> void = null, callForAction2: string = null, callForActionHandler2: ()=> void = null,
	) => {
		return <NotificationMessage
			message={message}
			callForAction={callForAction}
			callForActionHandler={callForActionHandler}
			callForAction2={callForAction2}
			callForActionHandler2={callForActionHandler2}
		/>;
	};

	const onViewStatusScreen = () => {
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Status',
		});
	};

	const onViewEncryptionConfigScreen = () => {
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Config',
			props: {
				defaultSection: 'encryption',
			},
		});
	};

	const onViewJoplinServerLoginScreen = () => {
		const syncTarget = Setting.value('sync.target');
		if (!isJoplinOAuthSyncTarget(syncTarget)) {
			void shim.showErrorDialog(_('Error: Not connected to Joplin Cloud or Joplin Server'));
			return;
		}

		const routeName = SyncTargetRegistry.classById(syncTarget).authRouteName();
		if (routeName) {
			void NavService.go(routeName);
		} else {
			void openSyncSettings();
		}
	};

	const onDisableSync = () => {
		Setting.setValue('sync.target', null);
	};

	const onViewSyncSettingsScreen = () => {
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Config',
			props: {
				defaultSection: 'sync',
			},
		});
	};

	const onDownloadAppleSiliconVersion = () => {
		// The website should redirect to the correct version
		shim.openUrl('https://joplinapp.org/download/');
	};

	const onCheckForUpdates = () => {
		void checkForUpdates(false, bridge().mainWindow(), { includePreReleases: false });
	};

	const onRestartAndUpgrade = async () => {
		Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_MUST_DO);
		await Setting.saveAll();
		await restart();
	};

	const onDisableSafeModeAndRestart = async () => {
		Setting.setValue('isSafeMode', false);
		await Setting.saveAll();
		await restart();
	};

	const onInvitationRespond = async (shareUserId: string, folderId: string, masterKey: MasterKeyEntity, accept: boolean) => {
		await invitationRespond(shareUserId, folderId, masterKey, accept);
	};

	const showShareInvitationNotification = () => {
		if (props.processingShareInvitationResponse) return false;
		return !!props.shareInvitations.find(i => i.status === 0);
	};

	const appMinVersionState = useAppMinVersionState({ appMinVersion: props.syncTargetAppMinVersion, mustUpgradeAppMessage: props.mustUpgradeAppMessage });

	let msg = null;

	if (props.isSafeMode) {
		msg = renderNotificationMessage(
			_('Safe mode is currently active. Note rendering and all plugins are temporarily disabled.'),
			_('Disable safe mode and restart'),
			onDisableSafeModeAndRestart,
		);
	} else if (props.hasMissingSyncCredentials) {
		msg = renderNotificationMessage(
			_('The synchronisation password is missing.'),
			_('Set the password'),
			onViewSyncSettingsScreen,
		);
	} else if (props.shouldUpgradeSyncTarget) {
		msg = renderNotificationMessage(
			_('The sync target needs to be upgraded before Joplin can sync. The operation may take a few minutes to complete and the app needs to be restarted. To proceed please click on the link.'),
			_('Restart and upgrade'),
			onRestartAndUpgrade,
		);
	} else if (props.hasDisabledEncryptionItems) {
		msg = renderNotificationMessage(
			_('Some items cannot be decrypted.'),
			_('View them now'),
			onViewStatusScreen,
		);
	} else if (props.showNeedUpgradingMasterKeyMessage) {
		msg = renderNotificationMessage(
			_('One of your master keys use an obsolete encryption method.'),
			_('View them now'),
			onViewEncryptionConfigScreen,
		);
	} else if (props.showShouldReencryptMessage) {
		msg = renderNotificationMessage(
			_('The default encryption method has been changed, you should re-encrypt your data.'),
			_('More info'),
			onViewEncryptionConfigScreen,
		);
	} else if (showShareInvitationNotification()) {
		const invitation = props.shareInvitations.find(inv => inv.status === 0);
		const sharer = invitation.share.user;

		msg = renderNotificationMessage(
			_('%s (%s) would like to share a notebook with you.', sharer.full_name, sharer.email),
			_('Accept'),
			() => onInvitationRespond(invitation.id, invitation.share.folder_id, invitation.master_key, true),
			_('Reject'),
			() => onInvitationRespond(invitation.id, invitation.share.folder_id, invitation.master_key, false),
		);
	} else if (props.hasDisabledSyncItems) {
		msg = renderNotificationMessage(
			_('Some items cannot be synchronised.'),
			_('View them now'),
			onViewStatusScreen,
		);
	} else if (props.showMissingMasterKeyMessage) {
		msg = renderNotificationMessage(
			_('One or more master keys need a password.'),
			_('Set the password'),
			onViewEncryptionConfigScreen,
		);
	} else if (props.mustUpgradeAppMessage) {
		if (!props.syncTargetAppMinVersion) {
			msg = renderNotificationMessage(props.mustUpgradeAppMessage);
		} else if (appMinVersionState.didReleaseLoadFail) {
			msg = renderNotificationMessage(
				_(
					'In order to synchronise, Please upgrade your application to version %s. Joplin could not check update information.',
					props.syncTargetAppMinVersion,
				),
			);
		} else if (appMinVersionState.isRelease === false && shim.isLinux()) {
			const callForAction = _('Download it from GitHub Releases');
			msg = renderNotificationMessage(
				_(
					'In order to synchronise, Please upgrade your application to version %s: %s or update it using your package manager',
					props.syncTargetAppMinVersion,
					callForAction,
				),
				callForAction,
				() => shim.openUrl('https://github.com/laurent22/joplin/releases'),
			);
		} else if (appMinVersionState.isRelease !== null) {
			const isTargetPreRelease = appMinVersionState.isRelease === false;
			const callForAction = isTargetPreRelease ? _('Download it from GitHub Releases') : _('Check for updates');
			msg = renderNotificationMessage(
				_(
					'In order to synchronise, Please upgrade your application to version %s: %s',
					props.syncTargetAppMinVersion,
					callForAction,
				),
				callForAction,
				isTargetPreRelease ? () => shim.openUrl('https://github.com/laurent22/joplin/releases') : onCheckForUpdates,
			);
		} else {
			msg = renderNotificationMessage(props.mustUpgradeAppMessage);
		}
	} else if (props.showUnknownKeyFormatMessage) {
		msg = renderNotificationMessage(
			_('One or more encryption keys are stored in an unknown format.'),
			_('Manage'),
			onViewEncryptionConfigScreen,
		);
	} else if (props.shouldSwitchToAppleSiliconVersion) {
		msg = renderNotificationMessage(
			_('You are running the Intel version of Joplin on an Apple Silicon processor. Download the Apple Silicon one for better performance.'),
			_('Download it now'),
			onDownloadAppleSiliconVersion,
		);
	} else if (props.showInvalidJoplinServerCredential) {
		msg = renderNotificationMessage(
			_('Your %s credentials are invalid, please log in.', props.syncTargetName),
			_('Log in to %s.', props.syncTargetName),
			onViewJoplinServerLoginScreen,
			_('Disable synchronisation'),
			onDisableSync,
		);
	}

	const visible = !!msg;
	const lastVisibleRef = useRef(false);

	useEffect(() => {
		if (visible !== lastVisibleRef.current) {
			lastVisibleRef.current = visible;

			if (visible) {
				propsRef.current.onShow();
			} else {
				propsRef.current.onHide();
			}
		}
	}, [visible]);

	if (!visible) return null;

	return (
		<div
			style={{ height: props.height }}
			className='warning-banner -header'
		>
			<span
				className='content'
				role='alert'
				// role='alert' has an implicit aria-live='assertive', which tells screen readers that changes
				// to the warning's content should be announced as soon as possible. However, since it's generally
				// okay for announcements related to these notifications to be delayed, use aria-live='polite'.
				aria-live='polite'
			>{msg}</span>
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	const syncInfo = localSyncInfoFromState(state);
	const showNeedUpgradingEnabledMasterKeyMessage = !!EncryptionService.instance().masterKeysThatNeedUpgrading(syncInfo.masterKeys.filter((k) => !!k.enabled)).length;

	return {
		hasDisabledSyncItems: state.hasDisabledSyncItems,
		hasDisabledEncryptionItems: state.hasDisabledEncryptionItems,
		showMissingMasterKeyMessage: showMissingMasterKeyMessage(syncInfo, state.notLoadedMasterKeys),
		showUnknownKeyFormatMessage: showUnknownKeyFormatBanner(syncInfo),
		showNeedUpgradingMasterKeyMessage: showNeedUpgradingEnabledMasterKeyMessage,
		showShouldReencryptMessage: state.settings['encryption.shouldReencrypt'] >= Setting.SHOULD_REENCRYPT_YES,
		shouldUpgradeSyncTarget: state.settings['sync.upgradeState'] === Setting.SYNC_UPGRADE_STATE_SHOULD_DO,
		hasMissingSyncCredentials: shouldShowMissingPasswordWarning(state.settings['sync.target'], state.settings),
		shareInvitations: state.shareService.shareInvitations,
		processingShareInvitationResponse: state.shareService.processingShareInvitationResponse,
		isSafeMode: state.settings.isSafeMode,
		mustUpgradeAppMessage: state.mustUpgradeAppMessage,
		syncTargetAppMinVersion: syncInfo.appMinVersion,
		showInvalidJoplinServerCredential: isJoplinOAuthSyncTarget(state.settings['sync.target']) && state.mustAuthenticate,
		syncTargetName: SyncTargetRegistry.idToLabelOrEmpty(state.settings['sync.target']),
		shouldSwitchToAppleSiliconVersion: shim.isAppleSilicon() && shim.isMac() && process.arch !== 'arm64',
	};
};

export default connect(mapStateToProps)(WarningBanner);


type CallForActionHandler = ()=> void;
interface NotificationMessageProps {
	message: string;
	callForAction: string|null;
	callForActionHandler: CallForActionHandler|null;
	callForAction2: string|null;
	callForActionHandler2: CallForActionHandler|null;
}

const NotificationMessage: React.FC<NotificationMessageProps> = ({ message, callForAction, callForActionHandler, callForAction2, callForActionHandler2 }) => {
	if (!callForAction) return <span>{message}</span>;

	const cfa = (
		<a href="#" className='warning-banner-link -underline' onClick={() => callForActionHandler()}>
			{callForAction}
		</a>
	);

	const cfa2 = !callForAction2 ? null : (
		<a href="#" className='warning-banner-link -underline' onClick={() => callForActionHandler2()}>
			{callForAction2}
		</a>
	);

	if (!callForAction2 && message.includes(callForAction)) {
		const actionIndex = message.indexOf(callForAction);
		return (
			<span>
				{message.substring(0, actionIndex)}
				{cfa}
				{message.substring(actionIndex + callForAction.length)}
			</span>
		);
	}

	return (
		<span>
			{message}{callForAction ? ' ' : ''}
			{cfa}{callForAction2 ? ' / ' : ''}{cfa2}
		</span>
	);
};


interface AppMinVersionIsReleaseProps {
	appMinVersion: string;
	mustUpgradeAppMessage: string;
}

const useAppMinVersionState = (props: AppMinVersionIsReleaseProps) => {
	const version = props.appMinVersion;
	const [state, setState] = useState({
		isRelease: null,
		didReleaseLoadFail: false,
	});

	useAsyncEffect(async (event) => {
		setState({ isRelease: null, didReleaseLoadFail: false });
		if (!props.mustUpgradeAppMessage || !version) return;

		try {
			const isRelease = await isReleaseVersion(version);
			if (event.cancelled) return;
			setState({
				isRelease,
				didReleaseLoadFail: isRelease === null,
			});
		} catch (error) {
			logger.error(error);
			if (event.cancelled) return;
			setState(state => ({
				...state,
				didReleaseLoadFail: true,
			}));
		}
	}, [version, props.mustUpgradeAppMessage]);

	return state;
};
