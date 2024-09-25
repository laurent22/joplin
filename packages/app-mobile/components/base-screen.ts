import * as React from 'react';
import { StyleSheet } from 'react-native';
import { themeStyle } from './global-style';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const rootStyles_: Record<number, any> = {};

class BaseScreenComponent<Props, State> extends React.Component<Props, State> {

	protected rootStyle(themeId: number) {
		const theme = themeStyle(themeId);
		if (rootStyles_[themeId]) return rootStyles_[themeId];
		rootStyles_[themeId] = StyleSheet.create({
			root: theme.rootStyle,
		});
		return rootStyles_[themeId];
	}
}

export { BaseScreenComponent };
export default BaseScreenComponent;
