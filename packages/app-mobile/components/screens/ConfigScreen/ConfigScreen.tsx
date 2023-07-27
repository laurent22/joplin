/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import * as React from 'react';
import { Platform, Linking, View, Switch, ScrollView, Text, TouchableOpacity, Alert, PermissionsAndroid } from 'react-native';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import NavService from '@joplin/lib/services/NavService';
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import checkPermissions from '../../../utils/checkPermissions';
import setIgnoreTlsErrors from '../../../utils/TlsUtils';
import { reg } from '@joplin/lib/registry';
import { State } from '@joplin/lib/reducer';
const { BackButtonService } = require('../../../services/back-button.js');
const VersionInfo = require('react-native-version-info').default;
const { connect } = require('react-redux');
import ScreenHeader from '../../ScreenHeader';
const { _ } = require('@joplin/lib/locale');
import BaseScreenComponent from '../../base-screen';
const { themeStyle } = require('../../global-style.js');
import * as shared from '@joplin/lib/components/shared/config-shared.js';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import biometricAuthenticate from '../../biometrics/biometricAuthenticate';
import configScreenStyles, { ConfigScreenStyles } from './configScreenStyles';
import NoteExportButton from './NoteExportSection/NoteExportButton';
import SettingsButton from './SettingsButton';
import Clipboard from '@react-native-community/clipboard';
import { ReactNode } from 'react';
import { Dispatch } from 'redux';
import SectionHeader from './SectionHeader';
import ExportProfileButton from './NoteExportSection/ExportProfileButton';
import SettingComponent from './SettingComponent';
import ExportDebugReportButton from './NoteExportSection/ExportDebugReportButton';

interface ConfigScreenState {
	settings: any;
	changedSettingKeys: string[];

	fixingSearchIndex: boolean;
	checkSyncConfigResult: { ok: boolean; errorMessage: string }|'checking'|null;
	showAdvancedSettings: boolean;

}

interface ConfigScreenProps {
	settings: any;
	themeId: number;
	navigation: any;

	dispatch: Dispatch;
}

class ConfigScreenComponent extends BaseScreenComponent<ConfigScreenProps, ConfigScreenState> {
	public static navigationOptions(): any {
		return { header: null };
	}

	private componentsY_: Record<string, number> = {};
	private styles_: Record<number, ConfigScreenStyles> = {};
	private scrollViewRef_: React.RefObject<ScrollView>;

	public constructor(props: ConfigScreenProps) {
		super(props);

		this.state = {
			...shared.defaultScreenState,
			fixingSearchIndex: false,
		};

		this.scrollViewRef_ = React.createRef<ScrollView>();

		shared.init(reg);
	}

	private checkSyncConfig_ = async () => {
		// to ignore TLS erros we need to chage the global state of the app, if the check fails we need to restore the original state
		// this call sets the new value and returns the previous one which we can use later to revert the change
		const prevIgnoreTlsErrors = await setIgnoreTlsErrors(this.state.settings['net.ignoreTlsErrors']);
		const result = await shared.checkSyncConfig(this, this.state.settings);
		if (!result || !result.ok) {
			await setIgnoreTlsErrors(prevIgnoreTlsErrors);
		}
	};

	private e2eeConfig_ = () => {
		void NavService.go('EncryptionConfig');
	};

	private saveButton_press = async () => {
		if (this.state.changedSettingKeys.includes('sync.target') && this.state.settings['sync.target'] === SyncTargetRegistry.nameToId('filesystem')) {
			if (Platform.OS === 'android') {
				if (Platform.Version < 29) {
					if (!(await this.checkFilesystemPermission())) {
						Alert.alert(_('Warning'), _('In order to use file system synchronisation your permission to write to external storage is required.'));
					}
				}
			}

			// Save settings anyway, even if permission has not been granted
		}

		// changedSettingKeys is cleared in shared.saveSettings so reading it now
		const shouldSetIgnoreTlsErrors = this.state.changedSettingKeys.includes('net.ignoreTlsErrors');

		await shared.saveSettings(this);

		if (shouldSetIgnoreTlsErrors) {
			await setIgnoreTlsErrors(Setting.value('net.ignoreTlsErrors'));
		}
	};

	private syncStatusButtonPress_ = () => {
		void NavService.go('Status');
	};

