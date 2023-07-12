import * as React from 'react';

import { Text } from 'react-native';
import { ExportScreenStyles } from './useStyles';

interface Props {
	title: string;
	description: string;
	styles: ExportScreenStyles;
}

const SectionHeader = (props: Props) => {
	return <>
		<Text style={props.styles.sectionHeaderStyle}>{props.title}</Text>
		<Text style={props.styles.sectionDescriptionStyle}>{props.description}</Text>
	</>;
};

export default SectionHeader;
