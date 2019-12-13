const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');

function DialogButtonRow(props) {
	const theme = themeStyle(props.theme);

	const okButton_click = () => {
		if (props.onClick) props.onClick({ buttonName: 'ok' });
	};

	const cancelButton_click = () => {
		if (props.onClick) props.onClick({ buttonName: 'cancel' });
	};

	const onKeyDown = (event) => {
		if (event.keyCode === 13) {
			okButton_click();
		} else if (event.keyCode === 27) {
			cancelButton_click();
		}
	};

	const buttonComps = [];

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

module.exports = DialogButtonRow;
