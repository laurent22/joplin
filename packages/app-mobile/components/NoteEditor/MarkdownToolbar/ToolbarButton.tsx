import React = require('react');
import { useCallback } from 'react';
import { TouchableOpacity, Text, TextStyle } from 'react-native';
import { ButtonSpec } from './types';

export const buttonSize = 56;

interface ToolbarButtonProps {
	styleSheet: any;
	style?: TextStyle;
	spec: ButtonSpec;
	onActionComplete?: ()=> void;
}

const ToolbarButton = ({ styleSheet, spec, onActionComplete, style }: ToolbarButtonProps) => {
	const disabled = spec.disabled ?? false;

	// Additional styles if activated
	const activatedStyle = spec.active ? styleSheet.buttonActive : {};
	const activatedTextStyle = spec.active ? styleSheet.buttonActiveContent : {};
	const disabledStyle = disabled ? styleSheet.buttonDisabled : {};
	const disabledTextStyle = disabled ? styleSheet.buttonDisabledContent : {};

	let content;

	if (typeof spec.icon === 'string') {
		content = (
			<Text style={{ ...styleSheet.text, ...activatedTextStyle, ...disabledTextStyle }}>
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
		<TouchableOpacity
			style={{ ...styleSheet.button, ...activatedStyle, ...disabledStyle, ...style }}
			onPress={onPress}
			accessibilityLabel={ spec.accessibilityLabel }
			accessibilityRole="button"
			disabled={ disabled }
		>
			{ content }
		</TouchableOpacity>
	);
};

export default ToolbarButton;
