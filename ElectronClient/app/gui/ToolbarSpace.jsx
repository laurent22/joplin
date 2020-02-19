const React = require('react');
const { themeStyle } = require('../theme.js');

class ToolbarSpace extends React.Component {
	render() {
		const theme = themeStyle(this.props.theme);
		const style = Object.assign({}, theme.toolbarStyle);
		style.minWidth = style.height / 2;

		return <span style={style}></span>;
	}
}

module.exports = ToolbarSpace;
