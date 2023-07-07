/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import Slider from '@react-native-community/slider';
const React = require('react');
import { Platform, Linking, View, Switch, StyleSheet, ScrollView, Text, Button, TouchableOpacity, TextInput, Alert, PermissionsAndroid, TouchableNativeFeedback } from 'react-native';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import NavService from '@joplin/lib/services/NavService';
import ReportService from '@joplin/lib/services/ReportService';
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import checkPermissions from '../../utils/checkPermissions';
import time from '@joplin/lib/time';
import shim from '@joplin/lib/shim';
import setIgnoreTlsErrors from '../../utils/TlsUtils';
import { reg } from '@joplin/lib/registry';
import { State } from '@joplin/lib/reducer';
const { BackButtonService } = require('../../services/back-button.js');
const VersionInfo = require('react-native-version-info').default;
const { connect } = require('react-redux');
import ScreenHeader from '../ScreenHeader';
const { _ } = require('@joplin/lib/locale');
const { BaseScreenComponent } = require('../base-screen.js');
const { Dropdown } = require('../Dropdown.js');
const { themeStyle } = require('../global-style.js');
const shared = require('@joplin/lib/components/shared/config-shared.js');
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import { openDocumentTree } from '@joplin/react-native-saf-x';
import biometricAuthenticate from '../biometrics/biometricAuthenticate';

class ConfigScreenComponent extends BaseScreenComponent {
	public static navigationOptions(): any {
		return { header: null };
	}

	private componentsY_: Record<string, number> = {};

