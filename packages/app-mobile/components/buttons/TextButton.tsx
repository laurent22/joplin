import * as React from 'react';
import { ReactNode, useMemo } from 'react';
import { themeStyle } from '../global-style';
import { Button, ButtonProps } from 'react-native-paper';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';
import { TextStyle, StyleSheet, ViewStyle, StyleProp } from 'react-native';

export enum ButtonType {
	Primary,
	Secondary,
	Delete,
	Link,
}

export enum ButtonSize {
	Normal,
	Larger,
}

interface Props extends Omit<ButtonProps, 'item'|'onPress'|'children'|'style'> {
	themeId: number;
	type: ButtonType;
	size?: ButtonSize;
	style?: TextStyle;
	onPress: ()=> void;
	children: ReactNode;
}

export type TextButtonProps = Omit<Props, 'themeId'>;

const useStyles = ({ themeId }: Props) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const themeOverride = {
			secondaryButton: {
				colors: {
					primary: theme.color4,
					outline: theme.color4,
				},
			},
			deleteButton: {
				colors: {
					primary: theme.destructiveColor,
					outline: theme.destructiveColor,
				},
			},
			primaryButton: { },
		};

		return {
			themeOverride,
			styles: StyleSheet.create({
				largeContainer: {
					paddingVertical: 2,
					borderWidth: 2,
					borderRadius: 10,
				},
				largeLabel: {
					fontSize: theme.fontSize,
					fontWeight: 'bold',
				},
			}),
		};
	}, [themeId]);
};

const TextButton: React.FC<Props> = props => {
	const { themeOverride, styles } = useStyles(props);

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

	let labelStyle: TextStyle|undefined = undefined;
	const containerStyle: StyleProp<ViewStyle>[] = [];
	if (props.size === ButtonSize.Larger) {
		labelStyle = styles.largeLabel;
		containerStyle.push(styles.largeContainer);
	}

	if (props.style) containerStyle.push(props.style);

	return <Button
		labelStyle={labelStyle}
		{...props}
		style={containerStyle}
		theme={theme}
		mode={mode}
		onPress={props.onPress}
	>{props.children}</Button>;
};

export default connect((state: AppState) => {
	return { themeId: state.settings.theme };
})(TextButton);
