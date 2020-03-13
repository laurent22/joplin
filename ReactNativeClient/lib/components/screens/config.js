const React = require('react');
const { Platform, TouchableOpacity, Linking, View, Switch, StyleSheet, Text, Button, ScrollView, TextInput, Alert } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { Dropdown } = require('lib/components/Dropdown.js');
const { themeStyle } = require('lib/components/global-style.js');
const Setting = require('lib/models/Setting.js');
const shared = require('lib/components/shared/config-shared.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const { reg } = require('lib/registry.js');
const NavService = require('lib/services/NavService.js');
const VersionInfo = require('react-native-version-info').default;
const { ReportService } = require('lib/services/report.js');
const { time } = require('lib/time-utils');
const { shim } = require('lib/shim');
const SearchEngine = require('lib/services/SearchEngine');
const RNFS = require('react-native-fs');

import { PermissionsAndroid } from 'react-native';
import Slider from '@react-native-community/slider';

class ConfigScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();
		this.styles_ = {};

		this.state = {
			creatingReport: false,
			profileExportStatus: 'idle',
			profileExportPath: '',
		};

		shared.init(this);

		this.checkSyncConfig_ = async () => {
			await shared.checkSyncConfig(this, this.state.settings);
		};

		this.e2eeConfig_ = () => {
			NavService.go('EncryptionConfig');
		};

		this.saveButton_press = async () => {
			if (this.state.changedSettingKeys.includes('sync.target') && this.state.settings['sync.target'] === SyncTargetRegistry.nameToId('filesystem') && !(await this.checkFilesystemPermission())) {
				Alert.alert(_('Warning'), _('In order to use file system synchronisation your permission to write to external storage is required.'));
				// Save settings anyway, even if permission has not been granted
			}
			return shared.saveSettings(this);
		};

		this.syncStatusButtonPress_ = () => {
			NavService.go('Status');
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
			const filePath = `${RNFS.ExternalDirectoryPath}/syncReport-${new Date().getTime()}.txt`;

			const finalText = [logItemCsv, itemListCsv].join('\n================================================================================\n');

			await RNFS.writeFile(filePath, finalText);
			alert(`Debug report exported to ${filePath}`);
			this.setState({ creatingReport: false });
		};

		this.fixSearchEngineIndexButtonPress_ = async () => {
			this.setState({ fixingSearchIndex: true });
			await SearchEngine.instance().rebuildIndex();
			this.setState({ fixingSearchIndex: false });
		};

		this.exportProfileButtonPress_ = async () => {
			const p = this.state.profileExportPath ? this.state.profileExportPath : `${RNFS.ExternalStorageDirectoryPath}/JoplinProfileExport`;
			this.setState({
				profileExportStatus: 'prompt',
				profileExportPath: p,
			});
		};

		this.exportProfileButtonPress2_ = async () => {
			this.setState({ profileExportStatus: 'exporting' });

			const dbPath = '/data/data/net.cozic.joplin/databases';

			try {
				await shim.fsDriver().mkdir(this.state.profileExportPath);
				await shim.fsDriver().mkdir(`${this.state.profileExportPath}/resources`);

				{
					const files = await shim.fsDriver().readDirStats(dbPath);

					for (const file of files) {
						const source = `${dbPath}/${file.path}`;
						const dest = `${this.state.profileExportPath}/${file.path}`;
						reg.logger().info(`Copying profile: ${source} => ${dest}`);
						await shim.fsDriver().copy(source, dest);
					}
				}

				{
					const files = await shim.fsDriver().readDirStats(Setting.value('resourceDir'));

					for (const file of files) {
						const source = `${Setting.value('resourceDir')}/${file.path}`;
						const dest = `${this.state.profileExportPath}/resources/${file.path}`;
						reg.logger().info(`Copying profile: ${source} => ${dest}`);
						await shim.fsDriver().copy(source, dest);
					}
				}

				alert('Profile has been exported!');
			} catch (error) {
				alert(`Could not export files: ${error.message}`);
			} finally  {
				this.setState({ profileExportStatus: 'idle' });
			}
		};

		this.logButtonPress_ = () => {
			NavService.go('Log');
		};
	}

	async checkFilesystemPermission() {
		if (Platform.OS !== 'android') {
			// Not implemented yet
			return true;
		}
		const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
		if (hasPermission) {
			return true;
		}
		const requestResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
			title: _('Information'),
			message: _('In order to use file system synchronisation your permission to write to external storage is required.'),
			buttonPositive: _('OK'),
		});
		return requestResult === PermissionsAndroid.RESULTS.GRANTED;
	}

	UNSAFE_componentWillMount() {
		this.setState({ settings: this.props.settings });
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
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
				color: theme.color,
				fontSize: theme.fontSize,
				flex: 1,
			},
			sliderUnits: {
				color: theme.color,
				fontSize: theme.fontSize,
				marginRight: 10,
			},
			settingDescriptionText: {
				color: theme.color,
				fontSize: theme.fontSize,
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
		};

		styles.settingContainerNoBottomBorder = Object.assign({}, styles.settingContainer, {
			borderBottomWidth: 0,
			paddingBottom: theme.marginBottom / 2,
		});

		styles.settingControl.borderBottomWidth = 1;
		styles.settingControl.borderBottomColor = theme.strongDividerColor;

		styles.switchSettingText = Object.assign({}, styles.settingText);
		styles.switchSettingText.width = '80%';

		styles.switchSettingContainer = Object.assign({}, styles.settingContainer);
		styles.switchSettingContainer.flexDirection = 'row';
		styles.switchSettingContainer.justifyContent = 'space-between';

		styles.linkText = Object.assign({}, styles.settingText);
		styles.linkText.borderBottomWidth = 1;
		styles.linkText.borderBottomColor = theme.color;
		styles.linkText.flex = 0;
		styles.linkText.fontWeight = 'normal';

		styles.headerWrapperStyle = Object.assign({}, styles.settingContainer, theme.headerWrapperStyle);

		styles.switchSettingControl = Object.assign({}, styles.settingControl);
		delete styles.switchSettingControl.color;
		// styles.switchSettingControl.width = '20%';
		styles.switchSettingControl.flex = 0;

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	renderHeader(key, title) {
		const theme = themeStyle(this.props.theme);
		return (
			<View key={key} style={this.styles().headerWrapperStyle}>
				<Text style={theme.headerStyle}>{title}</Text>
			</View>
		);
	}

	renderButton(key, title, clickHandler, options = null) {
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

	sectionToComponent(key, section, settings) {
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
			<View key={key}>
				{this.renderHeader(section.name, Setting.sectionNameToLabel(section.name))}
				<View>{settingComps}</View>
			</View>
		);
	}

	settingToComponent(key, value) {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);
		let output = null;

		const updateSettingValue = (key, value) => {
			return shared.updateSettingValue(this, key, value);
		};

		const md = Setting.settingMetadata(key);
		const settingDescription = md.description ? md.description() : '';

		if (md.isEnum) {
			value = value.toString();

			let items = [];
			const settingOptions = md.options();
			for (let k in settingOptions) {
				if (!settingOptions.hasOwnProperty(k)) continue;
				items.push({ label: settingOptions[k], value: k.toString() });
			}

			const descriptionComp = !settingDescription ? null : <Text style={this.styles().settingDescriptionText}>{settingDescription}</Text>;
			const containerStyle = !settingDescription ? this.styles().settingContainer : this.styles().settingContainerNoBottomBorder;

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
							onValueChange={(itemValue) => {
								updateSettingValue(key, itemValue);
							}}
						/>
					</View>
					{descriptionComp}
				</View>
			);
		} else if (md.type == Setting.TYPE_BOOL) {
			return (
				<View key={key} style={this.styles().switchSettingContainer}>
					<Text key="label" style={this.styles().switchSettingText}>
						{md.label()}
					</Text>
					<Switch key="control" style={this.styles().switchSettingControl} value={value} onValueChange={value => updateSettingValue(key, value)} />
				</View>
			);
		} else if (md.type == Setting.TYPE_INT) {
			const unitLabel = md.unitLabel ? md.unitLabel(value) : value;
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
						<Slider key="control" style={{ flex: 1 }} step={md.step} minimumValue={md.minimum} maximumValue={md.maximum} value={value} onValueChange={value => updateSettingValue(key, value)} />
					</View>
				</View>
			);
		} else if (md.type == Setting.TYPE_STRING) {
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>
						{md.label()}
					</Text>
					<TextInput autoCorrect={false} autoCompleteType="off" selectionColor={theme.textSelectionColor} autoCapitalize="none" key="control" style={this.styles().settingControl} value={value} onChangeText={value => updateSettingValue(key, value)} secureTextEntry={!!md.secure} />
				</View>
			);
		} else {
			// throw new Error('Unsupported setting type: ' + md.type);
		}

		return output;
	}

	render() {
		const settings = this.state.settings;

		const settingComps = shared.settingsToComponents2(this, 'mobile', settings);

		settingComps.push(this.renderHeader('tools', _('Tools')));

		settingComps.push(this.renderButton('status_button', _('Sync Status'), this.syncStatusButtonPress_));
		settingComps.push(this.renderButton('log_button', _('Log'), this.logButtonPress_));
		settingComps.push(this.renderButton('export_report_button', this.state.creatingReport ? _('Creating report...') : _('Export Debug Report'), this.exportDebugButtonPress_, { disabled: this.state.creatingReport }));
		settingComps.push(this.renderButton('fix_search_engine_index', this.state.fixingSearchIndex ? _('Fixing search index...') : _('Fix search index'), this.fixSearchEngineIndexButtonPress_, { disabled: this.state.fixingSearchIndex, description: _('Use this to rebuild the search index if there is a problem with search. It may take a long time depending on the number of notes.') }));

		if (shim.mobilePlatform() === 'android') {
			settingComps.push(this.renderButton('export_data', this.state.profileExportStatus === 'exporting' ? _('Exporting profile...') : _('Export profile'), this.exportProfileButtonPress_, { disabled: this.state.profileExportStatus === 'exporting', description: _('For debugging purpose only: export your profile to an external SD card.') }));

			if (this.state.profileExportStatus === 'prompt') {
				const profileExportPrompt = (
					<View style={this.styles().settingContainer}>
						<Text style={this.styles().settingText}>Path:</Text>
						<TextInput style={{ marginRight: 20 }} onChange={(event) => this.setState({ profileExportPath: event.nativeEvent.text })} value={this.state.profileExportPath} placeholder="/path/to/sdcard"></TextInput>
						<Button title="OK" onPress={this.exportProfileButtonPress2_}></Button>
					</View>
				);

				settingComps.push(profileExportPrompt);
			}
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
						Linking.openURL('https://joplinapp.org/donate/');
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
						Linking.openURL('https://joplinapp.org/');
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
						Linking.openURL('https://joplinapp.org/privacy/');
					}}
				>
					<Text key="label" style={this.styles().linkText}>
						Privacy Policy
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

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Configuration')} showSaveButton={true} showSearchButton={false} showSideMenuButton={false} saveButtonDisabled={!this.state.changedSettingKeys.length} onSaveButtonPress={this.saveButton_press} />
				<ScrollView>{settingComps}</ScrollView>
			</View>
		);
	}
}

const ConfigScreen = connect(state => {
	return {
		settings: state.settings,
		theme: state.settings.theme,
	};
})(ConfigScreenComponent);

module.exports = { ConfigScreen };
