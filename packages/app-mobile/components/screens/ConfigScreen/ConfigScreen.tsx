import * as React from 'react';
import { Platform, Linking, View, Switch, ScrollView, Text, TouchableOpacity, Alert, PermissionsAndroid, Dimensions, AccessibilityInfo } from 'react-native';
import Setting, { AppType, SettingItem, SettingMetadataSection } from '@joplin/lib/models/Setting';
import NavService from '@joplin/lib/services/NavService';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import checkPermissions from '../../../utils/checkPermissions';
import setIgnoreTlsErrors from '../../../utils/TlsUtils';
import { reg } from '@joplin/lib/registry';
import { State } from '@joplin/lib/reducer';
const { BackButtonService } = require('../../../services/back-button.js');
import { connect } from 'react-redux';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import BaseScreenComponent from '../../base-screen';
import { themeStyle } from '../../global-style';
import * as shared from '@joplin/lib/components/shared/config/config-shared';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import biometricAuthenticate from '../../biometrics/biometricAuthenticate';
import configScreenStyles, { ConfigScreenStyles } from './configScreenStyles';
import NoteExportButton, { exportButtonDescription, exportButtonDefaultTitle } from './NoteExportSection/NoteExportButton';
import SettingsButton from './SettingsButton';
import Clipboard from '@react-native-clipboard/clipboard';
import { ReactElement, ReactNode } from 'react';
import SectionHeader from './SectionHeader';
import ExportProfileButton, { exportProfileButtonTitle } from './NoteExportSection/ExportProfileButton';
import SettingComponent from './SettingComponent';
import ExportDebugReportButton, { exportDebugReportTitle } from './NoteExportSection/ExportDebugReportButton';
import SectionSelector from './SectionSelector';
import { Button, TextInput } from 'react-native-paper';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PluginStates, { getSearchText as getPluginStatesSearchText } from './plugins/PluginStates';
import PluginUploadButton, { canInstallPluginsFromFile, buttonLabel as pluginUploadButtonSearchText } from './plugins/PluginUploadButton';
import NoteImportButton, { importButtonDefaultTitle, importButtonDescription } from './NoteExportSection/NoteImportButton';
import SectionDescription from './SectionDescription';
import EnablePluginSupportPage from './plugins/EnablePluginSupportPage';
import getPackageInfo from '../../../utils/getPackageInfo';
import versionInfo from '@joplin/lib/versionInfo';

interface ConfigScreenState {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	settings: any;
	changedSettingKeys: string[];

	searchQuery: string;
	searching: boolean;

	fixingSearchIndex: boolean;
	checkSyncConfigResult: { ok: boolean; errorMessage: string }|'checking'|null;
	showAdvancedSettings: boolean;

	selectedSectionName: string|null;
	sidebarWidth: number;
}

interface ConfigScreenProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	settings: any;
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	navigation: any;
}

