import * as React from 'react';
import { ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { themeStyle } from '../global-style';
import { Button, ButtonProps } from 'react-native-paper';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';

export enum ButtonType {
	Primary,
	Secondary,
	Link,
}

export interface Props extends Omit<ButtonProps, 'item'|'onPress'|'children'> {
	themeId: number;
	type: ButtonType;
	onPress: ()=> void;
	children: ReactNode;
	loading?: boolean;
}

const useStyles = (themeId: number, styleOverride: StyleProp<ViewStyle>) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const styles = StyleSheet.create({
			button: {
				borderRadius: 10,
				...StyleSheet.flatten(styleOverride),
			},
		});

		const themeOverride = {
			secondaryButton: {
				colors: {
					primary: theme.color4,
					outline: theme.color4,
				},
			},
			primaryButton: {
				colors: {
					primary: theme.color4,
					onPrimary: theme.backgroundColor4,
				},
			},
		};

		return { styles, themeOverride };
	}, [themeId, styleOverride]);
};

const TextButton: React.FC<Props> = props => {
	const { styles, themeOverride } = useStyles(props.themeId, props.style);

	let mode: ButtonProps['mode'];
	let theme: ButtonProps['theme'];

	if (props.type === ButtonType.Primary) {
		theme = themeOverride.primaryButton;
		mode = 'contained';
	} else if (props.type === ButtonType.Secondary) {
		theme = themeOverride.secondaryButton;
		mode = 'outlined';
	} else if (props.type === ButtonType.Link) {
		theme = themeOverride.secondaryButton;
		mode = 'text';
	}

	return <Button
		{...props}
		style={styles.button}
		theme={theme}
		mode={mode}
		onPress={props.onPress}
	>{props.children}</Button>;
};

export default connect((state: AppState) => {
	return { themeId: state.settings.theme };
})(TextButton);
