const React = require("react");
const Component = React.Component;
const { Platform, TouchableOpacity, Linking, View, Switch, Slider, StyleSheet, Text, Button, ScrollView, TextInput } = require("react-native");
const { connect } = require("react-redux");
const { ScreenHeader } = require("lib/components/screen-header.js");
const { _, setLocale } = require("lib/locale.js");
const { BaseScreenComponent } = require("lib/components/base-screen.js");
const { Dropdown } = require("lib/components/Dropdown.js");
const { themeStyle } = require("lib/components/global-style.js");
const Setting = require("lib/models/Setting.js");
const shared = require("lib/components/shared/config-shared.js");
const SyncTargetRegistry = require("lib/SyncTargetRegistry");

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
		};

		this.saveButton_press = () => {
			return shared.saveSettings(this);
		};
	}

	componentWillMount() {
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
				justifyContent: "flex-start",
				flexDirection: "column",
			},
			settingContainer: {
				flex: 1,
				flexDirection: "row",
				alignItems: "center",
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				paddingTop: theme.marginTop,
				paddingBottom: theme.marginBottom,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			settingText: {
				fontWeight: "bold",
				color: theme.color,
				fontSize: theme.fontSize,
				flex: 1,
			},
			descriptionText: {
				color: theme.color,
				fontSize: theme.fontSize,
				flex: 1,
			},
			settingControl: {
				color: theme.color,
				flex: 1,
			},
		};

		if (Platform.OS === "ios") {
			styles.settingControl.borderBottomWidth = 1;
			styles.settingControl.borderBottomColor = theme.dividerColor;
		}

		styles.switchSettingText = Object.assign({}, styles.settingText);
		styles.switchSettingText.width = "80%";

		styles.switchSettingContainer = Object.assign({}, styles.settingContainer);
		styles.switchSettingContainer.flexDirection = "row";
		styles.switchSettingContainer.justifyContent = "space-between";

		styles.linkText = Object.assign({}, styles.settingText);
		styles.linkText.borderBottomWidth = 1;
		styles.linkText.borderBottomColor = theme.color;
		styles.linkText.flex = 0;
		styles.linkText.fontWeight = "normal";

		styles.switchSettingControl = Object.assign({}, styles.settingControl);
		delete styles.switchSettingControl.color;
		//styles.switchSettingControl.width = '20%';
		styles.switchSettingControl.flex = 0;

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	settingToComponent(key, value) {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);
		let output = null;

		const updateSettingValue = (key, value) => {
			return shared.updateSettingValue(this, key, value);
		};

		const md = Setting.settingMetadata(key);

		if (md.isEnum) {
			value = value.toString();

			let items = [];
			const settingOptions = md.options();
			for (let k in settingOptions) {
				if (!settingOptions.hasOwnProperty(k)) continue;
				items.push({ label: settingOptions[k], value: k.toString() });
			}

			return (
				<View key={key} style={this.styles().settingContainer}>
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
						onValueChange={(itemValue, itemIndex) => {
							updateSettingValue(key, itemValue);
						}}
					/>
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
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>
						{md.label()}
					</Text>
					<Slider key="control" style={this.styles().settingControl} value={value} onValueChange={value => updateSettingValue(key, value)} />
				</View>
			);
		} else if (md.type == Setting.TYPE_STRING) {
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>
						{md.label()}
					</Text>
					<TextInput autoCapitalize="none" key="control" style={this.styles().settingControl} value={value} onChangeText={value => updateSettingValue(key, value)} secureTextEntry={!!md.secure} />
				</View>
			);
		} else {
			//throw new Error('Unsupported setting type: ' + md.type);
		}

		return output;
	}

	render() {
		const settings = this.state.settings;

		const settingComps = shared.settingsToComponents(this, "mobile", settings);

		const syncTargetMd = SyncTargetRegistry.idToMetadata(settings["sync.target"]);

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

			settingComps.push(
				<View key="check_sync_config_button" style={this.styles().settingContainer}>
					<View style={{ flex: 1, flexDirection: "column" }}>
						<View style={{ flex: 1 }}>
							<Button title={_("Check synchronisation configuration")} onPress={this.checkSyncConfig_} />
						</View>
						{statusComp}
					</View>
				</View>
			);
		}

		settingComps.push(
			<View key="donate_link" style={this.styles().settingContainer}>
				<TouchableOpacity
					onPress={() => {
						Linking.openURL("http://joplin.cozic.net/donate/");
					}}
				>
					<Text key="label" style={this.styles().linkText}>
						{_("Make a donation")}
					</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="website_link" style={this.styles().settingContainer}>
				<TouchableOpacity
					onPress={() => {
						Linking.openURL("http://joplin.cozic.net/");
					}}
				>
					<Text key="label" style={this.styles().linkText}>
						{_("Joplin website")}
					</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="privacy_link" style={this.styles().settingContainer}>
				<TouchableOpacity
					onPress={() => {
						Linking.openURL("http://joplin.cozic.net/privacy/");
					}}
				>
					<Text key="label" style={this.styles().linkText}>
						Privacy Policy
					</Text>
				</TouchableOpacity>
			</View>
		);

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_("Configuration")} showSaveButton={true} saveButtonDisabled={!this.state.changedSettingKeys.length} onSaveButtonPress={this.saveButton_press} />
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
