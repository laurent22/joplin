const { connect } = require('react-redux');
const SideMenu_ = require('react-native-side-menu').default;

class SideMenuComponent extends SideMenu_ {}

const MySideMenu = connect(state => {
	return {
		isOpen: state.showSideMenu,
	};
})(SideMenuComponent);

module.exports = { SideMenu: MySideMenu };
