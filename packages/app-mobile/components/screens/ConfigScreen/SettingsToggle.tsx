import * as React from 'react';
import { FunctionComponent, ReactNode } from 'react';

import { View, Text, Switch } from 'react-native';
import { UpdateSettingValueCallback } from './types';
import { themeStyle } from '@joplin/lib/theme';
import { ConfigScreenStyles } from './configScreenStyles';

interface Props {
	settingId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;

	themeId: number;
	styles: ConfigScreenStyles;

	label: string;
	updateSettingValue: UpdateSettingValueCallback;

	description?: ReactNode;
}

const SettingsToggle: FunctionComponent<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styleSheet = props.styles.styleSheet;

	const containerStyles = props.styles.getContainerStyle(!!props.description);

	return (
		<View style={containerStyles.outerContainer}>
			<View style={containerStyles.innerContainer}>
				<Text key="label" style={styleSheet.switchSettingText}>
					{props.label}
				</Text>
				<Switch
					key="control"
					style={styleSheet.switchSettingControl}
					trackColor={{ false: theme.dividerColor }}
					value={props.value}
					onValueChange={(value: boolean) => void props.updateSettingValue(props.settingId, value)}
					accessibilityHint={props.label}
				/>
			</View>
			{props.description}
		</View>
	);
};

export default SettingsToggle;
