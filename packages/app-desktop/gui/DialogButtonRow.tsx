const React = require('react');
import { useMemo } from 'react';
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('@joplin/lib/theme');

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

	const okButton_click = () => {
		if (props.onClick) props.onClick({ buttonName: 'ok' });
	};

	const cancelButton_click = () => {
		if (props.onClick) props.onClick({ buttonName: 'cancel' });
	};

	const customButton_click = (event: ClickEvent) => {
		if (props.onClick) props.onClick(event);
	};

	const onKeyDown = (event: any) => {
		if (event.keyCode === 13) {
			okButton_click();
		} else if (event.keyCode === 27) {
			cancelButton_click();
		}
	};

	const buttonComps = [];

	if (props.customButtons) {
		for (const b of props.customButtons) {
			buttonComps.push(
				<button key={b.name} style={buttonStyle} onClick={() => customButton_click({ buttonName: b.name })} onKeyDown={onKeyDown}>
					{b.label}
				</button>
			);
		}
	}

	if (props.okButtonShow !== false) {
		buttonComps.push(
			<button disabled={props.okButtonDisabled} key="ok" style={buttonStyle} onClick={okButton_click} ref={props.okButtonRef} onKeyDown={onKeyDown}>
				{props.okButtonLabel ? props.okButtonLabel : _('OK')}
			</button>
		);
	}

	if (props.cancelButtonShow !== false) {
		buttonComps.push(
			<button disabled={props.cancelButtonDisabled} key="cancel" style={Object.assign({}, buttonStyle)} onClick={cancelButton_click}>
				{props.cancelButtonLabel ? props.cancelButtonLabel : _('Cancel')}
			</button>
		);
	}

	return <div style={{ textAlign: 'right', marginTop: 10 }}>{buttonComps}</div>;
}
