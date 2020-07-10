const React = require('react');
const { themeStyle } = require('lib/theme');
// const { bridge } = require('electron').remote.require('./bridge');
// const { _ } = require('lib/locale.js');
// const Setting = require('lib/models/Setting');

class KeymapConfigScreen extends React.Component {
	constructor() {
		super();
	}

	render() {
		const theme = themeStyle(this.props.theme);

		const containerStyle = Object.assign({}, theme.containerStyle, {
			overflowY: 'scroll',
		});

		// const buttonStyle = Object.assign({}, theme.buttonStyle, { marginRight: 10 });

		// const stepBoxStyle = {
		// 	border: '1px solid',
		// 	borderColor: theme.dividerColor,
		// 	padding: 15,
		// 	paddingTop: 0,
		// 	marginBottom: 15,
		// 	backgroundColor: theme.backgroundColor,
		// };

		return (
			<div>
				<div style={containerStyle}>
					<div style={{ padding: theme.margin }}>
					</div>
				</div>
			</div>
		);
	}
}

module.exports = { KeymapConfigScreen };
