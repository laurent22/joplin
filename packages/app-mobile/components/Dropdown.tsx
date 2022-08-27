const React = require('react');
import { TouchableOpacity, TouchableWithoutFeedback, Dimensions, Text, Modal, View, LayoutRectangle, ViewStyle, TextStyle } from 'react-native';
import { Component } from 'react';
const { ItemList } = require('./ItemList.js');

type ValueType = string;
export interface DropdownListItem {
	label: string;
	value: ValueType;
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
}

interface DropdownState {
	headerSize: LayoutRectangle;
	listVisible: boolean;
}

class Dropdown extends Component<DropdownProps, DropdownState> {
	private headerRef: TouchableOpacity;

	public constructor(props: DropdownProps) {
		super(props);

		this.headerRef = null;
		this.state = {
			headerSize: { x: 0, y: 0, width: 0, height: 0 },
			listVisible: false,
		};
	}

	private updateHeaderCoordinates() {
		// https://stackoverflow.com/questions/30096038/react-native-getting-the-position-of-an-element
		this.headerRef.measure((_fx, _fy, width, height, px, py) => {
			this.setState({
				headerSize: { x: px, y: py, width: width, height: height },
			});
		});
	}

	public render() {
		const items = this.props.items;
		const itemHeight = 60;
		const windowHeight = Dimensions.get('window').height - 50;

		// Dimensions doesn't return quite the right dimensions so leave an extra gap to make
		// sure nothing is off screen.
		const listMaxHeight = windowHeight;
		const listHeight = Math.min(items.length * itemHeight, listMaxHeight);
		const maxListTop = windowHeight - listHeight;
		const listTop = Math.min(maxListTop, this.state.headerSize.y + this.state.headerSize.height);

		const wrapperStyle = {
			width: this.state.headerSize.width,
			height: listHeight + 2, // +2 for the border (otherwise it makes the scrollbar appear)
			marginTop: listTop,
			marginLeft: this.state.headerSize.x,
		};

		const itemListStyle = Object.assign({}, this.props.itemListStyle ? this.props.itemListStyle : {}, {
			borderWidth: 1,
			borderColor: '#ccc',
		});

		const itemWrapperStyle = Object.assign({}, this.props.itemWrapperStyle ? this.props.itemWrapperStyle : {}, {
			flex: 1,
			justifyContent: 'center',
			height: itemHeight,
			paddingLeft: 20,
			paddingRight: 10,
		});

		const headerWrapperStyle = Object.assign({}, this.props.headerWrapperStyle ? this.props.headerWrapperStyle : {}, {
			height: 35,
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
		});

		const headerStyle = Object.assign({}, this.props.headerStyle ? this.props.headerStyle : {}, {
			flex: 1,
		});

		const headerArrowStyle = Object.assign({}, this.props.headerStyle ? this.props.headerStyle : {}, {
			flex: 0,
			marginRight: 10,
		});

		const itemStyle = Object.assign({}, this.props.itemStyle ? this.props.itemStyle : {}, {});

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

		const closeList = () => {
			this.setState({ listVisible: false });
		};

		const itemRenderer = (item: DropdownListItem) => {
			const key = item.value.toString();
			return (
				<TouchableOpacity
					style={itemWrapperStyle}
					key={key}
					onPress={() => {
						closeList();
						if (this.props.onValueChange) this.props.onValueChange(item.value);
					}}
				>
					<Text ellipsizeMode="tail" numberOfLines={1} style={itemStyle} key={key}>
						{item.label}
					</Text>
				</TouchableOpacity>
			);
		};

		return (
			<View style={{ flex: 1, flexDirection: 'column' }}>
				<TouchableOpacity
					style={headerWrapperStyle}
					ref={ref => (this.headerRef = ref)}
					disabled={this.props.disabled}
					onPress={() => {
						this.updateHeaderCoordinates();
						this.setState({ listVisible: true });
					}}
				>
					<Text ellipsizeMode="tail" numberOfLines={1} style={headerStyle}>
						{headerLabel}
					</Text>
					<Text style={headerArrowStyle}>{'▼'}</Text>
				</TouchableOpacity>
				<Modal
					transparent={true}
					visible={this.state.listVisible}
					onRequestClose={() => {
						closeList();
					}}
				>
					<TouchableWithoutFeedback
						onPressOut={() => {
							closeList();
						}}
					>
						<View style={{ flex: 1 }}>
							<View style={wrapperStyle}>
								<ItemList
									style={itemListStyle}
									items={this.props.items}
									itemHeight={itemHeight}
									itemRenderer={itemRenderer}
								/>
							</View>
						</View>
					</TouchableWithoutFeedback>
				</Modal>
			</View>
		);
	}
}

export default Dropdown;
export { Dropdown };
