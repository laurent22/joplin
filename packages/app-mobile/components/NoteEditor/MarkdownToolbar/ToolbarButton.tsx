import React = require('react');
import { useCallback } from 'react';
import { Text, TextStyle } from 'react-native';
import { ButtonSpec, StyleSheetData } from './types';
import CustomButton from '../../CustomButton';

export const buttonSize = 54;

interface ToolbarButtonProps {
	styleSheet: StyleSheetData;
	style?: TextStyle;
	spec: ButtonSpec;
	onActionComplete?: ()=> void;
}

const ToolbarButton = ({ styleSheet, spec, onActionComplete, style }: ToolbarButtonProps) => {
	const visible = spec.visible ?? true;
	const disabled = (spec.disabled ?? false) && visible;
	const styles = styleSheet.styles;

	// Additional styles if activated
	const activatedStyle = spec.active ? styles.buttonActive : {};
	const activatedTextStyle = spec.active ? styles.buttonActiveContent : {};
	const disabledStyle = disabled ? styles.buttonDisabled : {};
	const disabledTextStyle = disabled ? styles.buttonDisabledContent : {};

	let content;

	if (typeof spec.icon === 'string') {
		content = (
			<Text style={{ ...styles.text, ...activatedTextStyle, ...disabledTextStyle }}>
				{spec.icon}
			</Text>
		);
	} else {
		content = spec.icon;
	}

	const sourceOnPress = spec.onPress;
	const onPress = useCallback(() => {
		if (!disabled) {
			sourceOnPress();
			onActionComplete?.();
		}
	}, [disabled, sourceOnPress, onActionComplete]);

	return (
		<CustomButton
			style={{
				...styles.button, ...activatedStyle, ...disabledStyle, ...style,
				...(!visible ? { opacity: 0 } : null),
			}}
			themeId={styleSheet.themeId}
			onPress={onPress}
			description={ spec.description }
			accessibilityRole="button"
			disabled={ disabled }
		>
			{ content }
		</CustomButton>
	);
};

export default ToolbarButton;
