
import * as React from 'react';
import { FunctionComponent, ReactNode } from 'react';
import { View, Text, Button } from 'react-native';
import { ConfigScreenStyles } from './configScreenStyles';

interface Props {
	title: string;
	description?: string;
	clickHandler: ()=> void;
	styles: ConfigScreenStyles;
	disabled?: boolean;
	statusComponent?: ReactNode;
}

const SettingsButton: FunctionComponent<Props> = props => {
	const styles = props.styles.styleSheet;

	let descriptionComp = null;
	if (props.description) {
		descriptionComp = (
			<View style={{ flex: 1, marginTop: 10 }}>
				<Text style={styles.descriptionText}>{props.description}</Text>
			</View>
		);
	}

	return (
		<View style={styles.settingContainer}>
			<View style={{ flex: 1, flexDirection: 'column' }}>
				<View style={{ flex: 1 }}>
					<Button title={props.title} onPress={props.clickHandler} disabled={!!props.disabled} />
				</View>
				{props.statusComponent}
				{descriptionComp}
			</View>
		</View>
	);
};
export default SettingsButton;
