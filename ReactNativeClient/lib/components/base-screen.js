const React = require('react');

const { StyleSheet } = require('react-native');
const { themeStyle } = require('lib/components/global-style.js');

const rootStyles_ = {};

class BaseScreenComponent extends React.Component {

	rootStyle(themeId) {
		const theme = themeStyle(themeId);
		if (rootStyles_[themeId]) return rootStyles_[themeId];
		rootStyles_[themeId] = StyleSheet.create({
			root: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
		});
		return rootStyles_[themeId];
	}
}

module.exports = { BaseScreenComponent };
