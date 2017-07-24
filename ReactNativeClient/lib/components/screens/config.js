import React, { Component } from 'react';
import { View, StyleSheet, Picker, Text, Button } from 'react-native';
import { connect } from 'react-redux'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { _, setLocale } from 'lib/locale.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { globalStyle } from 'lib/components/global-style.js';
import { Setting } from 'lib/models/setting.js';

let styles = {
	settingContainer: {
		borderBottomWidth: 1,
		borderBottomColor: globalStyle.dividerColor,
		paddingTop: globalStyle.marginTop,
		paddingBottom: globalStyle.marginBottom,
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
	},
	settingText: {
		fontWeight: 'bold',
		color: globalStyle.color,
	},
	settingControl: {
		color: globalStyle.color,
	},
}

styles = StyleSheet.create(styles);

class ConfigScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			values: {},
		};
	}

	componentWillMount() {
		const settings = Setting.publicSettings(Setting.value('appType'));

		let values = {};
		for (let key in settings) {
			if (!settings.hasOwnProperty(key)) continue;
			values[key] = settings[key].value;
		}

		this.setState({ values: values });
	}

	settingToComponent(key, setting) {
		let output = null;

		const updateSettingValue = (key, value) => {
			let values = this.state.values;
			values[key] = value;
			this.setState({ values: values });
			this.saveSettings();
		}

		const value = this.state.values[key];

		if (setting.type == 'enum') {
			let items = [];
			const settingOptions = setting.options();
			for (let k in settingOptions) {
				if (!settingOptions.hasOwnProperty(k)) continue;
				items.push(<Picker.Item label={settingOptions[k]} value={k} key={k}/>);
			}

			return (
				<View key={key} style={styles.settingContainer}>
					<Text key="label" style={styles.settingText}>{setting.label()}</Text>
					<Picker key="control" style={styles.settingControl} selectedValue={value} onValueChange={(itemValue, itemIndex) => updateSettingValue(key, itemValue)} >
						{ items }
					</Picker>
				</View>
			);
		} else {
			//throw new Error('Unsupported setting type: ' + setting.type);
		}

		return output;
	}

	saveSettings() {
		const values = this.state.values;
		for (let key in values) {
			if (!values.hasOwnProperty(key)) continue;
			Setting.setValue(key, values[key]);
		}
		Setting.saveAll();

		setLocale(Setting.value('locale'));
	}

	render() {
		const settings = Setting.publicSettings(Setting.value('appType'));

		let settingComps = [];
		for (let key in settings) {
			if (key == 'sync.target') continue;

			if (!settings.hasOwnProperty(key)) continue;
			const comp = this.settingToComponent(key, settings[key]);
			if (!comp) continue;
			settingComps.push(comp);
		}

		return (
			<View style={this.styles().screen}>
				<ScreenHeader navState={this.props.navigation.state} />
				<View style={styles.body}>
					{ settingComps }
				</View>
			</View>
		);
	}

}

const ConfigScreen = connect(
	(state) => {
		return {};
	}
)(ConfigScreenComponent)

export { ConfigScreen };