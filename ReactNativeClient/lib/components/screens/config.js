const React = require('react'); const Component = React.Component;
const { View, Switch, Slider, StyleSheet, Picker, Text, Button } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _, setLocale } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { themeStyle } = require('lib/components/global-style.js');
const { Setting } = require('lib/models/setting.js');

class ConfigScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.styles_ = {};
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
			settingContainer: {
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
			},
			settingControl: {
				color: theme.color,
			},
			pickerItem: {
				fontSize: theme.fontSize,
			}
		}

		styles.switchSettingText = Object.assign({}, styles.settingText);
		styles.switchSettingText.width = '80%';

		styles.switchSettingContainer = Object.assign({}, styles.settingContainer);
		styles.switchSettingContainer.flexDirection = 'row';
		styles.switchSettingContainer.justifyContent = 'space-between';

		styles.switchSettingControl = Object.assign({}, styles.settingControl);
		delete styles.switchSettingControl.color;
		styles.switchSettingControl.width = '20%';

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	settingToComponent(key, value) {
		let output = null;

		const updateSettingValue = (key, value) => {
			Setting.setValue(key, value);
		}

		const md = Setting.settingMetadata(key);

		if (md.isEnum) {
			// The Picker component doesn't work properly with int values, so
			// convert everything to string (Setting.setValue will convert
			// back to the correct type.

			value = value.toString();

			let items = [];
			const settingOptions = md.options();
			for (let k in settingOptions) {
				if (!settingOptions.hasOwnProperty(k)) continue;
				items.push(<Picker.Item label={settingOptions[k]} value={k.toString()} key={k}/>);
			}

			return (
				<View key={key} style={this.styles().settingContainer}>
					<Text key="label" style={this.styles().settingText}>{md.label()}</Text>
					<Picker key="control" style={this.styles().settingControl} selectedValue={value} onValueChange={(itemValue, itemIndex) => updateSettingValue(key, itemValue)} >
						{ items }
					</Picker>
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
		} else {
			//throw new Error('Unsupported setting type: ' + setting.type);
		}

		return output;
	}

	render() {
		const settings = this.props.settings;

		let settingComps = [];
		for (let key in settings) {
			if (key == 'sync.target') continue;
			if (!settings.hasOwnProperty(key)) continue;
			if (!Setting.isPublic(key)) continue;

			const comp = this.settingToComponent(key, settings[key]);
			if (!comp) continue;
			settingComps.push(comp);
		}

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Configuration')}/>
				<View style={this.styles().body}>
					{ settingComps }
				</View>
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