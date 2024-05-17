import * as React from 'react';
import { ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { themeStyle } from '../global-style';
import { Button, ButtonProps } from 'react-native-paper';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';

export enum ButtonType {
	Primary,
	Secondary,
	Delete,
	Link,
}

interface Props extends Omit<ButtonProps, 'item'|'onPress'|'children'> {
	themeId: number;
	type: ButtonType;
	onPress: ()=> void;
	children: ReactNode;
	inline?: boolean;
}

export type TextButtonProps = Omit<Props, 'themeId'>;

const useStyles = ({ themeId, style: styleOverride, loading, icon }: Props) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const overrides = StyleSheet.flatten(styleOverride as StyleProp<ViewStyle>);

		const button: TextStyle = {
			borderRadius: 10,
			fontWeight: '600',
			fontSize: theme.fontSize,
		};

		const styles = StyleSheet.create({
			blockButton: {
				...button,
				...overrides,
			},
			inlineButton: {
				...button,
				borderRadius: 5,
				marginRight: theme.marginRight / 2,
				marginLeft: theme.marginLeft / 2,
				padding: 0,
				...overrides,
			},
			buttonLabel: {
				fontWeight: '600',
				fontSize: theme.fontSize * 0.95,
				// Additional space is needed when loading to prevent overlap
				// with the button label.
				marginLeft: 14 + (loading || icon ? 10 : 0),
				marginRight: 14,
			},
		});

		const themeOverride = {
			secondaryButton: {
				colors: {
					primary: theme.color4,
					outline: theme.color4,
				},
			},
			deleteButton: {
				colors: {
					primary: theme.deleteColor,
					outline: theme.deleteColor,
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
	}, [themeId, styleOverride, loading, icon]);
};

const TextButton: React.FC<Props> = props => {
	const { styles, themeOverride } = useStyles(props);

	let mode: ButtonProps['mode'];
	let theme: ButtonProps['theme'];

	if (props.type === ButtonType.Primary) {
		theme = themeOverride.primaryButton;
		mode = 'contained';
	} else if (props.type === ButtonType.Secondary) {
		theme = themeOverride.secondaryButton;
		mode = 'outlined';
	} else if (props.type === ButtonType.Delete) {
		theme = themeOverride.deleteButton;
		mode = 'outlined';
	} else if (props.type === ButtonType.Link) {
		theme = themeOverride.secondaryButton;
		mode = 'text';
	} else {
		const exhaustivenessCheck: never = props.type;
		return exhaustivenessCheck;
	}

	return <Button
		{...props}
		style={props.inline ? styles.inlineButton : styles.blockButton}
		labelStyle={styles.buttonLabel}
		theme={theme}
		mode={mode}
		onPress={props.onPress}
	>{props.children}</Button>;
};

export default connect((state: AppState) => {
	return { themeId: state.settings.theme };
})(TextButton);
