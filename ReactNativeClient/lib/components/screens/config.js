const React = require('react'); const Component = React.Component;
const { Platform, TouchableOpacity, Linking, View, Switch, Slider, StyleSheet, Text, Button, ScrollView, TextInput } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _, setLocale } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { Dropdown } = require('lib/components/Dropdown.js');
const { themeStyle } = require('lib/components/global-style.js');
const Setting = require('lib/models/Setting.js');
const shared = require('lib/components/shared/config-shared.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const { reg } = require('lib/registry.js');
const VersionInfo = require('react-native-version-info').default;

class ConfigScreenComponent extends BaseScreenComponent {

	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.styles_ = {};

		shared.init(this);

		this.checkSyncConfig_ = async () => {
			await shared.checkSyncConfig(this, this.state.settings);
		}

		this.saveButton_press = () => {
			return shared.saveSettings(this);
		};
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
		}

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

		styles.headerWrapperStyle = Object.assign({}, styles.settingContainer, theme.headerWrapperStyle)

		styles.switchSettingControl = Object.assign({}, styles.settingControl);
		delete styles.switchSettingControl.color;
		//styles.switchSettingControl.width = '20%';
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

	sectionToComponent(key, section, settings) {
		const theme = themeStyle(this.props.theme);
		const settingComps = [];

		for (let i = 0; i < section.metadatas.length; i++) {
			const md = section.metadatas[i];

			if (section.name === 'sync' && md.key === 'sync.resourceDownloadMode') {
				const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target']);

				if (syncTargetMd.supportsConfigCheck) {
					const messages = shared.checkSyncConfigMessages(this);
					const statusComp = !messages.length ? null : (
						<View style={{flex:1, marginTop: 10}}>
							<Text style={this.styles().descriptionText}>{messages[0]}</Text>
							{messages.length >= 1 ? (<View style={{marginTop:10}}><Text style={this.styles().descriptionText}>{messages[1]}</Text></View>) : null}
						</View>);

					settingComps.push(
						<View key="check_sync_config_button" style={this.styles().settingContainer}>
							<View style={{flex:1, flexDirection: 'column'}}>
								<View style={{flex:1}}>
									<Button title={_('Check synchronisation configuration')} onPress={this.checkSyncConfig_}/>
								</View>
								{ statusComp }
							</View>
						</View>);
				}
			}

			const settingComp = this.settingToComponent(md.key, settings[md.key]);
			settingComps.push(settingComp);
		}

		const headerWrapperStyle = this.styles().headerWrapperStyle;

		return (
			<View key={key}>
				{this.renderHeader(section.name, Setting.sectionNameToLabel(section.name))}
				<View>
					{settingComps}
				</View>
			</View>
		);
	}

	settingToComponent(key, value) {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);
		let output = null;

		const updateSettingValue = (key, value) => {
			return shared.updateSettingValue(this, key, value);
		}

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

			const descriptionComp = !settingDescription ? null : <Text style={this.styles().settingDescriptionText}>{settingDescription}</Text>
			const containerStyle = !settingDescription ? this.styles().settingContainer : this.styles().settingContainerNoBottomBorder;

			return (
				<View key={key} style={{flexDirection:'column', borderBottomWidth: 1, borderBottomColor: theme.dividerColor}}>
					<View style={containerStyle}>
						<Text key="label" style={this.styles().settingText}>{md.label()}</Text>
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
							onValueChange={(itemValue, itemIndex) => { updateSettingValue(key, itemValue); }}
						/>
					</View>
					{descriptionComp}
				</View>
			);
		} else if (md.type == Setting.TYPE_BOOL) {
			return (
				<View key={key} style={this.styles().switchSettingContainer}>
					<Text key="label" style={this.styles().switchSettingText}>{md.label()}</Text>
					<Switch key="control" style={this.styles().switchSettingControl} value={value} onValueChange={(value) => updateSettingValue(key, value)} />
				</View>
			);
		} else if (md.type == Setting.TYPE_INT) {
			const unitLabel = md.unitLabel ? md.unitLabel(value) : value;
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>{md.label()}</Text>
					<View style={{display:'flex', flexDirection: 'column', alignItems: 'center', flex:1}}>
						<Slider key="control" minimumTrackTintColor={theme.color} maximumTrackTintColor={theme.color} style={{width:'100%'}} step={md.step} minimumValue={md.minimum} maximumValue={md.maximum} value={value} onValueChange={(value) => updateSettingValue(key, value)} />
						<Text style={this.styles().sliderUnits}>{unitLabel}</Text>
					</View>
				</View>
			);
		} else if (md.type == Setting.TYPE_STRING) {
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>{md.label()}</Text>
					<TextInput autoCorrect={false} autoCompleteType="off" selectionColor={theme.textSelectionColor} autoCapitalize="none" key="control" style={this.styles().settingControl} value={value} onChangeText={(value) => updateSettingValue(key, value)} secureTextEntry={!!md.secure} />
				</View>
			);
		} else {
			//throw new Error('Unsupported setting type: ' + md.type);
		}

		return output;
	}

	render() {
		const settings = this.state.settings;

		const settingComps = shared.settingsToComponents2(this, 'mobile', settings);

		settingComps.push(this.renderHeader('moreInfo', _('More information')));

		if (Platform.OS === 'android' && Platform.Version >= 23) {
			// Note: `PermissionsAndroid` doesn't work so we have to ask the user to manually
			// set these permissions. https://stackoverflow.com/questions/49771084/permission-always-returns-never-ask-again

			settingComps.push(
				<View key="permission_info" style={this.styles().settingContainer}>
					<View key="permission_info_wrapper">
						<Text key="perm1a" style={this.styles().settingText}>{_('To work correctly, the app needs the following permissions. Please enable them in your phone settings, in Apps > Joplin > Permissions')}</Text>
						<Text key="perm2" style={this.styles().permissionText}>{_('- Storage: to allow attaching files to notes and to enable filesystem synchronisation.')}</Text>
						<Text key="perm3" style={this.styles().permissionText}>{_('- Camera: to allow taking a picture and attaching it to a note.')}</Text>
						<Text key="perm4" style={this.styles().permissionText}>{_('- Location: to allow attaching geo-location information to a note.')}</Text>
					</View>
				</View>
			);
		}

		settingComps.push(
			<View key="donate_link" style={this.styles().settingContainer}>
				<TouchableOpacity onPress={() => { Linking.openURL('https://joplinapp.org/donate/') }}>
					<Text key="label" style={this.styles().linkText}>{_('Make a donation')}</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="website_link" style={this.styles().settingContainer}>
				<TouchableOpacity onPress={() => { Linking.openURL('https://joplinapp.org/') }}>
					<Text key="label" style={this.styles().linkText}>{_('Joplin website')}</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="privacy_link" style={this.styles().settingContainer}>
				<TouchableOpacity onPress={() => { Linking.openURL('https://joplinapp.org/privacy/') }}>
					<Text key="label" style={this.styles().linkText}>Privacy Policy</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="version_info_app" style={this.styles().settingContainer}>
					<Text style={this.styles().settingText}>{"Joplin " + VersionInfo.appVersion}</Text>
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
				<ScreenHeader
					title={_('Configuration')}
					showSaveButton={true}
					saveButtonDisabled={!this.state.changedSettingKeys.length}
					onSaveButtonPress={this.saveButton_press}
				/>
				<ScrollView >
					{ settingComps }
				</ScrollView>
			</View>
		);
	}

}

const ConfigScreen = connect(
	(state) => {
		return {
			settings: state.settings,
			theme: state.settings.theme,
		};
	}
)(ConfigScreenComponent)

module.exports = { ConfigScreen };
