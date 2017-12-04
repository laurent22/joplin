const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { Setting } = require('lib/models/setting.js');
const { bridge } = require('electron').remote.require('./bridge');
const { Header } = require('./Header.min.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');

class SyncDisabledItemsScreenComponent extends React.Component {

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;

		const headerStyle = {
			width: style.width,
		};

		const containerStyle = {
			padding: 10,
		};
		
		return (
			<div style={style}>
				<Header style={headerStyle} />
				<div style={containerStyle}>
				</div>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

const SyncDisabledItemsScreen = connect(mapStateToProps)(SyncDisabledItemsScreenComponent);

module.exports = { SyncDisabledItemsScreen };