import * as React from 'react';
import { ViewStyle } from 'react-native';
import { Banner } from 'react-native-paper';

interface Props {
	content: string;
}

const style: ViewStyle = { marginBottom: 10 };

const SectionDescription: React.FC<Props> = props => {
	return (
		<Banner
			visible={true}
			icon='information'
			style={style}
		>
			{props.content}
		</Banner>
	);
};
export default SectionDescription;
