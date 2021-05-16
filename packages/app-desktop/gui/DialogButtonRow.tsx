const React = require('react');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('@joplin/lib/theme');

export interface ButtonSpec {
	name: string;
	label: string;
}

export interface ClickEvent {
	buttonName: string;
}

interface Props {
	themeId: number;
	onClick?: (event: ClickEvent)=> void;
	okButtonShow?: boolean;
	cancelButtonShow?: boolean;
	cancelButtonLabel?: string;
	okButtonRef?: any;
	customButtons?: ButtonSpec[];
}

export default function DialogButtonRow(props: Props) {
	const theme = themeStyle(props.themeId);

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
				<button key={b.name} style={theme.buttonStyle} onClick={() => customButton_click({ buttonName: b.name })} onKeyDown={onKeyDown}>
					{b.label}
				</button>
			);
		}
	}

	if (props.okButtonShow !== false) {
		buttonComps.push(
			<button key="ok" style={theme.buttonStyle} onClick={okButton_click} ref={props.okButtonRef} onKeyDown={onKeyDown}>
				{_('OK')}
			</button>
		);
	}

	if (props.cancelButtonShow !== false) {
		buttonComps.push(
			<button key="cancel" style={Object.assign({}, theme.buttonStyle, { marginLeft: 10 })} onClick={cancelButton_click}>
				{props.cancelButtonLabel ? props.cancelButtonLabel : _('Cancel')}
			</button>
		);
	}

	return <div style={{ textAlign: 'right', marginTop: 10 }}>{buttonComps}</div>;
}
