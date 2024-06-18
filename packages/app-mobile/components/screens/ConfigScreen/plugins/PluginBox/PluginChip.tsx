import * as React from 'react';
import { Chip, ChipProps } from 'react-native-paper';
import { useMemo } from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../../../../utils/types';
import { themeStyle } from '../../../../global-style';

type Props = {
	themeId: number;
	color?: string;
	faded?: boolean;
	onPress?: ()=> void;
	icon?: string;
	children: React.ReactNode;
};

const fadedStyle = { opacity: 0.87 };

const PluginChip: React.FC<Props> = props => {
	const themeOverride = useMemo(() => {
		const theme = themeStyle(props.themeId);
		const foreground = props.color ?? theme.color;
		const background = theme.backgroundColor;
		return {
			colors: {
				secondaryContainer: background,
				onSecondaryContainer: foreground,
				primary: foreground,

				outline: foreground,
				onPrimary: foreground,
				onSurfaceVariant: foreground,
			},
		};
	}, [props.themeId, props.color]);

	const accessibilityProps: Partial<ChipProps> = {};
	if (!props.onPress) {
		// Note: May have no effect until a future version of RN Paper.
		// See https://github.com/callstack/react-native-paper/pull/4327
		accessibilityProps.accessibilityRole = 'text';
	}

	return <Chip
		theme={themeOverride}
		style={props.faded ? fadedStyle : null}
		mode='outlined'
		{...accessibilityProps}
		{...props}
	/>;
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(PluginChip);
