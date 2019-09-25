const React = require('react');

const { StyleSheet } = require('react-native');
const { globalStyle, themeStyle } = require('lib/components/global-style.js');

const styleObject_ = {
	screen: {
		flex: 1,
		backgroundColor: globalStyle.backgroundColor,
	},
};

const styles_ = StyleSheet.create(styleObject_);

let rootStyles_ = {};

class BaseScreenComponent extends React.Component {
	styles() {
		return styles_;
	}

	styleObject() {
		return styleObject_;
	}

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
