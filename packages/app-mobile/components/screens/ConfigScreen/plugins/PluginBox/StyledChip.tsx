import * as React from 'react';
import { Chip, ChipProps } from 'react-native-paper';
import { useMemo } from 'react';

type Props = ({
	foreground: string;
	background: string;
}|{
	foreground?: undefined;
	background?: undefined;
}) & ChipProps;

const RecommendedChip: React.FC<Props> = props => {
	const themeOverride = useMemo(() => {
		if (!props.foreground) return {};
		return {
			colors: {
				secondaryContainer: props.background,
				onSecondaryContainer: props.foreground,
				primary: props.foreground,
			},
		};
	}, [props.foreground, props.background]);

	const accessibilityProps: Partial<Props> = {};
	if (!props.onPress) {
		// TODO: May have no effect until a future version of RN Paper.
		// See https://github.com/callstack/react-native-paper/pull/4327
		accessibilityProps.accessibilityRole = 'text';
	}

	return <Chip
		theme={themeOverride}
		{...accessibilityProps}
		{...props}
	/>;
};

export default RecommendedChip;
