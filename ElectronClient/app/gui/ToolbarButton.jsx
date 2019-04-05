const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');
const { Button, ButtonIcon } = require('@rmwc/button');



class ToolbarButton extends React.Component {

	render() {
		const theme = themeStyle(this.props.theme);

		const style = Object.assign({}, theme.toolbarStyle);

		const title = this.props.title ? this.props.title : '';
		const tooltip = this.props.tooltip ? this.props.tooltip : title;

		// let icon = null;
		// if (this.props.iconName) {
		// 	const iconStyle = {
		// 		fontSize: Math.round(theme.fontSize * 1.5),
		// 		color: theme.color
		// 	};
		// 	if (title) iconStyle.marginRight = 5;
		// 	icon = <MaterialIcon icon={this.props.iconName} />
		// }

		const isEnabled = (!('enabled' in this.props) || this.props.enabled === true);
		let classes = ['mdc-button'];
		if (!isEnabled) classes.push('disabled');

		const finalStyle = Object.assign({}, style, {
			opacity: isEnabled ? 1 : 0.4,
		});

		return (
			<Button
				className={classes.join(' ')}
				// style={finalStyle}
				title={tooltip}
				href="#"
				onClick={() => { if (isEnabled && this.props.onClick) this.props.onClick() }}
				icon={this.props.iconName}
				label={title}
			/>
		);
	}

}

module.exports = ToolbarButton;