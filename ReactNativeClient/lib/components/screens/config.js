import React, { Component } from 'react';
import { View, Switch, Slider, StyleSheet, Picker, Text, Button } from 'react-native';
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
		fontSize: globalStyle.fontSize,
	},
	settingControl: {
		color: globalStyle.color,
	},
	pickerItem: {
		fontSize: globalStyle.fontSize,
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

styles = StyleSheet.create(styles);

class ConfigScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
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
				<View key={key} style={styles.settingContainer}>
					<Text key="label" style={styles.settingText}>{md.label()}</Text>
					<Picker key="control" style={styles.settingControl} selectedValue={value} onValueChange={(itemValue, itemIndex) => updateSettingValue(key, itemValue)} >
						{ items }
					</Picker>
				</View>
			);
		} else if (md.type == Setting.TYPE_BOOL) {
			return (
				<View key={key} style={styles.switchSettingContainer}>
					<Text key="label" style={styles.switchSettingText}>{md.label()}</Text>
					<Switch key="control" style={styles.switchSettingControl} value={value} onValueChange={(value) => updateSettingValue(key, value)} />
				</View>
			);
		} else if (md.type == Setting.TYPE_INT) {
			return (
				<View key={key} style={styles.settingContainer}>
					<Text key="label" style={styles.settingText}>{md.label()}</Text>
					<Slider key="control" style={styles.settingControl} value={value} onValueChange={(value) => updateSettingValue(key, value)} />
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
			<View style={this.styles().screen}>
				<ScreenHeader title={_('Configuration')}/>
				<View style={styles.body}>
					{ settingComps }
				</View>
			</View>
		);
	}

}

const ConfigScreen = connect(
	(state) => {
		return { settings: state.settings };
	}
)(ConfigScreenComponent)

export { ConfigScreen };