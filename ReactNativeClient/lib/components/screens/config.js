import React, { Component } from 'react';
import { View, StyleSheet, Picker, Text, Button } from 'react-native';
import { connect } from 'react-redux'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { _ } from 'lib/locale.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { globalStyle } from 'lib/components/global-style.js';
import { Setting } from 'lib/models/setting.js';

let styles = {
	body: {}
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
				<View key={key}>
					<Text key="label">{setting.label()}</Text>
					<Picker key="control" selectedValue={value} onValueChange={(itemValue, itemIndex) => updateSettingValue(key, itemValue)} >
						{ items }
					</Picker>
				</View>
			);
		} else {
			//throw new Error('Unsupported setting type: ' + setting.type);
		}

		return output;
	}

	saveButton_press() {
		const values = this.state.values;
		for (let key in values) {
			if (!values.hasOwnProperty(key)) continue;
			Setting.setValue(key, values[key]);
		}
		Setting.saveAll();
	}

	render() {
		const settings = Setting.publicSettings(Setting.value('appType'));

		let settingComps = [];
		for (let key in settings) {
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
				<Button title={_('Save')} onPress={() => this.saveButton_press()} />
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