	private manageProfilesButtonPress_ = () => {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'ProfileSwitcher',
		});
	};

	private fixSearchEngineIndexButtonPress_ = async () => {
		this.setState({ fixingSearchIndex: true });
		await SearchEngine.instance().rebuildIndex();
		this.setState({ fixingSearchIndex: false });
	};

	private logButtonPress_ = () => {
		void NavService.go('Log');
	};


	public async checkFilesystemPermission() {
		if (Platform.OS !== 'android') {
			// Not implemented yet
			return true;
		}
		return await checkPermissions(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
			title: _('Information'),
			message: _('In order to use file system synchronisation your permission to write to external storage is required.'),
			buttonPositive: _('OK'),
		});
	}

	public UNSAFE_componentWillMount() {
		this.setState({ settings: this.props.settings });
	}

	public styles(): ConfigScreenStyles {
		const themeId = this.props.themeId;

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		this.styles_[themeId] = configScreenStyles(themeId);
		return this.styles_[themeId];
	}

	private onHeaderLayout(key: string, event: any) {
		const layout = event.nativeEvent.layout;
		this.componentsY_[`header_${key}`] = layout.y;
	}

	private onSectionLayout(key: string, event: any) {
		const layout = event.nativeEvent.layout;
		this.componentsY_[`section_${key}`] = layout.y;
	}

	private componentY(key: string): number {
		if ((`section_${key}`) in this.componentsY_) return this.componentsY_[`section_${key}`];
		if ((`header_${key}`) in this.componentsY_) return this.componentsY_[`header_${key}`];
		console.error(`ConfigScreen: Could not find key to scroll to: ${key}`);
		return 0;
	}

	private handleBackButtonPress = (): boolean => {
		const goBack = async () => {
			BackButtonService.removeHandler(this.handleBackButtonPress);
			await BackButtonService.back();
		};

		if (this.state.changedSettingKeys.length > 0) {
			const dialogTitle: string|null = null;
			Alert.alert(
				dialogTitle,
				_('There are unsaved changes.'),
				[{
					text: _('Save changes'),
					onPress: async () => {
						await this.saveButton_press();
						await goBack();
					},
				},
				{
					text: _('Discard changes'),
					onPress: goBack,
				}]
			);

			return true;
		}

		return false;
	};

	public componentDidMount() {
		if (this.props.navigation.state.sectionName) {
			setTimeout(() => {
				this.scrollViewRef_.current.scrollTo({
					x: 0,
					y: this.componentY(this.props.navigation.state.sectionName),
					animated: true,
				});
			}, 200);
		}

		BackButtonService.addHandler(this.handleBackButtonPress);
	}

	public componentWillUnmount() {
		BackButtonService.removeHandler(this.handleBackButtonPress);
	}

	public renderHeader(key: string, title: string) {
		return (
			<SectionHeader
				key={key}
				styles={this.styles().styleSheet}
				title={title}
				onLayout={(event: any) => this.onHeaderLayout(key, event)}
			/>
		);
	}

	private renderButton(key: string, title: string, clickHandler: ()=> void, options: any = null) {
		return (
			<SettingsButton
				key={key}
				title={title}
				clickHandler={clickHandler}
				description={options?.description}
				statusComponent={options?.statusComp}
				styles={this.styles()}
			/>
		);
	}

	public sectionToComponent(key: string, section: any, settings: any) {
		const settingComps = [];

		const styleSheet = this.styles().styleSheet;

		for (let i = 0; i < section.metadatas.length; i++) {
			const md = section.metadatas[i];

			if (section.name === 'sync' && md.key === 'sync.resourceDownloadMode') {
				const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target']);

				if (syncTargetMd.supportsConfigCheck) {
					const messages = shared.checkSyncConfigMessages(this);
					const statusComp = !messages.length ? null : (
						<View style={{ flex: 1, marginTop: 10 }}>
							<Text style={this.styles().styleSheet.descriptionText}>{messages[0]}</Text>
							{messages.length >= 1 ? (
								<View style={{ marginTop: 10 }}>
									<Text style={this.styles().styleSheet.descriptionText}>{messages[1]}</Text>
								</View>
							) : null}
						</View>
					);

					settingComps.push(this.renderButton('check_sync_config_button', _('Check synchronisation configuration'), this.checkSyncConfig_, { statusComp: statusComp }));
				}
			}

			const settingComp = this.settingToComponent(md.key, settings[md.key]);
			settingComps.push(settingComp);
		}

		if (section.name === 'sync') {
			settingComps.push(this.renderButton('e2ee_config_button', _('Encryption Config'), this.e2eeConfig_));
		}

		if (section.name === 'joplinCloud') {
			const description = _('Any email sent to this address will be converted into a note and added to your collection. The note will be saved into the Inbox notebook');
			settingComps.push(
				<View key="joplinCloud">
					<View style={this.styles().styleSheet.settingContainerNoBottomBorder}>
						<Text style={this.styles().styleSheet.settingText}>{_('Email to note')}</Text>
						<Text style={{ fontWeight: 'bold' }}>{this.props.settings['sync.10.inboxEmail']}</Text>
					</View>
					{
						this.renderButton(
							'sync.10.inboxEmail',
							_('Copy to clipboard'),
							() => Clipboard.setString(this.props.settings['sync.10.inboxEmail']),
							{ description }
						)
					}
				</View>
			);
		}

		if (section.name === 'tools') {
			settingComps.push(this.renderButton('profiles_buttons', _('Manage profiles'), this.manageProfilesButtonPress_));
			settingComps.push(this.renderButton('status_button', _('Sync Status'), this.syncStatusButtonPress_));
			settingComps.push(this.renderButton('log_button', _('Log'), this.logButtonPress_));
			settingComps.push(this.renderButton('fix_search_engine_index', this.state.fixingSearchIndex ? _('Fixing search index...') : _('Fix search index'), this.fixSearchEngineIndexButtonPress_, { disabled: this.state.fixingSearchIndex, description: _('Use this to rebuild the search index if there is a problem with search. It may take a long time depending on the number of notes.') }));
		}

		if (section.name === 'export') {
			settingComps.push(<NoteExportButton key='export_as_jex_button' styles={this.styles()} />);
			settingComps.push(<ExportDebugReportButton key='export_report_button' styles={this.styles()}/>);
			settingComps.push(<ExportProfileButton key='export_data' styles={this.styles()}/>);
		}

		if (section.name === 'featureFlags') {
			const featureFlagKeys = Setting.featureFlagKeys(AppType.Mobile);
			if (featureFlagKeys.length) {
				settingComps.push(<View key="featureFlagsContainer">{this.renderFeatureFlags(settings, featureFlagKeys)}</View>);
			}
		}

		if (section.name === 'moreInfo') {
			if (Platform.OS === 'android' && Platform.Version >= 23) {
				// Note: `PermissionsAndroid` doesn't work so we have to ask the user to manually
				// set these permissions. https://stackoverflow.com/questions/49771084/permission-always-returns-never-ask-again

				settingComps.push(
					<View key="permission_info" style={styleSheet.settingContainer}>
						<View key="permission_info_wrapper">
							<Text key="perm1a" style={styleSheet.settingText}>
								{_('To work correctly, the app needs the following permissions. Please enable them in your phone settings, in Apps > Joplin > Permissions')}
							</Text>
							<Text key="perm2" style={styleSheet.permissionText}>
								{_('- Storage: to allow attaching files to notes and to enable filesystem synchronisation.')}
							</Text>
							<Text key="perm3" style={styleSheet.permissionText}>
								{_('- Camera: to allow taking a picture and attaching it to a note.')}
							</Text>
							<Text key="perm4" style={styleSheet.permissionText}>
								{_('- Location: to allow attaching geo-location information to a note.')}
							</Text>
						</View>
					</View>
				);
			}

			settingComps.push(
				<View key="donate_link" style={styleSheet.settingContainer}>
					<TouchableOpacity
						onPress={() => {
							void Linking.openURL('https://joplinapp.org/donate/');
						}}
					>
						<Text key="label" style={styleSheet.linkText}>
							{_('Make a donation')}
						</Text>
					</TouchableOpacity>
				</View>
			);

			settingComps.push(
				<View key="website_link" style={styleSheet.settingContainer}>
					<TouchableOpacity
						onPress={() => {
							void Linking.openURL('https://joplinapp.org/');
						}}
					>
						<Text key="label" style={styleSheet.linkText}>
							{_('Joplin website')}
						</Text>
					</TouchableOpacity>
				</View>
			);

			settingComps.push(
				<View key="privacy_link" style={styleSheet.settingContainer}>
					<TouchableOpacity
						onPress={() => {
							void Linking.openURL('https://joplinapp.org/privacy/');
						}}
					>
						<Text key="label" style={styleSheet.linkText}>
							{_('Privacy Policy')}
						</Text>
					</TouchableOpacity>
				</View>
			);

			settingComps.push(
				<View key="version_info_app" style={styleSheet.settingContainer}>
					<Text style={styleSheet.settingText}>{`Joplin ${VersionInfo.appVersion}`}</Text>
				</View>
			);

			settingComps.push(
				<View key="version_info_db" style={styleSheet.settingContainer}>
					<Text style={styleSheet.settingText}>{_('Database v%s', reg.db().version())}</Text>
				</View>
			);

			settingComps.push(
				<View key="version_info_fts" style={styleSheet.settingContainer}>
					<Text style={styleSheet.settingText}>{_('FTS enabled: %d', this.props.settings['db.ftsEnabled'])}</Text>
				</View>
			);

			settingComps.push(
				<View key="version_info_hermes" style={styleSheet.settingContainer}>
					<Text style={styleSheet.settingText}>{_('Hermes enabled: %d', (global as any).HermesInternal ? 1 : 0)}</Text>
				</View>
			);
		}

		if (!settingComps.length) return null;

		return (
			<View key={key} onLayout={(event: any) => this.onSectionLayout(key, event)}>
				{this.renderHeader(section.name, Setting.sectionNameToLabel(section.name))}
				<View>{settingComps}</View>
			</View>
		);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	private renderToggle(key: string, label: string, value: any, updateSettingValue: Function, descriptionComp: any = null) {
		const theme = themeStyle(this.props.themeId);

		return (
			<View key={key}>
				<View style={this.styles().getContainerStyle(false)}>
					<Text key="label" style={this.styles().styleSheet.switchSettingText}>
						{label}
					</Text>
					<Switch key="control" style={this.styles().styleSheet.switchSettingControl} trackColor={{ false: theme.dividerColor }} value={value} onValueChange={(value: any) => void updateSettingValue(key, value)} />
				</View>
				{descriptionComp}
			</View>
		);
	}

	private handleSetting = async (key: string, value: any): Promise<boolean> => {
		// When the user tries to enable biometrics unlock, we ask for the
		// fingerprint or Face ID, and if it's correct we save immediately. If
		// it's not, we don't turn on the setting.
		if (key === 'security.biometricsEnabled' && !!value) {
			try {
				await biometricAuthenticate();
				shared.updateSettingValue(this, key, value, async () => await this.saveButton_press());
			} catch (error) {
				shared.updateSettingValue(this, key, false);
				Alert.alert(error.message);
			}
			return true;
		}

		if (key === 'security.biometricsEnabled' && !value) {
			shared.updateSettingValue(this, key, value, async () => await this.saveButton_press());
			return true;
		}

		return false;
	};

	public settingToComponent(key: string, value: any) {
		const updateSettingValue = async (key: string, value: any) => {
			const handled = await this.handleSetting(key, value);
			if (!handled) shared.updateSettingValue(this, key, value);
		};

		return (
			<SettingComponent
				key={key}
				settingId={key}
				value={value}
				themeId={this.props.themeId}
				updateSettingValue={updateSettingValue}
				styles={this.styles()}
			/>
		);
	}

	private renderFeatureFlags(settings: any, featureFlagKeys: string[]): any[] {
		const updateSettingValue = (key: string, value: any) => {
			return shared.updateSettingValue(this, key, value);
		};

		const output: any[] = [];
		for (const key of featureFlagKeys) {
			output.push(this.renderToggle(key, key, settings[key], updateSettingValue));
		}
		return output;
	}

	public render() {
		const settings = this.state.settings;
		const settingComps = shared.settingsToComponents2(this, AppType.Mobile, settings);

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader title={_('Configuration')} showSaveButton={true} showSearchButton={false} showSideMenuButton={false} saveButtonDisabled={!this.state.changedSettingKeys.length} onSaveButtonPress={this.saveButton_press} />
				<ScrollView ref={this.scrollViewRef_}>{settingComps as ReactNode}</ScrollView>
			</View>
		);
	}
}

const ConfigScreen = connect((state: State) => {
	return {
		settings: state.settings,
		themeId: state.settings.theme,
	};
})(ConfigScreenComponent);

export default ConfigScreen;
