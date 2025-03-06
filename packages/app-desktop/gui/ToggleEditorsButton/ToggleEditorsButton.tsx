import * as React from 'react';
import styles_ from './styles';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { _ } from '@joplin/lib/locale';

export enum Value {
	Markdown = 'markdown',
	RichText = 'richText',
}

export interface Props {
	themeId: number;
	value: Value;
	toolbarButtonInfo: ToolbarButtonInfo;
	tabIndex?: number;
	buttonRef?: React.Ref<HTMLButtonElement>;
}

export default function ToggleEditorsButton(props: Props) {
	const style = styles_(props);

	return (
		<button
			ref={props.buttonRef}
			style={style.button}
			disabled={!props.toolbarButtonInfo.enabled}
			aria-label={props.toolbarButtonInfo.tooltip}
			aria-description={_('Switch to the %s Editor', props.value !== Value.Markdown ? _('Markdown') : _('Rich Text'))}
			title={props.toolbarButtonInfo.tooltip}
			type="button"
			className={`tox-tbtn ${props.value}-active`}
			aria-pressed="false"
			onClick={props.toolbarButtonInfo.onClick}
			tabIndex={props.tabIndex}
		>
			<div style={style.leftInnerButton}>
				<i style={style.leftIcon} className="fab fa-markdown"></i>
			</div>
			<div style={style.rightInnerButton}>
				<i style={style.rightIcon} className="fas fa-edit"></i>
			</div>
		</button>
	);
}
