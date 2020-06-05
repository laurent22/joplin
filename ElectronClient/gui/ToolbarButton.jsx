const React = require('react');
const { themeStyle } = require('../theme.js');

class ToolbarButton extends React.Component {
	render() {
		const theme = themeStyle(this.props.theme);

		const style = Object.assign({}, theme.toolbarStyle);

		const title = this.props.title ? this.props.title : '';
		const tooltip = this.props.tooltip ? this.props.tooltip : title;

		let icon = null;
		if (this.props.iconName) {
			const iconStyle = {
				fontSize: Math.round(theme.fontSize * 1.5),
				color: theme.iconColor,
			};
			if (title) iconStyle.marginRight = 5;
			icon = <i style={iconStyle} className={`fas ${this.props.iconName}`}></i>;
		}

		// Keep this for legacy compatibility but for consistency we should use "disabled" prop
		let isEnabled = !('enabled' in this.props) || this.props.enabled === true;
		if (this.props.disabled) isEnabled = false;

		const classes = ['button'];
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
				onClick={() => {
					if (isEnabled && this.props.onClick) this.props.onClick();
				}}
			>
				{icon}
				{title}
			</a>
		);
	}
}

module.exports = ToolbarButton;
