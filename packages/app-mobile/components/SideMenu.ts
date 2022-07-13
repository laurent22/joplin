const { connect } = require('react-redux');
const SideMenu_ = require('react-native-side-menu-updated').default;
import { Dimensions } from 'react-native';
import { State } from '@joplin/lib/reducer';

type Event = {
	nativeEvent: {
		layout: {
			width: number;
			height: number;
		};
	};
};

class SideMenuComponent extends SideMenu_ {
	onLayoutChange(e: Event) {
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
