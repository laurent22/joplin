import * as React from 'react';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';

interface Props {
	readonly themeId: number;
	readonly toolbarButtonInfo?: ToolbarButtonInfo;
	readonly title?: string;
	readonly tooltip?: string;
	readonly iconName?: string;
	readonly disabled?: boolean;
	readonly backgroundHover?: boolean;
	readonly tabIndex?: number;

	buttonRef?: React.Ref<HTMLButtonElement>;
}

function isFontAwesomeIcon(iconName: string) {
	const s = iconName.split(' ');
	return s.length === 2 && ['fa', 'fas'].includes(s[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function getProp(props: Props, name: string, defaultValue: any = null) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	if (props.toolbarButtonInfo && (name in props.toolbarButtonInfo)) return (props.toolbarButtonInfo as any)[name];
	if (!(name in props)) return defaultValue;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return (props as any)[name];
}

export default function ToolbarButton(props: Props) {
	const title = getProp(props, 'title', '');
	const tooltip = getProp(props, 'tooltip', title);

	let icon = null;
	const iconName = getProp(props, 'iconName');
	if (iconName) {
		const iconProps: React.HTMLProps<HTMLDivElement> = {
			'aria-hidden': true,
			role: 'img',
			className: `toolbar-icon ${title ? '-has-title' : ''} ${iconName}`,
		};
		icon = isFontAwesomeIcon(iconName) ? <i {...iconProps} /> : <span {...iconProps} />;
	}

	// Keep this for legacy compatibility but for consistency we should use "disabled" prop
	let isEnabled = getProp(props, 'enabled', null);
	if (isEnabled === null) isEnabled = true;
	if (props.disabled) isEnabled = false;

	const classes = ['button', 'toolbar-button'];
	if (!isEnabled) classes.push('disabled');
	if (title) classes.push('-has-title');

	const onClick = getProp(props, 'onClick');
	const style: React.CSSProperties = {
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis' };
	const disabled = !isEnabled;

	return (
		<button
			className={classes.join(' ')}
			title={tooltip}
			onClick={() => {
				if (isEnabled && onClick) onClick();
			}}
			ref={props.buttonRef}

			// At least on MacOS, the disabled HTML prop isn't sufficient for the screen reader
			// to read the element as disable. For this, aria-disabled is necessary.
			disabled={disabled}
			aria-label={!title ? tooltip : undefined}
			aria-description={title ? tooltip : undefined}
			aria-disabled={!isEnabled}
			tabIndex={props.tabIndex}
		>
			{icon}
			<span style={style}>{title}</span>
		</button>
	);
}

