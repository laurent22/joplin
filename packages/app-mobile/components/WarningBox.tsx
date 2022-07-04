/**
 * A closable warning banner.
 */

const React = require('react');
const { useState } = React;
const { View, Text, TouchableOpacity } = require('react-native');

import { _ } from '@joplin/lib/locale';

export const WarningBox = (props: {
	message: string;
	style: any;
	onPress: ()=> void;
}) => {
	const padding: number = props.style?.padding ?? 10;
	const [visible, setVisible] = useState(true);

	if (!visible) {
		return null;
	}

	return (
		<View style={{
			...props.style,
			flexDirection: 'row',
			alignItems: 'stretch',
			padding: 0,
		}}>
			<TouchableOpacity
				style={{
					flexGrow: 1,
					padding: padding,
				}}
				onPress={() => props.onPress()}
			>
				<Text>{props.message}</Text>
			</TouchableOpacity>
			<TouchableOpacity
				accessibilityLabel={_('Dismiss warning')}
				accessibilityRole="button"
				onPress={() => {
					setVisible(false);
				}}
				style={{
					width: 48,
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Text style={{
					fontSize: 22,
					minWidth: 40,
				}}>⨉</Text>
			</TouchableOpacity>
		</View>
	);
};

export default WarningBox;

