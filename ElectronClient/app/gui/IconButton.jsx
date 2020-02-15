const React = require('react');
const { themeStyle } = require('../theme.js');

class IconButton extends React.Component {
	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const iconStyle = {
			color: theme.color,
			fontSize: theme.fontSize * 1.4,
		};
		const icon = <i style={iconStyle} className={`fa ${this.props.iconName}`}></i>;

		const rootStyle = Object.assign(
			{
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
			},
			style
		);

		return (
			<a
				href="#"
				style={rootStyle}
				className="icon-button"
				onClick={() => {
					if (this.props.onClick) this.props.onClick();
				}}
			>
				{icon}
			</a>
		);
	}
}

module.exports = { IconButton };
