import * as React from 'react';
import { TouchableOpacity, TouchableWithoutFeedback, Dimensions, Text, Modal, View, LayoutRectangle, ViewStyle, TextStyle, FlatList } from 'react-native';
import { Component, ReactElement } from 'react';
import { _ } from '@joplin/lib/locale';

type ValueType = string;
export interface DropdownListItem {
	label: string;
	value: ValueType;

	// Depth corresponds with indentation and can be used to
	// create tree structures.
	depth?: number;
}

export type OnValueChangedListener = (newValue: ValueType)=> void;

interface DropdownProps {
	listItemStyle?: ViewStyle;
	itemListStyle?: ViewStyle;
	itemWrapperStyle?: ViewStyle;
	headerWrapperStyle?: ViewStyle;
	headerStyle?: TextStyle;
	itemStyle?: TextStyle;
	disabled?: boolean;

	labelTransform?: 'trim';
	items: DropdownListItem[];

	selectedValue: ValueType|null;
	onValueChange?: OnValueChangedListener;

	// Shown to the right of the dropdown when closed, hidden when opened.
	// Avoids abrupt size transitions that would be caused by externally resizing the space
	// available for the dropdown on open/close.
	coverableChildrenRight?: ReactElement[]|ReactElement;
}

interface DropdownState {
	headerSize: LayoutRectangle;
	listVisible: boolean;
}

class Dropdown extends Component<DropdownProps, DropdownState> {
	private headerRef: View;

	public constructor(props: DropdownProps) {
		super(props);

		this.headerRef = null;
		this.state = {
			headerSize: { x: 0, y: 0, width: 0, height: 0 },
			listVisible: false,
		};
	}

	private updateHeaderCoordinates = () => {
		if (!this.headerRef) return;

		// https://stackoverflow.com/questions/30096038/react-native-getting-the-position-of-an-element
		this.headerRef.measure((_fx, _fy, width, height, px, py) => {
			const lastLayout = this.state.headerSize;
			if (px !== lastLayout.x || py !== lastLayout.y || width !== lastLayout.width || height !== lastLayout.height) {
				this.setState({
					headerSize: { x: px, y: py, width: width, height: height },
				});
			}
		});
	};

	private onOpenList = () => {
		// On iOS, we need to re-measure just before opening the list. Measurements from just after
		// onLayout can be inaccurate in some cases (in the past, this had caused the menu to be
		// drawn far offscreen).
		this.updateHeaderCoordinates();
		this.setState({ listVisible: true });
	};
	private onCloseList = () => {
		this.setState({ listVisible: false });
	};

