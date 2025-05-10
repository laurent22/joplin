import * as React from 'react';
import { View, Text, TextInput } from 'react-native';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import { ConfigScreenStyles } from './configScreenStyles';
import { UpdateSettingValueCallback } from './types';
import { themeStyle } from '../../global-style';
import { FunctionComponent, ReactNode, useId, useState } from 'react';

interface Props {
	settingId: string;
	value: string;
	styles: ConfigScreenStyles;
	themeId: number;
	label: string;
	updateSettingValue: UpdateSettingValueCallback;
	description?: ReactNode;
}

const SettingTextInput: FunctionComponent<Props> = props => {
	const [valueState, setValueState] = useState(props.value);
	const md = Setting.settingMetadata(props.settingId);
	const themeId = props.themeId;
	const theme = themeStyle(themeId);
	const settingDescription = md.description ? md.description(AppType.Mobile) : '';
	const styleSheet = props.styles.styleSheet;
	const containerStyles = props.styles.getContainerStyle(!!settingDescription);
	const labelId = useId();

	return (
		<View key={props.settingId} style={containerStyles.outerContainer}>
			<View key={props.settingId} style={containerStyles.innerContainer}>
				<Text key="label" style={styleSheet.settingText} nativeID={labelId}>
					{md.label()}
				</Text>
				<TextInput
					autoCorrect={false}
					autoComplete="off"
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					autoCapitalize="none"
					key="control"
					style={styleSheet.settingControl}
					value={valueState}
					onChangeText={(newValue: string) => {
						setValueState(newValue);
						void props.updateSettingValue(props.settingId, newValue);
					}}
					secureTextEntry={!!md.secure}
					aria-labelledby={labelId}
				/>
			</View>
			{props.description}
		</View>
	);
};

export default SettingTextInput;
