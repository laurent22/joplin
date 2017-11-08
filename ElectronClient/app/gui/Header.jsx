const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

class HeaderComponent extends React.Component {

	back_click() {
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	makeButton(key, options) {
		return <a key={key} href="#" onClick={() => {options.onClick()}}>{options.title}</a>
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const showBackButton = this.props.showBackButton === undefined || this.props.showBackButton === true;
		style.height = theme.headerHeight;

		const buttons = [];
		if (showBackButton) {
			buttons.push(this.makeButton('back', { title: _('Back'), onClick: () => this.back_click() }));
		}

		if (this.props.buttons) {
			for (let i = 0; i < this.props.buttons.length; i++) {
				buttons.push(this.makeButton('btn_' + i, this.props.buttons[i]));
			}
		}

		return (
			<div style={style}>
				{ buttons }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return { theme: state.settings.theme };
};

const Header = connect(mapStateToProps)(HeaderComponent);

module.exports = { Header };