class ConfigScreenComponent extends BaseScreenComponent<ConfigScreenProps, ConfigScreenState> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			selectedSectionName: null,
			fixingSearchIndex: false,
			sidebarWidth: 100,
			searchQuery: '',
			searching: false,
		};

		this.scrollViewRef_ = React.createRef<ScrollView>();

		shared.init(reg);
	}

	private checkSyncConfig_ = async () => {
		if (this.state.settings['sync.target'] === SyncTargetRegistry.nameToId('joplinCloud')) {
			const isAuthenticated = await reg.syncTarget().isAuthenticated();
			if (!isAuthenticated) {
				void NavService.go('JoplinCloudLogin');
				return;
			}
		}
		// to ignore TLS errors we need to change the global state of the app, if the check fails we need to restore the original state
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

		const done = await shared.saveSettings(this);
		if (!done) return;

		if (shouldSetIgnoreTlsErrors) {
			await setIgnoreTlsErrors(Setting.value('net.ignoreTlsErrors'));
		}
	};

	private syncStatusButtonPress_ = () => {
		void NavService.go('Status');
	};

	private manageProfilesButtonPress_ = () => {
		void NavService.go('ProfileSwitcher');
	};

	private fixSearchEngineIndexButtonPress_ = async () => {
		this.setState({ fixingSearchIndex: true });
		await SearchEngine.instance().rebuildIndex();
		this.setState({ fixingSearchIndex: false });
	};

	private logButtonPress_ = () => {
		void NavService.go('Log');
	};

	private manageSharesPress_ = () => {
		void NavService.go('ShareManager');
	};

	private setShowSearch_(searching: boolean) {
		if (searching !== this.state.searching) {
			this.setState({ searching });
			AccessibilityInfo.announceForAccessibility(searching ? _('Search shown') : _('Search hidden'));
		}
	}

	private onSearchButtonPress_ = () => {
		this.setShowSearch_(!this.state.searching);
	};

	private onSearchUpdate_ = (newQuery: string) => {
		this.setState({ searchQuery: newQuery });
	};

	private updateSidebarWidth = () => {
		const windowWidth = Dimensions.get('window').width;

		let sidebarNewWidth = windowWidth;

		const sidebarValidWidths = [280, 230];
		const maxFractionOfWindowSize = 1 / 3;
		for (const width of sidebarValidWidths) {
			if (width < windowWidth * maxFractionOfWindowSize) {
				sidebarNewWidth = width;
				break;
			}
		}

		this.setState({ sidebarWidth: sidebarNewWidth });
	};

	private navigationFillsScreen() {
		const windowWidth = Dimensions.get('window').width;
		return this.state.sidebarWidth > windowWidth / 2;
	}

	private onJumpToSection_ = (section: string) => {
		const label = Setting.sectionNameToLabel(section);
		AccessibilityInfo.announceForAccessibility(_('Opening section %s', label));
		this.setState({
			selectedSectionName: section,
			searching: false,
		});
	};

	private showSectionNavigation_ = () => {
		this.setState({ selectedSectionName: null });
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private onHeaderLayout(key: string, event: any) {
		const layout = event.nativeEvent.layout;
		this.componentsY_[`header_${key}`] = layout.y;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	private hasUnsavedChanges() {
		return this.state.changedSettingKeys.length > 0;
	}

	private promptSaveChanges(): Promise<void> {
		return new Promise(resolve => {
			if (this.hasUnsavedChanges()) {
				const dialogTitle: string|null = null;
				Alert.alert(
					dialogTitle,
					_('There are unsaved changes.'),
					[{
						text: _('Save changes'),
						onPress: async () => {
							await this.saveButton_press();
							resolve();
						},
					},
					{
						text: _('Discard changes'),
						onPress: () => resolve(),
					}],
				);
			} else {
				resolve();
			}
		});
	}

	private handleNavigateToNewScreen = async (): Promise<boolean> => {
		await this.promptSaveChanges();

		// Continue navigation
		return false;
	};

	private handleBackButtonPress = (): boolean => {
		const goBack = async () => {
			BackButtonService.removeHandler(this.handleBackButtonPress);
			await BackButtonService.back();
		};

		// Cancel search on back
		if (this.state.searching) {
			this.setShowSearch_(false);
			return true;
		}

		// Show navigation when pressing "back" (unless always visible).
		if (this.state.selectedSectionName && this.navigationFillsScreen()) {
			this.showSectionNavigation_();
			return true;
		}

		if (this.hasUnsavedChanges()) {
			void (async () => {
				await this.promptSaveChanges();
				await goBack();
			})();
			return true;
		}

		return false;
	};

	public componentDidMount() {
		if (this.props.navigation.state.sectionName) {
			this.setState({ selectedSectionName: this.props.navigation.state.sectionName });
			setTimeout(() => {
				this.scrollViewRef_.current.scrollTo({
					x: 0,
					y: this.componentY(this.props.navigation.state.sectionName),
					animated: true,
				});
			}, 200);
		}

		BackButtonService.addHandler(this.handleBackButtonPress);
		NavService.addHandler(this.handleNavigateToNewScreen);
		Dimensions.addEventListener('change', this.updateSidebarWidth);
		this.updateSidebarWidth();
	}

	public componentWillUnmount() {
		BackButtonService.removeHandler(this.handleBackButtonPress);
		NavService.removeHandler(this.handleNavigateToNewScreen);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private renderButton(key: string, title: string, clickHandler: ()=> void, options: any = null) {
		return (
			<SettingsButton
				key={key}
				title={title}
				clickHandler={clickHandler}
				description={options?.description}
				statusComponent={options?.statusComp}
				styles={this.styles()}
				disabled={options?.disabled}
			/>
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public sectionToComponent(key: string, section: SettingMetadataSection, settings: any, isSelected: boolean) {
		const settingComps: ReactElement[] = [];
		const advancedSettingComps: ReactElement[] = [];

		const headerTitle = Setting.sectionNameToLabel(section.name);
		const sectionDescription = Setting.sectionDescription(key, AppType.Mobile);
		if (sectionDescription && !this.state.searching) {
			settingComps.push(
				<SectionDescription
					key='section-description'
					content={sectionDescription}
				/>,
			);
		}

		const matchesSearchQuery = (relatedText: string|string[]) => {
			let searchThrough;
			if (Array.isArray(relatedText)) {
				searchThrough = relatedText.join('\n');
			} else {
				searchThrough = relatedText;
			}
			searchThrough = searchThrough.toLocaleLowerCase();

			const searchQuery = this.state.searchQuery.toLocaleLowerCase().trim();

			const hasSearchMatches =
				headerTitle.toLocaleLowerCase() === searchQuery
				|| searchThrough.includes(searchQuery);

			// Don't show results when the search input is empty
			return this.state.searchQuery.length > 0 && hasSearchMatches;
		};

		const addSettingComponent = (
			component: ReactElement,
			relatedText: string|string[],
			settingMetadata?: SettingItem,
		) => {
			const hiddenBySearch = this.state.searching && !matchesSearchQuery(relatedText);
			if (component && !hiddenBySearch) {
				if (settingMetadata?.advanced) {
					advancedSettingComps.push(component);
				} else {
					settingComps.push(component);
				}
			}
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const addSettingButton = (key: string, title: string, clickHandler: ()=> void, options: any = null) => {
			const relatedText = [title];
			if (typeof options === 'object' && options?.description) {
				relatedText.push(options.description);
			}
			addSettingComponent(this.renderButton(key, title, clickHandler, options), relatedText);
		};

		const styleSheet = this.styles().styleSheet;
		const addSettingLink = (key: string, title: string, target: string) => {
			const component = (
				<View key={key} style={styleSheet.settingContainer}>
					<TouchableOpacity
						onPress={() => {
							void Linking.openURL(target);
						}}
						accessibilityRole='link'
					>
						<Text key="label" style={styleSheet.linkText}>
							{title}
						</Text>
					</TouchableOpacity>
				</View>
			);

			addSettingComponent(component, title);
		};

		const addSettingText = (key: string, text: string) => {
			addSettingComponent(
				<View key={key} style={styleSheet.settingContainer}>
					<Text style={styleSheet.settingText}>{text}</Text>
				</View>,
				text,
			);
		};

		for (let i = 0; i < section.metadatas.length; i++) {
			const md = section.metadatas[i];

			// Handled below
			if (md.key === 'plugins.states') continue;

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

					addSettingButton('check_sync_config_button', _('Check synchronisation configuration'), this.checkSyncConfig_, { statusComp: statusComp });
				}
			}

			const settingComp = this.settingToComponent(md.key, settings[md.key]);
			const relatedText = [md.label?.() ?? '', md.description?.() ?? ''];
			addSettingComponent(
				settingComp,
				relatedText,
				md,
			);
		}

		if (section.name === 'plugins') {
			const pluginStatesKey = 'plugins.states';
			const pluginService = PluginService.instance();

			const updatePluginStates = (newSettingValue: PluginSettings) => {
				const value = pluginService.serializePluginSettings(newSettingValue);
				shared.updateSettingValue(this, pluginStatesKey, value);
			};

			if (settings['plugins.pluginSupportEnabled']) {
				addSettingComponent(
					<PluginStates
						key={'plugin-states'}
						styles={this.styles()}
						themeId={this.props.themeId}
						pluginSettings={settings[pluginStatesKey]}

						updatePluginStates={updatePluginStates}
						shouldShowBasedOnSearchQuery={this.state.searching ? matchesSearchQuery : null}
					/>,
					getPluginStatesSearchText(),
				);

				if (canInstallPluginsFromFile()) {
					addSettingComponent(
						<PluginUploadButton
							key='plugins-install-from-file'
							pluginSettings={settings[pluginStatesKey]}
							updatePluginStates={updatePluginStates}
						/>,
						pluginUploadButtonSearchText(),
					);
				}
			} else {
				const enablePluginSupport = () => {
					shared.updateSettingValue(this, 'plugins.pluginSupportEnabled', true);
				};
				addSettingComponent(
					<EnablePluginSupportPage
						key='plugin-support-disabled-screen'
						themeId={this.props.themeId}
						onEnablePluginSupport={enablePluginSupport}
					/>,
					['plugins', _('Plugins')],
				);
			}

		}

		if (section.name === 'sync') {
			addSettingButton('e2ee_config_button', _('Encryption Config'), this.e2eeConfig_);
		}

		if (section.name === 'joplinCloud') {
			const label = _('Email to note');
			const description = _('Any email sent to this address will be converted into a note and added to your collection. The note will be saved into the Inbox notebook');
			const isEmailToNoteAvailableInAccount = this.props.settings['sync.10.accountType'] !== 1;
			const inboxEmailValue = isEmailToNoteAvailableInAccount ? this.props.settings['sync.10.inboxEmail'] : '-';
			addSettingComponent(
				<View key="joplinCloud">
					<View style={this.styles().styleSheet.settingContainerNoBottomBorder}>
						<Text style={this.styles().styleSheet.settingText}>{label}</Text>
						<Text style={this.styles().styleSheet.settingTextEmphasis}>{inboxEmailValue}</Text>
					</View>
					{
						!isEmailToNoteAvailableInAccount && (
							<View style={this.styles().styleSheet.settingContainerNoBottomBorder}>
								<Text style={this.styles().styleSheet.descriptionAlert}>{_('Your account doesn\'t have access to this feature')}</Text>
							</View>
						)
					}
					{
						this.renderButton(
							'sync.10.inboxEmail',
							_('Copy to clipboard'),
							() => isEmailToNoteAvailableInAccount && Clipboard.setString(this.props.settings['sync.10.inboxEmail']),
							{ description, disabled: !isEmailToNoteAvailableInAccount },
						)
					}
				</View>,
				[label, description],
			);
		}

		if (section.name === 'tools') {
			addSettingButton('profiles_buttons', _('Manage profiles'), this.manageProfilesButtonPress_);
			addSettingButton('status_button', _('Sync Status'), this.syncStatusButtonPress_);
			addSettingButton('log_button', _('Log'), this.logButtonPress_);
			addSettingButton('fix_search_engine_index', this.state.fixingSearchIndex ? _('Fixing search index...') : _('Fix search index'), this.fixSearchEngineIndexButtonPress_, { disabled: this.state.fixingSearchIndex, description: _('Use this to rebuild the search index if there is a problem with search. It may take a long time depending on the number of notes.') });
			const syncTargetInfo = SyncTargetRegistry.infoById(this.state.settings['sync.target']);
			if (syncTargetInfo.supportsShare) {
				addSettingButton('manage_shares_button', _('Manage shared notebooks'), this.manageSharesPress_);
			}
		}

		if (section.name === 'importOrExport') {
			addSettingComponent(
				<NoteExportButton key='export_as_jex_button' styles={this.styles()} />,
				[exportButtonDefaultTitle(), exportButtonDescription()],
			);
			addSettingComponent(
				<NoteImportButton key='import_as_jex_button' styles={this.styles()} />,
				[importButtonDefaultTitle(), importButtonDescription()],
			);
			addSettingComponent(
				<ExportDebugReportButton key='export_report_button' styles={this.styles()}/>,
				exportDebugReportTitle(),
			);
			addSettingComponent(
				<ExportProfileButton key='export_data' styles={this.styles()}/>,
				exportProfileButtonTitle(),
			);
		}

		if (section.name === 'moreInfo') {
			if (Platform.OS === 'android' && Platform.Version >= 23) {
				// Note: `PermissionsAndroid` doesn't work so we have to ask the user to manually
				// set these permissions. https://stackoverflow.com/questions/49771084/permission-always-returns-never-ask-again

				addSettingComponent(
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
					</View>,
					'',
				);
			}

			addSettingLink('donate_link', _('Make a donation'), 'https://joplinapp.org/donate/');
			addSettingLink('website_link', _('Joplin website'), 'https://joplinapp.org/');
			addSettingLink('privacy_link', _('Privacy Policy'), 'https://joplinapp.org/privacy/');

			const packageInfo = getPackageInfo();
			const appInfo = versionInfo(packageInfo, PluginService.instance().enabledPlugins(settings['plugins.states']));
			const versionInfoText = [
				appInfo.body,
				'',
				_('FTS enabled: %d', this.props.settings['db.ftsEnabled']),
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				_('Hermes enabled: %d', (global as any).HermesInternal ? 1 : 0),
			].join('\n');

			addSettingText('version_info', versionInfoText);
			addSettingButton('copy_app_info', _('Copy version info'), () => {
				Clipboard.setString(versionInfoText);
			});

			const featureFlagKeys = Setting.featureFlagKeys(AppType.Mobile);
			if (featureFlagKeys.length) {
				const headerKey = 'featureFlags';
				const featureFlagsTitle = _('Feature flags');
				addSettingComponent(
					<SectionHeader
						key={headerKey}
						styles={this.styles().styleSheet}
						title={featureFlagsTitle}
						onLayout={event => this.onHeaderLayout(headerKey, event)}
					/>,
					_('Feature flags'),
				);

				addSettingComponent(
					<View key="featureFlagsContainer">{this.renderFeatureFlags(settings, featureFlagKeys)}</View>,
					featureFlagsTitle,
				);
			}
		}

		if (!settingComps.length && !advancedSettingComps.length) return null;
		if (!isSelected && !this.state.searching) return null;

		const headerComponent = (
			<TouchableOpacity onPress={() => {
				this.onJumpToSection_(section.name);
			}}>
				<SectionHeader
					styles={styleSheet}
					title={headerTitle}
				/>
			</TouchableOpacity>
		);

		const renderAdvancedSettings = () => {
			if (!advancedSettingComps.length) return null;

			const toggleAdvancedLabel = this.state.showAdvancedSettings ? _('Hide Advanced Settings') : _('Show Advanced Settings');
			return (
				<>
					<Button
						style={{ marginBottom: 20 }}
						icon={this.state.showAdvancedSettings ? 'menu-down' : 'menu-right'}
						onPress={() => this.setState({ showAdvancedSettings: !this.state.showAdvancedSettings })}
					>
						<Text>{toggleAdvancedLabel}</Text>
					</Button>

					{this.state.showAdvancedSettings ? advancedSettingComps : null}
				</>
			);
		};

		return (
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			<View key={key} onLayout={(event: any) => this.onSectionLayout(key, event)}>
				<View>
					{this.state.searching ? headerComponent : null}
					{settingComps}
					{renderAdvancedSettings()}
				</View>
			</View>
		);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
	private renderToggle(key: string, label: string, value: any, updateSettingValue: Function, descriptionComp: any = null) {
		const theme = themeStyle(this.props.themeId);

		return (
			<View key={key}>
				<View style={this.styles().getContainerStyle(false)}>
					<Text key="label" style={this.styles().styleSheet.switchSettingText}>
						{label}
					</Text>
					{/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied */}
					<Switch key="control" style={this.styles().styleSheet.switchSettingControl} trackColor={{ false: theme.dividerColor }} value={value} onValueChange={(value: any) => void updateSettingValue(key, value)} />
				</View>
				{descriptionComp}
			</View>
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public settingToComponent(key: string, value: any) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private renderFeatureFlags(settings: any, featureFlagKeys: string[]): any[] {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const updateSettingValue = (key: string, value: any) => {
			return shared.updateSettingValue(this, key, value);
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any[] = [];
		for (const key of featureFlagKeys) {
			output.push(this.renderToggle(key, key, settings[key], updateSettingValue));
		}
		return output;
	}

	public render() {
		const settings = this.state.settings;

		const showAsSidebar = !this.navigationFillsScreen();

		// If the navigation is a sidebar, always show a section.
		let currentSectionName = this.state.selectedSectionName;
		if (showAsSidebar && !currentSectionName) {
			currentSectionName = 'general';
		}

		if (this.state.searching) {
			currentSectionName = null;
		}

		const sectionSelector = (
			<SectionSelector
				selectedSectionName={currentSectionName}
				styles={this.styles()}
				settings={settings}
				openSection={this.onJumpToSection_}
				width={this.state.sidebarWidth}
			/>
		);

		let currentSection: ReactNode;
		if (currentSectionName || this.state.searching) {
			const settingComps = shared.settingsToComponents2(
				this, AppType.Mobile, settings, currentSectionName,

			// TODO: Remove this cast. Currently necessary because of different versions
			// of React in lib/ and app-mobile/
			) as ReactNode[];

			const searchInput = <TextInput
				value={this.state.searchQuery}
				label={_('Search')}
				placeholder={_('Search...')}
				onChangeText={this.onSearchUpdate_}
				autoFocus={true}
			/>;

			currentSection = (
				<ScrollView
					ref={this.scrollViewRef_}
					style={{ flexGrow: 1 }}
				>
					{this.state.searching ? searchInput : null}
					{settingComps}
				</ScrollView>
			);
		} else {
			currentSection = sectionSelector;
		}

		let mainComponent;
		if (showAsSidebar && currentSectionName) {
			mainComponent = (
				<View style={{
					flex: 1,
					flexDirection: 'row',
				}}>
					{sectionSelector}
					<View style={{ width: 10 }}/>
					{currentSection}
				</View>
			);
		} else {
			mainComponent = currentSection;
		}

		let screenHeadingText = _('Configuration');
		if (currentSectionName) {
			screenHeadingText = Setting.sectionNameToLabel(currentSectionName);
		}

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader
					title={screenHeadingText}
					showSaveButton={true}
					showSearchButton={true}
					showSideMenuButton={false}
					saveButtonDisabled={!this.hasUnsavedChanges()}
					onSaveButtonPress={this.saveButton_press}
					onSearchButtonPress={this.onSearchButtonPress_}
				/>
				{mainComponent}
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
