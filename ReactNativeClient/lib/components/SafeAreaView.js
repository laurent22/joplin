const React = require('react');
import { Platform, SafeAreaView } from 'react-native';

function JoplinSafeAreaView(props) {
	if (Platform.OS === 'ios') {
		return <SafeAreaView {...props}>{props.children}</SafeAreaView>;
	} else {
		throw new Error('Not done');
	}
}

module.exports = JoplinSafeAreaView;
