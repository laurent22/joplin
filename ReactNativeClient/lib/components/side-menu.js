const React = require("react");
const Component = React.Component;
const { connect } = require("react-redux");
const { Log } = require("lib/log.js");
const SideMenu_ = require("react-native-side-menu").default;

class SideMenuComponent extends SideMenu_ {}

const MySideMenu = connect(state => {
	return {
		isOpen: state.showSideMenu,
	};
})(SideMenuComponent);

module.exports = { SideMenu: MySideMenu };
