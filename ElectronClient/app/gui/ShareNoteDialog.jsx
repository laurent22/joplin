const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');

function ShareNoteDialog(props) {
	const theme = themeStyle(props.theme);

	return (
		<div style={theme.dialogModalLayer}>
			<div style={theme.dialogBox}>
				<div style={theme.dialogTitle}>{_('Share Notes')}</div>
			</div>
		</div>
	);
}

module.exports = ShareNoteDialog;
