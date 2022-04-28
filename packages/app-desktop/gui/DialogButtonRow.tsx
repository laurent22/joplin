import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import useKeyboardHandler from './DialogButtonRow/useKeyboardHandler';

export interface ButtonSpec {
	name: string;
	label: string;
}

export interface ClickEvent {
	buttonName: string;
}

export type ClickEventHandler = (event: ClickEvent)=> void;

interface Props {
	themeId: number;
	onClick?: ClickEventHandler;
	cancelButtonShow?: boolean;
	cancelButtonLabel?: string;
	cancelButtonDisabled?: boolean;
	okButtonShow?: boolean;
	okButtonLabel?: string;
	okButtonRef?: any;
	okButtonDisabled?: boolean;
	customButtons?: ButtonSpec[];
}

export default function DialogButtonRow(props: Props) {
	const theme = themeStyle(props.themeId);

	const buttonStyle = useMemo(() => {
		return {
			...theme.buttonStyle,
			marginLeft: 10,
		};
	}, [theme.buttonStyle]);

	const onOkButtonClick = useCallback(() => {
		if (props.onClick && !props.okButtonDisabled) props.onClick({ buttonName: 'ok' });
	}, [props.onClick, props.okButtonDisabled]);

	const onCancelButtonClick = useCallback(() => {
		if (props.onClick && !props.cancelButtonDisabled) props.onClick({ buttonName: 'cancel' });
	}, [props.onClick, props.cancelButtonDisabled]);

	const onCustomButtonClick = useCallback((event: ClickEvent) => {
		if (props.onClick) props.onClick(event);
	}, [props.onClick]);

	const onKeyDown = useKeyboardHandler({ onOkButtonClick, onCancelButtonClick });

	const buttonComps = [];

	if (props.customButtons) {
		for (const b of props.customButtons) {
			buttonComps.push(
				<button key={b.name} style={buttonStyle} onClick={() => onCustomButtonClick({ buttonName: b.name })} onKeyDown={onKeyDown}>
					{b.label}
				</button>
			);
		}
	}

	if (props.okButtonShow !== false) {
		buttonComps.push(
			<button disabled={props.okButtonDisabled} key="ok" style={buttonStyle} onClick={onOkButtonClick} ref={props.okButtonRef} onKeyDown={onKeyDown}>
				{props.okButtonLabel ? props.okButtonLabel : _('OK')}
			</button>
		);
	}

	if (props.cancelButtonShow !== false) {
		buttonComps.push(
			<button disabled={props.cancelButtonDisabled} key="cancel" style={Object.assign({}, buttonStyle)} onClick={onCancelButtonClick}>
				{props.cancelButtonLabel ? props.cancelButtonLabel : _('Cancel')}
			</button>
		);
	}

	return <div style={{ textAlign: 'right', marginTop: 10 }}>{buttonComps}</div>;
}
