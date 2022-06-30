const { connect } = require('react-redux');
const SideMenu_ = require('react-native-side-menu-updated').default;

class SideMenuComponent extends SideMenu_ {}

const SideMenu = connect((state: any) => {
	return {
		isOpen: state.showSideMenu,
	};
})(SideMenuComponent);

export default SideMenu;
