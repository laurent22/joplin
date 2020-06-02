import { View, Platform, SafeAreaView, StyleSheet /* , StatusBar */ } from 'react-native';
const React = require('react');
// import DeviceInfo from 'react-native-device-info';

// Untested! This should check if the device has a notch and, if it does, apply
// an extra padding on top of the screen.
const styles = StyleSheet.create({
	AndroidSafeArea: {
		// Disabled for now because it seems that even when there's a notch the system status bar
		// covers it, and thus we should add our own gap.
		// Can only test on emulator though
		// Fixes: https://github.com/laurent22/joplin/issues/2694

		// paddingTop: Platform.OS === 'android' && DeviceInfo.hasNotch() ? StatusBar.currentHeight : 0,
		paddingTop: 0,
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