	public constructor() {
		super();
		this.styles_ = {};

		this.state = {
			creatingReport: false,
			profileExportStatus: 'idle',
			profileExportPath: '',
			fileSystemSyncPath: Setting.value('sync.2.path'),
		};

		this.scrollViewRef_ = React.createRef();

		shared.init(this, reg);

		this.selectDirectoryButtonPress = async () => {
			try {
				const doc = await openDocumentTree(true);
				if (doc?.uri) {
					this.setState({ fileSystemSyncPath: doc.uri });
					shared.updateSettingValue(this, 'sync.2.path', doc.uri);
				} else {
					throw new Error('User cancelled operation');
				}
			} catch (e) {
				reg.logger().info('Didn\'t pick sync dir: ', e);
			}
		};

		this.checkSyncConfig_ = async () => {
			// to ignore TLS erros we need to chage the global state of the app, if the check fails we need to restore the original state
			// this call sets the new value and returns the previous one which we can use later to revert the change
			const prevIgnoreTlsErrors = await setIgnoreTlsErrors(this.state.settings['net.ignoreTlsErrors']);
			const result = await shared.checkSyncConfig(this, this.state.settings);
			if (!result || !result.ok) {
				await setIgnoreTlsErrors(prevIgnoreTlsErrors);
			}
		};

		this.e2eeConfig_ = () => {
			void NavService.go('EncryptionConfig');
		};

		this.saveButton_press = async () => {
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
			const setIgnoreTlsErrors = this.state.changedSettingKeys.includes('net.ignoreTlsErrors');

			await shared.saveSettings(this);

			if (setIgnoreTlsErrors) {
				await setIgnoreTlsErrors(Setting.value('net.ignoreTlsErrors'));
			}
		};

		this.saveButton_press = this.saveButton_press.bind(this);

		this.syncStatusButtonPress_ = () => {
			void NavService.go('Status');
		};

		this.manageProfilesButtonPress_ = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'ProfileSwitcher',
			});
		};

		this.exportButtonPress_ = () => {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Export',
			});
		};

		this.exportDebugButtonPress_ = async () => {
			this.setState({ creatingReport: true });
			const service = new ReportService();

			const logItems = await reg.logger().lastEntries(null);
			const logItemRows = [['Date', 'Level', 'Message']];
			for (let i = 0; i < logItems.length; i++) {
				const item = logItems[i];
				logItemRows.push([time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss'), item.level, item.message]);
			}
			const logItemCsv = service.csvCreate(logItemRows);

			const itemListCsv = await service.basicItemList({ format: 'csv' });

			const externalDir = await shim.fsDriver().getExternalDirectoryPath();

			if (!externalDir) {
				this.setState({ creatingReport: false });
				return;
			}

			const filePath = `${externalDir}/syncReport-${new Date().getTime()}.txt`;

			const finalText = [logItemCsv, itemListCsv].join('\n================================================================================\n');
			await shim.fsDriver().writeFile(filePath, finalText, 'utf8');
			alert(`Debug report exported to ${filePath}`);
			this.setState({ creatingReport: false });
		};

		this.fixSearchEngineIndexButtonPress_ = async () => {
			this.setState({ fixingSearchIndex: true });
			await SearchEngine.instance().rebuildIndex();
			this.setState({ fixingSearchIndex: false });
		};

		this.exportProfileButtonPress_ = async () => {
			const externalDir = await shim.fsDriver().getExternalDirectoryPath();
			if (!externalDir) {
				return;
			}
			const p = this.state.profileExportPath ? this.state.profileExportPath : `${externalDir}/JoplinProfileExport`;

			this.setState({
				profileExportStatus: 'prompt',
				profileExportPath: p,
			});
		};

		this.exportProfileButtonPress2_ = async () => {
			this.setState({ profileExportStatus: 'exporting' });

			const dbPath = '/data/data/net.cozic.joplin/databases';
			const exportPath = this.state.profileExportPath;
			const resourcePath = `${exportPath}/resources`;
			try {
				const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
				if (response !== PermissionsAndroid.RESULTS.GRANTED) {
					throw new Error('Permission denied');
				}

				const copyFiles = async (source: string, dest: string) => {
					await shim.fsDriver().mkdir(dest);

					const files = await shim.fsDriver().readDirStats(source);

					for (const file of files) {
						const source_ = `${source}/${file.path}`;
						const dest_ = `${dest}/${file.path}`;
						if (!file.isDirectory()) {
							reg.logger().info(`Copying profile: ${source_} => ${dest_}`);
							await shim.fsDriver().copy(source_, dest_);
						} else {
							await copyFiles(source_, dest_);
						}
					}
				};
				await copyFiles(dbPath, exportPath);
				await copyFiles(Setting.value('resourceDir'), resourcePath);

				alert('Profile has been exported!');
			} catch (error) {
				alert(`Could not export files: ${error.message}`);
			} finally {
				this.setState({ profileExportStatus: 'idle' });
			}
		};

		this.logButtonPress_ = () => {
			void NavService.go('Log');
		};

		this.handleSetting = this.handleSetting.bind(this);
	}

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

	public styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles: any = {
			body: {
				flex: 1,
				justifyContent: 'flex-start',
				flexDirection: 'column',
			},
			settingContainer: {
				flex: 1,
				flexDirection: 'row',
				alignItems: 'center',
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				paddingTop: theme.marginTop,
				paddingBottom: theme.marginBottom,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			settingText: {
				color: theme.color,
				fontSize: theme.fontSize,
				flex: 1,
				paddingRight: 5,
			},
			descriptionText: {
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
				flex: 1,
			},
			sliderUnits: {
				color: theme.color,
				fontSize: theme.fontSize,
				marginRight: 10,
			},
			settingDescriptionText: {
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
				flex: 1,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingBottom: theme.marginBottom,
			},
			permissionText: {
				color: theme.color,
				fontSize: theme.fontSize,
				flex: 1,
				marginTop: 10,
			},
			settingControl: {
				color: theme.color,
				flex: 1,
			},
			textInput: {
				color: theme.color,
			},
		};

		styles.settingContainerNoBottomBorder = { ...styles.settingContainer, borderBottomWidth: 0,
			paddingBottom: theme.marginBottom / 2 };

		styles.settingControl.borderBottomWidth = 1;
		styles.settingControl.borderBottomColor = theme.dividerColor;

		styles.switchSettingText = { ...styles.settingText };
		styles.switchSettingText.width = '80%';

		styles.switchSettingContainer = { ...styles.settingContainer };
		styles.switchSettingContainer.flexDirection = 'row';
		styles.switchSettingContainer.justifyContent = 'space-between';

		styles.linkText = { ...styles.settingText };
		styles.linkText.borderBottomWidth = 1;
		styles.linkText.borderBottomColor = theme.color;
		styles.linkText.flex = 0;
		styles.linkText.fontWeight = 'normal';

		styles.headerWrapperStyle = { ...styles.settingContainer, ...theme.headerWrapperStyle };

		styles.switchSettingControl = { ...styles.settingControl };
		delete styles.switchSettingControl.color;
		// styles.switchSettingControl.width = '20%';
		styles.switchSettingControl.flex = 0;

		this.styles_[themeId] = StyleSheet.create(styles);
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
		const theme = themeStyle(this.props.themeId);
		return (
			<View key={key} style={this.styles().headerWrapperStyle} onLayout={(event: any) => this.onHeaderLayout(key, event)}>
				<Text style={theme.headerStyle}>{title}</Text>
			</View>
		);
	}

	renderButton(key: string, title: string, clickHandler: ()=> void, options: any = null) {
		if (!options) options = {};

		let descriptionComp = null;
		if (options.description) {
			descriptionComp = (
				<View style={{ flex: 1, marginTop: 10 }}>
					<Text style={this.styles().descriptionText}>{options.description}</Text>
				</View>
			);
		}

		return (
			<View key={key} style={this.styles().settingContainer}>
				<View style={{ flex: 1, flexDirection: 'column' }}>
					<View style={{ flex: 1 }}>
						<Button title={title} onPress={clickHandler} disabled={!!options.disabled} />
					</View>
					{options.statusComp}
					{descriptionComp}
				</View>
			</View>
		);
	}

	public sectionToComponent(key: string, section: any, settings: any) {
		const settingComps = [];

		for (let i = 0; i < section.metadatas.length; i++) {
			const md = section.metadatas[i];

			if (section.name === 'sync' && md.key === 'sync.resourceDownloadMode') {
				const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target']);

				if (syncTargetMd.supportsConfigCheck) {
					const messages = shared.checkSyncConfigMessages(this);
					const statusComp = !messages.length ? null : (
						<View style={{ flex: 1, marginTop: 10 }}>
							<Text style={this.styles().descriptionText}>{messages[0]}</Text>
							{messages.length >= 1 ? (
								<View style={{ marginTop: 10 }}>
									<Text style={this.styles().descriptionText}>{messages[1]}</Text>
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
				<View style={this.containerStyle(false)}>
					<Text key="label" style={this.styles().switchSettingText}>
						{label}
					</Text>
					<Switch key="control" style={this.styles().switchSettingControl} trackColor={{ false: theme.dividerColor }} value={value} onValueChange={(value: any) => void updateSettingValue(key, value)} />
				</View>
				{descriptionComp}
			</View>
		);
	}

	private containerStyle(hasDescription: boolean): any {
		return !hasDescription ? this.styles().settingContainer : this.styles().settingContainerNoBottomBorder;
	}

	private async handleSetting(key: string, value: any): Promise<boolean> {
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
	}

	public settingToComponent(key: string, value: any) {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);
		const output: any = null;

		const updateSettingValue = async (key: string, value: any) => {
			const handled = await this.handleSetting(key, value);
			if (!handled) shared.updateSettingValue(this, key, value);
		};

		const md = Setting.settingMetadata(key);
		const settingDescription = md.description ? md.description() : '';

		const descriptionComp = !settingDescription ? null : <Text style={this.styles().settingDescriptionText}>{settingDescription}</Text>;
		const containerStyle = this.containerStyle(!!settingDescription);

		if (md.isEnum) {
			value = value.toString();

			const items = Setting.enumOptionsToValueLabels(md.options(), md.optionsOrder ? md.optionsOrder() : []);

			return (
				<View key={key} style={{ flexDirection: 'column', borderBottomWidth: 1, borderBottomColor: theme.dividerColor }}>
					<View style={containerStyle}>
						<Text key="label" style={this.styles().settingText}>
							{md.label()}
						</Text>
						<Dropdown
							key="control"
							style={this.styles().settingControl}
							items={items}
							selectedValue={value}
							itemListStyle={{
								backgroundColor: theme.backgroundColor,
							}}
							headerStyle={{
								color: theme.color,
								fontSize: theme.fontSize,
							}}
							itemStyle={{
								color: theme.color,
								fontSize: theme.fontSize,
							}}
							onValueChange={(itemValue: string) => {
								void updateSettingValue(key, itemValue);
							}}
						/>
					</View>
					{descriptionComp}
				</View>
			);
		} else if (md.type === Setting.TYPE_BOOL) {
			return this.renderToggle(key, md.label(), value, updateSettingValue, descriptionComp);
			// return (
			// 	<View key={key}>
			// 		<View style={containerStyle}>
			// 			<Text key="label" style={this.styles().switchSettingText}>
			// 				{md.label()}
			// 			</Text>
			// 			<Switch key="control" style={this.styles().switchSettingControl} trackColor={{ false: theme.dividerColor }} value={value} onValueChange={(value:any) => updateSettingValue(key, value)} />
			// 		</View>
			// 		{descriptionComp}
			// 	</View>
			// );
		} else if (md.type === Setting.TYPE_INT) {
			const unitLabel = md.unitLabel ? md.unitLabel(value) : value;
			const minimum = 'minimum' in md ? md.minimum : 0;
			const maximum = 'maximum' in md ? md.maximum : 10;

			// Note: Do NOT add the minimumTrackTintColor and maximumTrackTintColor props
			// on the Slider as they are buggy and can crash the app on certain devices.
			// https://github.com/laurent22/joplin/issues/2733
			// https://github.com/react-native-community/react-native-slider/issues/161
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>
						{md.label()}
					</Text>
					<View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1 }}>
						<Text style={this.styles().sliderUnits}>{unitLabel}</Text>
						<Slider key="control" style={{ flex: 1 }} step={md.step} minimumValue={minimum} maximumValue={maximum} value={value} onValueChange={value => void updateSettingValue(key, value)} />
					</View>
				</View>
			);
		} else if (md.type === Setting.TYPE_STRING) {
			if (md.key === 'sync.2.path' && shim.fsDriver().isUsingAndroidSAF()) {
				return (
					<TouchableNativeFeedback key={key} onPress={this.selectDirectoryButtonPress} style={this.styles().settingContainer}>
						<View style={this.styles().settingContainer}>
							<Text key="label" style={this.styles().settingText}>
								{md.label()}
							</Text>
							<Text style={this.styles().settingControl}>
								{this.state.fileSystemSyncPath}
							</Text>
						</View>
					</TouchableNativeFeedback>
				);
			}
			return (
				<View key={key} style={{ flexDirection: 'column', borderBottomWidth: 1, borderBottomColor: theme.dividerColor }}>
					<View key={key} style={containerStyle}>
						<Text key="label" style={this.styles().settingText}>
							{md.label()}
						</Text>
						<TextInput autoCorrect={false} autoComplete="off" selectionColor={theme.textSelectionColor} keyboardAppearance={theme.keyboardAppearance} autoCapitalize="none" key="control" style={this.styles().settingControl} value={value} onChangeText={(value: any) => void updateSettingValue(key, value)} secureTextEntry={!!md.secure} />
					</View>
					{descriptionComp}
				</View>
			);
		} else {
			// throw new Error('Unsupported setting type: ' + md.type);
		}

		return output;
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

		const theme = themeStyle(this.props.themeId);

		const settingComps = shared.settingsToComponents2(this, 'mobile', settings);

		settingComps.push(this.renderHeader('tools', _('Tools')));

		settingComps.push(this.renderButton('profiles_buttons', _('Manage profiles'), this.manageProfilesButtonPress_));
		settingComps.push(this.renderButton('status_button', _('Sync Status'), this.syncStatusButtonPress_));
		settingComps.push(this.renderButton('log_button', _('Log'), this.logButtonPress_));
		settingComps.push(this.renderButton('export_button', _('Export'), this.exportButtonPress_));
		if (Platform.OS === 'android') {
			settingComps.push(this.renderButton('export_report_button', this.state.creatingReport ? _('Creating report...') : _('Export Debug Report'), this.exportDebugButtonPress_, { disabled: this.state.creatingReport }));
		}
		settingComps.push(this.renderButton('fix_search_engine_index', this.state.fixingSearchIndex ? _('Fixing search index...') : _('Fix search index'), this.fixSearchEngineIndexButtonPress_, { disabled: this.state.fixingSearchIndex, description: _('Use this to rebuild the search index if there is a problem with search. It may take a long time depending on the number of notes.') }));

		if (shim.mobilePlatform() === 'android') {
			settingComps.push(this.renderButton('export_data', this.state.profileExportStatus === 'exporting' ? _('Exporting profile...') : _('Export profile'), this.exportProfileButtonPress_, { disabled: this.state.profileExportStatus === 'exporting', description: _('For debugging purpose only: export your profile to an external SD card.') }));

			if (this.state.profileExportStatus === 'prompt') {
				const profileExportPrompt = (
					<View style={this.styles().settingContainer} key="profileExport">
						<Text style={{ ...this.styles().settingText, flex: 0 }}>Path:</Text>
						<TextInput style={{ ...this.styles().textInput, paddingRight: 20, width: '75%', marginRight: 'auto' }} onChange={(event: any) => this.setState({ profileExportPath: event.nativeEvent.text })} value={this.state.profileExportPath} placeholder="/path/to/sdcard" keyboardAppearance={theme.keyboardAppearance} />
						<Button title="OK" onPress={this.exportProfileButtonPress2_} />
					</View>
				);

				settingComps.push(profileExportPrompt);
			}
		}

		const featureFlagKeys = Setting.featureFlagKeys(AppType.Mobile);
		if (featureFlagKeys.length) {
			settingComps.push(this.renderHeader('featureFlags', _('Feature flags')));
			settingComps.push(<View key="featureFlagsContainer">{this.renderFeatureFlags(settings, featureFlagKeys)}</View>);
		}

		settingComps.push(this.renderHeader('moreInfo', _('More information')));

		if (Platform.OS === 'android' && Platform.Version >= 23) {
			// Note: `PermissionsAndroid` doesn't work so we have to ask the user to manually
			// set these permissions. https://stackoverflow.com/questions/49771084/permission-always-returns-never-ask-again

			settingComps.push(
				<View key="permission_info" style={this.styles().settingContainer}>
					<View key="permission_info_wrapper">
						<Text key="perm1a" style={this.styles().settingText}>
							{_('To work correctly, the app needs the following permissions. Please enable them in your phone settings, in Apps > Joplin > Permissions')}
						</Text>
						<Text key="perm2" style={this.styles().permissionText}>
							{_('- Storage: to allow attaching files to notes and to enable filesystem synchronisation.')}
						</Text>
						<Text key="perm3" style={this.styles().permissionText}>
							{_('- Camera: to allow taking a picture and attaching it to a note.')}
						</Text>
						<Text key="perm4" style={this.styles().permissionText}>
							{_('- Location: to allow attaching geo-location information to a note.')}
						</Text>
					</View>
				</View>
			);
		}

		settingComps.push(
			<View key="donate_link" style={this.styles().settingContainer}>
				<TouchableOpacity
					onPress={() => {
						void Linking.openURL('https://joplinapp.org/donate/');
					}}
				>
					<Text key="label" style={this.styles().linkText}>
						{_('Make a donation')}
					</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="website_link" style={this.styles().settingContainer}>
				<TouchableOpacity
					onPress={() => {
						void Linking.openURL('https://joplinapp.org/');
					}}
				>
					<Text key="label" style={this.styles().linkText}>
						{_('Joplin website')}
					</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="privacy_link" style={this.styles().settingContainer}>
				<TouchableOpacity
					onPress={() => {
						void Linking.openURL('https://joplinapp.org/privacy/');
					}}
				>
					<Text key="label" style={this.styles().linkText}>
						{_('Privacy Policy')}
					</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="version_info_app" style={this.styles().settingContainer}>
				<Text style={this.styles().settingText}>{`Joplin ${VersionInfo.appVersion}`}</Text>
			</View>
		);

		settingComps.push(
			<View key="version_info_db" style={this.styles().settingContainer}>
				<Text style={this.styles().settingText}>{_('Database v%s', reg.db().version())}</Text>
			</View>
		);

		settingComps.push(
			<View key="version_info_fts" style={this.styles().settingContainer}>
				<Text style={this.styles().settingText}>{_('FTS enabled: %d', this.props.settings['db.ftsEnabled'])}</Text>
			</View>
		);

		settingComps.push(
			<View key="version_info_hermes" style={this.styles().settingContainer}>
				<Text style={this.styles().settingText}>{_('Hermes enabled: %d', (global as any).HermesInternal ? 1 : 0)}</Text>
			</View>
		);

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader title={_('Configuration')} showSaveButton={true} showSearchButton={false} showSideMenuButton={false} saveButtonDisabled={!this.state.changedSettingKeys.length} onSaveButtonPress={this.saveButton_press} />
				<ScrollView ref={this.scrollViewRef_}>{settingComps}</ScrollView>
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
