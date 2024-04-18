const { connect } = require('react-redux');
const SideMenu_ = require('react-native-side-menu-updated').default;
import { Dimensions } from 'react-native';
import { State } from '@joplin/lib/reducer';

class SideMenuComponent extends SideMenu_ {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public onLayoutChange(e: any) {
		const { width, height } = e.nativeEvent.layout;
		const openMenuOffsetPercentage = this.props.openMenuOffset / Dimensions.get('window').width;
		const openMenuOffset = width * openMenuOffsetPercentage;
		const hiddenMenuOffset = width * this.state.hiddenMenuOffsetPercentage;
		this.setState({ width, height, openMenuOffset, hiddenMenuOffset });
	}
}

const SideMenu = connect((state: State) => {
	return {
		isOpen: state.showSideMenu,
	};
})(SideMenuComponent);

export default SideMenu;
