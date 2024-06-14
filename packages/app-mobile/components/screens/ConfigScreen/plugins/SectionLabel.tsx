import * as React from 'react';
import { ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
	children: React.ReactNode;
	visible: boolean;
}

const style: ViewStyle = {
	margin: 12,
	marginTop: 17,
	marginBottom: 4,
};

const SectionLabel: React.FC<Props> = props => {
	if (!props.visible) return null;

	return <Text style={style} variant='labelLarge'>
		{props.children}
	</Text>;
};

export default SectionLabel;
