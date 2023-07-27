import * as React from 'react';

import { ConfigScreenStyleSheet } from './configScreenStyles';
import { View, Text, LayoutChangeEvent } from 'react-native';

interface Props {
	styles: ConfigScreenStyleSheet;
	title: string;
	onLayout?: (event: LayoutChangeEvent)=> void;
}

const SectionHeader: React.FunctionComponent<Props> = props => {
	return (
		<View
			style={props.styles.headerWrapperStyle}
			onLayout={props.onLayout}
		>
			<Text style={props.styles.headerTextStyle}>
				{props.title}
			</Text>
		</View>
	);
};

export default SectionHeader;
