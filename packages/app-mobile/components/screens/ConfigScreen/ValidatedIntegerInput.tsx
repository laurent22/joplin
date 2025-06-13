import * as React from 'react';
import { View, Text, TextInput } from 'react-native';
import Setting, { AppType, SettingItem } from '@joplin/lib/models/Setting';
import { ConfigScreenStyles } from './configScreenStyles';
import { UpdateSettingValueCallback } from './types';
import { themeStyle } from '../../global-style';
import { HelperText } from 'react-native-paper';
import { FunctionComponent, ReactNode, useId, useState } from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {
	settingId: string;
	value: number;
	styles: ConfigScreenStyles;
	themeId: number;
	label: string;
	updateSettingValue: UpdateSettingValueCallback;
	description?: ReactNode;
}

export const validate = (newValue: string, md: SettingItem, label: string) => {
	const minimum = 'minimum' in md ? md.minimum : null;
	const maximum = 'maximum' in md ? md.maximum : null;

	if (!newValue || !Number.isInteger(Number(newValue))) {
		return _('%s must be a valid whole number', label);
	}

	const newValueInt = Number(newValue);

	if (maximum && newValueInt > maximum) {
		return _('%s cannot be greater than %s', label, maximum);
	}

	if (minimum && newValueInt < minimum) {
		return _('%s cannot be less than %s', label, minimum);
	}

	return '';
};

const ValidatedIntegerInput: FunctionComponent<Props> = props => {
	const [valueState, setValueState] = useState(props.value?.toString());
	const md = Setting.settingMetadata(props.settingId);
	const themeId = props.themeId;
	const theme = themeStyle(themeId);
	const settingDescription = md.description ? md.description(AppType.Mobile) : '';
	const styleSheet = props.styles.styleSheet;
	const containerStyles = props.styles.getContainerStyle(!!settingDescription);
	const labelId = useId();
	const label = md.unitLabel?.toString() !== undefined ? `${props.label} (${md.unitLabel(md.value)})` : `${props.label}`;

	const hasErrors = () => {
		return validate(valueState, md, props.label) !== '';
	};

	return (
		<View key={props.settingId} style={containerStyles.outerContainer}>
			<View key={props.settingId} style={containerStyles.innerContainer}>
				<Text key="label" style={styleSheet.settingText} nativeID={labelId}>
					{label}
				</Text>
				<TextInput
					keyboardType="numeric"
					autoCorrect={false}
					autoComplete="off"
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					autoCapitalize="none"
					key="control"
					style={hasErrors() ? { ...styleSheet.settingControl, ...styleSheet.invalidInput } : styleSheet.settingControl}
					value={valueState}
					onChangeText={newValue => {
						setValueState(newValue);
						void props.updateSettingValue(props.settingId, validate(newValue, md, props.label) === '' ? newValue : Setting.value(props.settingId));
					}}
					maxLength={15}
					secureTextEntry={!!md.secure}
					aria-labelledby={labelId}
					disableFullscreenUI={true}
				/>
			</View>
			{hasErrors() ? <HelperText type="error" style={styleSheet.invalidMessage} visible={true}>
				{validate(valueState, md, props.label)}
			</HelperText> : null}
			{props.description}
		</View>
	);
};

export default ValidatedIntegerInput;
