const React = require('react');
import { useMemo } from 'react';
import { themeStyle } from './global-style';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

interface Props extends TextInputProps {
	themeId: number;
}

export default (props: Props) => {
	const theme = themeStyle(props.themeId);
	const finalProps: Props = { ...props };

	if (!('placeholderTextColor' in finalProps)) finalProps.placeholderTextColor = theme.colorFaded;
	if (!('underlineColorAndroid' in finalProps)) finalProps.underlineColorAndroid = theme.dividerColor;
	if (!('selectionColor' in finalProps)) finalProps.selectionColor = theme.textSelectionColor;
	if (!('keyboardAppearance' in finalProps)) finalProps.keyboardAppearance = theme.keyboardAppearance;
	if (!('style' in finalProps)) finalProps.style = {};

	const defaultStyle = useMemo(() => {
		const theme = themeStyle(finalProps.themeId);

		return StyleSheet.create({
			textInput: {
				color: theme.color,
				paddingLeft: 14,
				paddingRight: 14,
				paddingTop: 12,
				paddingBottom: 12,
			},
		});
	}, [finalProps.themeId]);

	finalProps.style = [defaultStyle.textInput, finalProps.style];

	return <TextInput {...finalProps} />;
};
