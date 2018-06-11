const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');

class ToolbarButton extends React.Component {

	render() {
		//const style = this.props.style;
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

		const title = this.props.title ? this.props.title : '';
		const tooltip = this.props.tooltip ? this.props.tooltip : title;

		let icon = null;
		if (this.props.iconName) {
			const iconStyle = {
				fontSize: Math.round(theme.fontSize * 1.4),
				color: theme.color
			};
			if (title) iconStyle.marginRight = 5;
			icon = <i style={iconStyle} className={"fa " + this.props.iconName}></i>
		}

		const isEnabled = (!('enabled' in this.props) || this.props.enabled === true);
		let classes = ['button'];
		if (!isEnabled) classes.push('disabled');

		const finalStyle = Object.assign({}, style, {
			opacity: isEnabled ? 1 : 0.4,
		});

		return (
			<a
				className={classes.join(' ')}
				style={finalStyle}
				title={tooltip}
				href="#"
				onClick={() => { if (isEnabled && this.props.onClick) this.props.onClick() }}
				>
				{icon}{title}
			</a>
		);
	}

}

module.exports = ToolbarButton;