	public render() {
		const items = this.props.items;
		const itemHeight = 60;
		const windowHeight = Dimensions.get('window').height - 50;
		const windowWidth = Dimensions.get('window').width;

		// Dimensions doesn't return quite the right dimensions so leave an extra gap to make
		// sure nothing is off screen.
		const listMaxHeight = windowHeight;
		const listHeight = Math.min(items.length * itemHeight, listMaxHeight);
		const maxListTop = windowHeight - listHeight;
		const listTop = Math.min(maxListTop, this.state.headerSize.y + this.state.headerSize.height);

		const dropdownWidth = this.state.headerSize.width;
		const wrapperStyle: ViewStyle = {
			width: this.state.headerSize.width,
			height: listHeight + 2, // +2 for the border (otherwise it makes the scrollbar appear)
			top: listTop,
			left: this.state.headerSize.x,
			position: 'absolute',
		};

		const backgroundCloseButtonStyle: ViewStyle = {
			position: 'absolute',
			top: 0,
			left: 0,
			height: windowHeight,
			width: windowWidth,
		};

		const itemListStyle = { ...(this.props.itemListStyle ? this.props.itemListStyle : {}), borderWidth: 1,
			borderColor: '#ccc' };

		const itemWrapperStyle: ViewStyle = {
			...(this.props.itemWrapperStyle ? this.props.itemWrapperStyle : {}),
			flex: 1,
			justifyContent: 'center',
			height: itemHeight,
			paddingLeft: 20,
			paddingRight: 10,
		};

		const headerWrapperStyle: ViewStyle = {
			...(this.props.headerWrapperStyle ? this.props.headerWrapperStyle : {}),
			height: 35,
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
		};

		const headerStyle = { ...(this.props.headerStyle ? this.props.headerStyle : {}), flex: 1 };

		const headerArrowStyle = { ...(this.props.headerStyle ? this.props.headerStyle : {}), flex: 0,
			marginRight: 10 };

		const itemStyle = { ...(this.props.itemStyle ? this.props.itemStyle : {}) };

		let headerLabel = '...';
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.value === this.props.selectedValue) {
				headerLabel = item.label;
				break;
			}
		}

		if (this.props.labelTransform && this.props.labelTransform === 'trim') {
			headerLabel = headerLabel.trim();
		}

		const itemRenderer = ({ item }: { item: DropdownListItem }) => {
			const key = item.value ? item.value.toString() : '__null'; // The top item ("Move item to notebook...") has a null value.
			const indentWidth = Math.min((item.depth ?? 0) * 32, dropdownWidth * 2 / 3);

			return (
				<TouchableOpacity
					style={itemWrapperStyle}
					accessibilityRole="menuitem"
					key={key}
					onPress={() => {
						this.onCloseList();
						if (this.props.onValueChange) this.props.onValueChange(item.value);
					}}
				>
					<Text ellipsizeMode="tail" numberOfLines={1} style={{ ...itemStyle, marginStart: indentWidth }} key={key}>
						{item.label}
					</Text>
				</TouchableOpacity>
			);
		};

		// Use a separate screen-reader-only button for closing the menu. If we
		// allow the background to be focusable, instead, the focus order might be
		// incorrect on some devices. For example, the background button might be focused
		// when navigating near the middle of the dropdown's list.
		const screenReaderCloseMenuButton = (
			<TouchableWithoutFeedback
				accessibilityRole='button'
				onPress={this.onCloseList}
			>
				<Text style={{
					opacity: 0,
					height: 0,
				}}>{_('Close dropdown')}</Text>
			</TouchableWithoutFeedback>
		);

		return (
			<View style={{ flex: 1, flexDirection: 'column' }}>
				<View
					style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
					onLayout={this.updateHeaderCoordinates}
					ref={ref => (this.headerRef = ref)}
				>
					<TouchableOpacity
						style={headerWrapperStyle}
						disabled={this.props.disabled}
						onPress={this.onOpenList}
					>
						<Text ellipsizeMode="tail" numberOfLines={1} style={headerStyle}>
							{headerLabel}
						</Text>
						<Text style={headerArrowStyle}>{'▼'}</Text>
					</TouchableOpacity>
					{this.state.listVisible ? null : this.props.coverableChildrenRight}
				</View>
				<Modal
					transparent={true}
					animationType='fade'
					visible={this.state.listVisible}
					onRequestClose={this.onCloseList}
					supportedOrientations={['landscape', 'portrait']}
				>
					<TouchableWithoutFeedback
						accessibilityElementsHidden={true}
						importantForAccessibility='no-hide-descendants'
						onPress={this.onCloseList}
						style={backgroundCloseButtonStyle}
					>
						<View style={{ flex: 1 }}/>
					</TouchableWithoutFeedback>

					<View
						accessibilityRole='menu'
						style={wrapperStyle}>
						<FlatList
							style={itemListStyle}
							data={this.props.items}
							renderItem={itemRenderer}
							getItemLayout={(_data, index) => ({
								length: itemHeight,
								offset: itemHeight * index,
								index,
							})}
						/>
					</View>

					{screenReaderCloseMenuButton}
				</Modal>
			</View>
		);
	}
}

export default Dropdown;
export { Dropdown };
