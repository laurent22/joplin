import * as React from 'react';
import { StyleSheet } from 'react-native';
const { themeStyle } = require('./global-style.js');

const rootStyles_: Record<number, any> = {};

class BaseScreenComponent<Props, State> extends React.Component<Props, State> {

	protected rootStyle(themeId: number) {
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

export { BaseScreenComponent };
export default BaseScreenComponent;
