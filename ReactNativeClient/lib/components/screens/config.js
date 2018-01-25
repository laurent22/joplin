const React = require('react'); const Component = React.Component;
const { TouchableOpacity, Linking, View, Switch, Slider, StyleSheet, Text, Button, ScrollView, TextInput } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _, setLocale } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { Dropdown } = require('lib/components/Dropdown.js');
const { themeStyle } = require('lib/components/global-style.js');
const Setting = require('lib/models/Setting.js');

class ConfigScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.styles_ = {};

		this.state = {
			settings: {},
			settingsChanged: false,
		};

		this.saveButton_press = () => {
			for (let n in this.state.settings) {
				if (!this.state.settings.hasOwnProperty(n)) continue;
				Setting.setValue(n, this.state.settings[n]);
			}
			this.setState({settingsChanged:false});
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
				fontWeight: 'bold',
				color: theme.color,
				fontSize: theme.fontSize,
				flex: 1,
			},
			settingControl: {
				color: theme.color,
				flex: 1,
			},
		}

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
			const settings = Object.assign({}, this.state.settings);
			settings[key] = value;
			this.setState({
				settings: settings,
				settingsChanged: true,
			});

			console.info(settings['sync.5.path']);
		}

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
			);
		} else if (md.type == Setting.TYPE_BOOL) {
			return (
				<View key={key} style={this.styles().switchSettingContainer}>
					<Text key="label" style={this.styles().switchSettingText}>{md.label()}</Text>
					<Switch key="control" style={this.styles().switchSettingControl} value={value} onValueChange={(value) => updateSettingValue(key, value)} />
				</View>
			);
		} else if (md.type == Setting.TYPE_INT) {
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>{md.label()}</Text>
					<Slider key="control" style={this.styles().settingControl} value={value} onValueChange={(value) => updateSettingValue(key, value)} />
				</View>
			);
		} else if (md.type == Setting.TYPE_STRING) {
			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>{md.label()}</Text>
					<TextInput key="control" style={this.styles().settingControl} value={value} onChangeText={(value) => updateSettingValue(key, value)} secureTextEntry={!!md.secure} />
				</View>
			);
		} else {
			//throw new Error('Unsupported setting type: ' + md.type);
		}

		return output;
	}

	render() {
		const settings = this.state.settings;

		const keys = Setting.keys(true, 'mobile');
		let settingComps = [];
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			//if (key == 'sync.target' && !settings.showAdvancedOptions) continue;
			if (!Setting.isPublic(key)) continue;

			const md = Setting.settingMetadata(key);
			if (md.show && !md.show(settings)) continue;

			const comp = this.settingToComponent(key, settings[key]);
			if (!comp) continue;
			settingComps.push(comp);
		}
		
		settingComps.push(
			<View key="website_link" style={this.styles().settingContainer}>
				<TouchableOpacity onPress={() => { Linking.openURL('http://joplin.cozic.net/') }}>
					<Text key="label" style={this.styles().linkText}>Joplin Website</Text>
				</TouchableOpacity>
			</View>
		);

		settingComps.push(
			<View key="privacy_link" style={this.styles().settingContainer}>
				<TouchableOpacity onPress={() => { Linking.openURL('http://joplin.cozic.net/privacy/') }}>
					<Text key="label" style={this.styles().linkText}>Privacy Policy</Text>
				</TouchableOpacity>
			</View>
		);

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader
					title={_('Configuration')}
					showSaveButton={true}
					saveButtonDisabled={!this.state.settingsChanged}
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