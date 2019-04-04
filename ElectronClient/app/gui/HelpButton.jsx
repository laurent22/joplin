const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');

class HelpButtonComponent extends React.Component {

	constructor() {
		super();

		this.onClick = this.onClick.bind(this);
	}

	onClick() {
		this.props.onClick();
	}

	render() {
		const theme = themeStyle(this.props.theme);
		let style = Object.assign({}, this.props.style, {color: theme.color, textDecoration: 'none'});
		const helpIconStyle = {flex:0, width: 16, height: 16, marginLeft: 10};
		return <a href="#" style={style} onClick={this.onClick}><i style={helpIconStyle} className={"fa fa-question-circle"}></i></a>
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
	};
};

const HelpButton = connect(mapStateToProps)(HelpButtonComponent);

module.exports = HelpButton;
