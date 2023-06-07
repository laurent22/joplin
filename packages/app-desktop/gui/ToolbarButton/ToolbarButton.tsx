import * as React from 'react';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { StyledRoot, StyledIconSpan, StyledIconI } from './styles';

interface Props {
	readonly themeId: number;
	readonly toolbarButtonInfo?: ToolbarButtonInfo;
	readonly title?: string;
	readonly tooltip?: string;
	readonly iconName?: string;
	readonly disabled?: boolean;
	readonly backgroundHover?: boolean;
}

function isFontAwesomeIcon(iconName: string) {
	const s = iconName.split(' ');
	return s.length === 2 && ['fa', 'fas'].includes(s[0]);
}

function getProp(props: Props, name: string, defaultValue: any = null) {
	if (props.toolbarButtonInfo && (name in props.toolbarButtonInfo)) return (props.toolbarButtonInfo as any)[name];
	if (!(name in props)) return defaultValue;
	return (props as any)[name];
}

export default function ToolbarButton(props: Props) {
	const title = getProp(props, 'title', '');
	const tooltip = getProp(props, 'tooltip', title);

	let icon = null;
	const iconName = getProp(props, 'iconName');
	if (iconName) {
		const IconClass = isFontAwesomeIcon(iconName) ? StyledIconI : StyledIconSpan;
		icon = <IconClass className={iconName} title={title}/>;
	}

	// Keep this for legacy compatibility but for consistency we should use "disabled" prop
	let isEnabled = getProp(props, 'enabled', null);
	if (isEnabled === null) isEnabled = true;
	if (props.disabled) isEnabled = false;

	const classes = ['button'];
	if (!isEnabled) classes.push('disabled');

	const onClick = getProp(props, 'onClick');

	const updateExternal = () => {
		const updateExternalClicked = getProp(props, 'updateExternalClicked');
		const externalClickedState = getProp(props, 'externalClickedState');
		if (typeof updateExternalClicked === 'function') {
			updateExternalClicked(!externalClickedState);
		}
	};

	return (
		<StyledRoot
			className={classes.join(' ')}
			disabled={!isEnabled}
			title={tooltip}
			href="#"
			hasTitle={!!title}
			onClick={() => {
				if (isEnabled && onClick) onClick();
				if (tooltip === 'Toggle external editing') updateExternal();
			}}
		>
			{icon}
			{title}
		</StyledRoot>
	);
}
