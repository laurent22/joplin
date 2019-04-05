const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');
// const { Button } = require('@material/react-button');
const MaterialIcon = require('@material/react-material-icon').default;
const Button = require('@material/react-icon-button').default;

class IconButton extends React.Component {

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const iconStyle = {
			color: theme.color,
			fontSize: theme.fontSize * 1.4,
		};
		const icon = <MaterialIcon style={iconStyle} icon={this.props.iconName} />

		const rootStyle = Object.assign({
			display: 'flex',
			textDecoration: 'none',
			padding: 10,
			width: theme.buttonMinHeight,
			height: theme.buttonMinHeight,
			boxSizing: 'border-box',
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: theme.backgroundColor,
			cursor: 'default',
		}, style);

		return (
			<Button href="#" style={rootStyle} className="icon-button" onClick={() => { if (this.props.onClick) this.props.onClick() }}>
				{icon}
			</Button>
		);
	}

}

module.exports = { IconButton };
