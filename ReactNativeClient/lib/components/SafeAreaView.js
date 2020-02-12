const React = require('react');
import { View, Platform, SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import DeviceInfo from 'react-native-device-info';

// Untested! This should check if the device has a notch and, if it does, apply
// an extra padding on top of the screen.
const styles = StyleSheet.create({
	AndroidSafeArea: {
		paddingTop: Platform.OS === 'android' && DeviceInfo.hasNotch() ? StatusBar.currentHeight : 0,
	},
});

function JoplinSafeAreaView(props) {
	if (Platform.OS === 'ios') {
		return <SafeAreaView {...props}>{props.children}</SafeAreaView>;
	} else {
		const viewProps = Object.assign({}, props);

		const style = [];

		if (viewProps.style) {
			style.push(viewProps.style);
			delete viewProps.style;
		}

		style.push(styles.AndroidSafeArea);

		return <View style={style} {...viewProps}>{props.children}</View>;
	}
}

module.exports = JoplinSafeAreaView;
