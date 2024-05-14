import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { TextStyle, StyleSheet } from 'react-native';
import { ButtonSpec, StyleSheetData } from './types';
import IconButton from '../../IconButton';

export const buttonSize = 54;

interface ToolbarButtonProps {
	styleSheet: StyleSheetData;
	style?: TextStyle;
	spec: ButtonSpec;
	onActionComplete?: ()=> void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const useStyles = (baseStyleSheet: any, baseButtonStyle: any, buttonSpec: ButtonSpec, visible: boolean, disabled: boolean) => {
	return useMemo(() => {
		const activatedStyle = buttonSpec.active ? baseStyleSheet.buttonActive : {};
		const disabledStyle = disabled ? baseStyleSheet.buttonDisabled : {};

		const activatedTextStyle = buttonSpec.active ? baseStyleSheet.buttonActiveContent : {};
		const disabledTextStyle = disabled ? baseStyleSheet.buttonDisabledContent : {};

		return StyleSheet.create({
			iconStyle: {
				...activatedTextStyle,
				...disabledTextStyle,
				...baseStyleSheet.text,
			},
			buttonStyle: {
				...baseStyleSheet.button,
				...activatedStyle,
				...disabledStyle,
				...baseButtonStyle,
				...(!visible ? { opacity: 0 } : null),
			},
		});
	}, [
		baseStyleSheet.button, baseStyleSheet.text, baseButtonStyle, baseStyleSheet.buttonActive,
		baseStyleSheet.buttonDisabled, baseStyleSheet.buttonActiveContent, baseStyleSheet.buttonDisabledContent,
		buttonSpec.active, visible, disabled,
	]);
};

const ToolbarButton = ({ styleSheet, spec, onActionComplete, style }: ToolbarButtonProps) => {
	const visible = spec.visible ?? true;
	const disabled = (spec.disabled ?? false) && visible;
	const styles = useStyles(styleSheet.styles, style, spec, visible, disabled);

	const sourceOnPress = spec.onPress;
	const onPress = useCallback(() => {
		if (!disabled) {
			sourceOnPress();
			onActionComplete?.();
		}
	}, [disabled, sourceOnPress, onActionComplete]);

	return (
		<IconButton
			containerStyle={styles.buttonStyle}
			themeId={styleSheet.themeId}
			onPress={onPress}
			description={ spec.description }
			disabled={ disabled }

			iconName={spec.icon}
			iconStyle={styles.iconStyle}
		/>
	);
};

export default ToolbarButton;
