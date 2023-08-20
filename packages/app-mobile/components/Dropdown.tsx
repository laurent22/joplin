import * as React from 'react';
import { TouchableOpacity, TouchableWithoutFeedback, Text, Modal, View, LayoutRectangle, ViewStyle, TextStyle, FlatList, useWindowDimensions, StyleSheet } from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { _ } from '@joplin/lib/locale';

type ValueType = string;
export interface DropdownListItem {
	label: string;
	value: ValueType;
}

export type OnValueChangedListener = (newValue: ValueType)=> void;

interface DropdownStyleProps {
	listItemStyle?: ViewStyle;
	itemListStyle?: ViewStyle;
	itemWrapperStyle?: ViewStyle;
	headerWrapperStyle?: ViewStyle;
	headerStyle?: TextStyle;
	itemStyle?: TextStyle;
}

interface DropdownProps extends DropdownStyleProps {
	disabled?: boolean;

	labelTransform?: 'trim';
	items: DropdownListItem[];

	selectedValue: ValueType|null;
	onValueChange?: OnValueChangedListener;
}

interface SizingState {
	listTop: number;
	listHeight: number;
	itemHeight: number;
	headerSize: LayoutRectangle;
	windowWidth: number;
	windowHeight: number;
}

const useStyles = (sizes: SizingState, styleProps: DropdownStyleProps) => {
	return useMemo(() => {
		const wrapperStyle: ViewStyle = {
			width: sizes.headerSize.width,
			height: sizes.listHeight + 2, // +2 for the border (otherwise it makes the scrollbar appear)
			top: sizes.listTop,
			left: sizes.headerSize.x,
			position: 'absolute',
		};

		const backgroundCloseButtonStyle: ViewStyle = {
			position: 'absolute',
			top: 0,
			left: 0,
			height: sizes.windowHeight,
			width: sizes.windowWidth,
		};

		const itemListStyle = {
			...(styleProps.itemListStyle ?? {}),
			borderWidth: 1,
			borderColor: '#ccc',
		};

		const itemWrapperStyle: ViewStyle = {
			...(styleProps.itemWrapperStyle ?? {}),
			flex: 1,
			justifyContent: 'center',
			height: sizes.itemHeight,
			paddingLeft: 20,
			paddingRight: 10,
		};

		const headerWrapperStyle: ViewStyle = {
			...(styleProps.headerWrapperStyle ?? {}),
			height: 35,
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
		};

		const headerStyle = {
			...(styleProps.headerStyle ?? {}),
			flex: 1,
		};

		const headerArrowStyle = {
			...(styleProps.headerStyle ?? {}),
			flex: 0,
			marginRight: 10,
		};

		const itemStyle = {
			...(styleProps.itemStyle ?? {}),
		};

		return StyleSheet.create({
			itemStyle,
			headerArrowStyle,
			headerStyle,
			headerWrapperStyle,
			itemWrapperStyle,
			itemListStyle,
			backgroundCloseButtonStyle,
			wrapperStyle,
		});
	}, [
		styleProps,
		sizes.windowWidth, sizes.windowHeight,
		sizes.headerSize,
		sizes.itemHeight,
		sizes.listTop,
		sizes.listHeight,
	]);
};

const Dropdown: React.FunctionComponent<DropdownProps> = props => {
	const [headerSize, setHeaderSize] = useState<LayoutRectangle>({ x: 0, y: 0, width: 0, height: 0 });

	const itemHeight = 60;
	const windowSize = useWindowDimensions();
	const windowWidth = windowSize.width;

	// Dimensions doesn't return quite the right dimensions so leave an extra gap to make
	// sure nothing is off screen.
	const windowHeight = windowSize.height - 50;

	const sizing: SizingState = useMemo(() => {
		const listMaxHeight = windowHeight;
		const listHeight = Math.min(props.items.length * itemHeight, listMaxHeight);
		const maxListTop = windowHeight - listHeight;

		return {
			listTop: Math.min(maxListTop, headerSize.y + headerSize.height),
			listHeight,

			itemHeight,
			headerSize,

			windowWidth,
			windowHeight,
		};
	}, [windowWidth, windowHeight, headerSize, props.items.length]);


	const styles = useStyles(sizing, props);


	const { headerLabel, targetIndex } = useMemo(() => {
		let headerLabel = '...';
		let targetIndex = 0;
		for (let i = 0; i < props.items.length; i++) {
			const item = props.items[i];
			if (item.value === props.selectedValue) {
				headerLabel = item.label;
				targetIndex = i;
				break;
			}
		}

		if (props.labelTransform && props.labelTransform === 'trim') {
			headerLabel = headerLabel.trim();
		}

		return { headerLabel, targetIndex };
	}, [props.labelTransform, props.selectedValue, props.items]);

	const [listVisible, setListVisible] = useState(false);

	const closeList = useCallback(() => {
		setListVisible(false);
	}, []);

	const headerRef = useRef<TouchableOpacity>();
	const flatListRef = useRef<FlatList>();

	const onHeaderPress = useCallback(() => {
		// Update the header location
		// https://stackoverflow.com/questions/30096038/react-native-getting-the-position-of-an-element
		headerRef.current?.measure((_fx, _fy, width, height, px, py) => {
			setHeaderSize({
				x: px, y: py, width, height,
			});
		});

		setListVisible(true);
	}, []);

	const itemRenderer = ({ item }: { item: DropdownListItem }) => {
		const key = item.value ? item.value.toString() : '__null'; // The top item ("Move item to notebook...") has a null value.
		return (
			<TouchableOpacity
				style={styles.itemWrapperStyle}
				accessibilityRole="menuitem"
				key={key}
				onPress={() => {
					closeList();
					props.onValueChange?.(item.value);
				}}
			>
				<Text ellipsizeMode="tail" numberOfLines={1} style={styles.itemStyle} key={key}>
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
			onPress={()=> closeList()}
		>
			<Text style={{
				opacity: 0,
				height: 0,
			}}>{_('Close dropdown')}</Text>
		</TouchableWithoutFeedback>
	);

	// Offset just above halway
	const numVisibleItems = sizing.listHeight / sizing.itemHeight;
	const initialScrollOffset = Math.floor(numVisibleItems / 3);

	return (
		<View style={{ flex: 1, flexDirection: 'column' }}>
			<TouchableOpacity
				style={styles.headerWrapperStyle}
				ref={headerRef}
				disabled={props.disabled}
				onPress={onHeaderPress}
			>
				<Text ellipsizeMode="tail" numberOfLines={1} style={styles.headerStyle}>
					{headerLabel}
				</Text>
				<Text style={styles.headerArrowStyle}>{'▼'}</Text>
			</TouchableOpacity>
			<Modal
				transparent={true}
				visible={listVisible}
				onRequestClose={() => {
					closeList();
				}}
			>
				<TouchableWithoutFeedback
					accessibilityElementsHidden={true}
					importantForAccessibility='no-hide-descendants'
					onPress={() => {
						closeList();
					}}
					style={styles.backgroundCloseButtonStyle}
				>
					<View style={{ flex: 1 }}/>
				</TouchableWithoutFeedback>

				<View
					accessibilityRole='menu'
					style={styles.wrapperStyle}>
					<FlatList
						ref={flatListRef}
						style={styles.itemListStyle}
						data={props.items}
						renderItem={itemRenderer}
						initialScrollIndex={Math.max(0, targetIndex - initialScrollOffset)}
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
};

export default Dropdown;
export { Dropdown };
