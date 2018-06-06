const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');

class ToolbarLabel extends React.Component {

	render() {
		const theme = themeStyle(this.props.theme);

		const style = {
			height: theme.toolbarHeight,
			minWidth: theme.toolbarHeight,
			display: 'flex',
			alignItems: 'center',
			paddingLeft: theme.headerButtonHPadding,
			paddingRight: theme.headerButtonHPadding,
			color: theme.color,
			textDecoration: 'none',
			fontFamily: theme.fontFamily,
			fontSize: theme.fontSize,
			boxSizing: 'border-box',
			cursor: 'default',
			justifyContent: 'center',
		};

		let icon = null;
		if (this.props.iconName) {
			const iconStyle = {
				fontSize: Math.round(theme.fontSize * 1.4),
				color: theme.color
			};
			if (this.props.title) iconStyle.marginRight = 5;
			icon = <i style={iconStyle} className={"fa " + this.props.iconName}></i>
		}
		let classes = []; 

		return (
			<a
				className={classes.join(' ')}
				style={style}
				href="#"
				>
				{icon}{this.props.title ? this.props.title : ''}
			</a>
		);
	}

}

module.exports = ToolbarLabel;