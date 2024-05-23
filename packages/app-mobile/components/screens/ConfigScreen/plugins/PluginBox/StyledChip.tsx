import * as React from 'react';
import { Chip, ChipProps } from 'react-native-paper';
import { useMemo } from 'react';


interface Props extends ChipProps {
	foreground: string;
	background: string;
}

const RecommendedChip: React.FC<Props> = props => {
	const themeOverride = useMemo(() => {
		return {
			colors: {
				secondaryContainer: props.background,
				onSecondaryContainer: props.foreground,
				primary: props.foreground,
			},
		};
	}, [props.foreground, props.background]);

	return <Chip
		icon='crown'
		theme={themeOverride}
		{...props}
	/>;
};

export default RecommendedChip;
