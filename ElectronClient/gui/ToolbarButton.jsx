const React = require('react');
const { themeStyle } = require('lib/theme');

function isFontAwesomeIcon(iconName) {
	const s = iconName.split(' ');
	return s.length === 2 && ['fa', 'fas'].includes(s[0]);
}

function getProp(props, name, defaultValue = null) {
	if (props.toolbarButtonInfo && (name in props.toolbarButtonInfo)) return props.toolbarButtonInfo[name];
	if (!(name in props)) return defaultValue;
	return props[name];
}

class ToolbarButton extends React.Component {
	render() {
		const theme = themeStyle(this.props.theme);

		const style = Object.assign({}, theme.toolbarStyle);

		const title = getProp(this.props, 'title', '');
		const tooltip = getProp(this.props, 'tooltip', title);

		let icon = null;
		const iconName = getProp(this.props, 'iconName');
		if (iconName) {
			const iconStyle = {
				fontSize: theme.toolbarIconSize,
				color: theme.color3,
			};
			if (title) iconStyle.marginRight = 5;

			if (isFontAwesomeIcon(iconName)) {
				icon = <i style={iconStyle} className={iconName}></i>;
			} else {
				icon = <span style={iconStyle} className={iconName}></span>;
			}
		}

		// Keep this for legacy compatibility but for consistency we should use "disabled" prop
		let isEnabled = getProp(this.props, 'enabled', null);
		if (isEnabled === null) isEnabled = true;
		if (this.props.disabled) isEnabled = false;

		const classes = ['button'];
		if (!isEnabled) classes.push('disabled');

		const finalStyle = Object.assign({}, style, {
			opacity: isEnabled ? 1 : 0.4,
			width: style.height,
			maxWidth: style.height,
		});

		const onClick = getProp(this.props, 'onClick');

		return (
			<a
				className={classes.join(' ')}
				style={finalStyle}
				title={tooltip}
				href="#"
				onClick={() => {
					if (isEnabled && onClick) onClick();
				}}
			>
				{icon}
				{title}
			</a>
		);
	}
}

module.exports = ToolbarButton;
