import * as React from 'react';
import { ToolbarButtonInfo } from 'lib/services/CommandService';
import { StyledRoot, StyledIconSpan, StyledIconI } from './styles';
const { themeStyle } = require('lib/theme');

interface Props {
	readonly theme: number,
	readonly toolbarButtonInfo?: ToolbarButtonInfo,
	readonly title?: string,
	readonly tooltip?: string,
	readonly iconName?: string,
	readonly disabled?: boolean,
}

function isFontAwesomeIcon(iconName:string) {
	const s = iconName.split(' ');
	return s.length === 2 && ['fa', 'fas'].includes(s[0]);
}

function getProp(props:Props, name:string, defaultValue:any = null) {
	if (props.toolbarButtonInfo && (name in props.toolbarButtonInfo)) return (props.toolbarButtonInfo as any)[name];
	if (!(name in props)) return defaultValue;
	return (props as any)[name];
}

export default function ToolbarButton(props:Props) {
	const theme = themeStyle(props.theme);

	const title = getProp(props, 'title', '');
	const tooltip = getProp(props, 'tooltip', title);

	let icon = null;
	const iconName = getProp(props, 'iconName');
	if (iconName) {
		const IconClass = isFontAwesomeIcon(iconName) ? StyledIconI : StyledIconSpan;
		icon = <IconClass className={iconName} title={title} theme={theme}/>;
	}

	// Keep this for legacy compatibility but for consistency we should use "disabled" prop
	let isEnabled = getProp(props, 'enabled', null);
	if (isEnabled === null) isEnabled = true;
	if (props.disabled) isEnabled = false;

	const classes = ['button'];
	if (!isEnabled) classes.push('disabled');

	const onClick = getProp(props, 'onClick');

	return (
		<StyledRoot
			className={classes.join(' ')}
			disabled={!isEnabled}
			theme={theme}
			title={tooltip}
			href="#"
			onClick={() => {
				if (isEnabled && onClick) onClick();
			}}
		>
			{icon}
			{title}
		</StyledRoot>
	);
}

