import { themeStyle } from '@joplin/lib/theme';
import * as React from 'react';
import { useMemo } from 'react';
const ReactToggleButton = require('react-toggle-button');
const Color = require('color');

interface Props {
	value: boolean;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onToggle: Function;
	themeId: number;
	'aria-label': string;
}

export default function(props: Props) {
	const theme = themeStyle(props.themeId);

	const ariaLabel = props['aria-label'];

	const passThroughInputProps = useMemo(() => {
		return {
			'aria-label': ariaLabel,

			// Works around a bug in ReactToggleButton -- the hidden checkbox input associated
			// with the toggle is always read as "unchecked" by screen readers.
			checked: props.value,
			// Silences a ReactJS warning: "You provided a `checked` prop to a form field without an `onChange` handler."
			// Change events are handled by ReactToggleButton.
			onChange: ()=>{},
		};
	}, [ariaLabel, props.value]);

	return (
		<ReactToggleButton
			value={props.value}
			onToggle={props.onToggle}
			colors={{
				activeThumb: {
					base: Color(theme.color5).rgb().string(),
				},
				active: {
					base: Color(theme.backgroundColor5).alpha(0.7).rgb().string(),
				},
			}}
			trackStyle={{
				opacity: props.value ? 1 : 0.3,
			}}
			thumbStyle={{
				opacity: props.value ? 1 : 0.5,
			}}
			inactiveLabel=""
			activeLabel=""
			passThroughInputProps={passThroughInputProps}
		/>
	);
}
