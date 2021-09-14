const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('lib/theme');

class HelpButtonComponent extends React.Component {
	constructor() {
		super();

		this.onClick = this.onClick.bind(this);
	}

	onClick() {
		if (this.props.onClick) this.props.onClick();
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = Object.assign({}, this.props.style, { color: theme.color, textDecoration: 'none' });
		const helpIconStyle = { flex: 0, width: 16, height: 16, marginLeft: 10 };
		const extraProps = {};
		if (this.props.tip) extraProps['data-tip'] = this.props.tip;
		return (
			<a href="#" style={style} onClick={this.onClick} {...extraProps}>
				<i style={helpIconStyle} className={'fa fa-question-circle'}></i>
			</a>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
	};
};

const HelpButton = connect(mapStateToProps)(HelpButtonComponent);

module.exports = HelpButton;
