import * as React from 'react';
import { TouchableOpacity, TouchableWithoutFeedback, Text, Modal, View, LayoutRectangle, ViewStyle, TextStyle, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import useSafeAreaPadding from '../utils/hooks/useSafeAreaPadding';

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
	itemListStyle?: ViewStyle;
	itemWrapperStyle?: ViewStyle;
	headerWrapperStyle?: ViewStyle;
	headerStyle?: TextStyle;
	itemStyle?: TextStyle;
	disabled?: boolean;
	defaultHeaderLabel?: string; // Defaults to "..."
	accessibilityHint?: string;

	labelTransform?: 'trim';
	items: DropdownListItem[];

	selectedValue: ValueType|null;
	onValueChange?: OnValueChangedListener;

	// Shown to the right of the dropdown when closed, hidden when opened.
	// Avoids abrupt size transitions that would be caused by externally resizing the space
	// available for the dropdown on open/close.
	coverableChildrenRight?: ReactElement[]|ReactElement;
}

const Dropdown: React.FC<DropdownProps> = props => {
	const headerRef = useRef<View|null>(null);
	const [headerSize, setHeaderSize] = useState<LayoutRectangle>({ x: 0, y: 0, width: 0, height: 0 });
	const [listVisible, setListVisible] = useState(false);

	const headerSizeRef = useRef(headerSize);
	headerSizeRef.current = headerSize;

	const updateHeaderCoordinates = useCallback(() => {
		if (!headerRef.current) return;

		// https://stackoverflow.com/questions/30096038/react-native-getting-the-position-of-an-element
		headerRef.current.measure((_fx, _fy, width, height, px, py) => {
			const lastLayout = headerSizeRef.current;

			if (px !== lastLayout.x || py !== lastLayout.y || width !== lastLayout.width || height !== lastLayout.height) {
				setHeaderSize({ x: px, y: py, width: width, height: height });
			}
		});
	}, []);

	const onOpenList = useCallback(() => {
		// On iOS, we need to re-measure just before opening the list. Measurements from just after
		// onLayout can be inaccurate in some cases (in the past, this had caused the menu to be
		// drawn far offscreen).
		updateHeaderCoordinates();
		setListVisible(true);
	}, [updateHeaderCoordinates]);

	const onCloseList = useCallback(() => {
		setListVisible(false);
	}, []);

	const onListLoad = useCallback((listRef: FlatList|null) => {
		if (!listRef) return;

		for (let i = 0; i < props.items.length; i++) {
			const item = props.items[i];
			if (item.value === props.selectedValue) {
				listRef.scrollToIndex({ index: i, animated: false });
				break;
			}
		}
	}, [props.items, props.selectedValue]);

	const items = props.items;
	const { styles, dropdownWidth, itemHeight } = useStyles({
		itemCount: items.length,
		headerSize,
		itemStyle: props.itemStyle,
		itemListStyle: props.itemListStyle,
		headerStyle: props.headerStyle,
		headerWrapperStyle: props.headerWrapperStyle,
		itemWrapperStyle: props.itemWrapperStyle,
	});

	const headerLabel = useHeaderLabel({
		defaultLabel: props.defaultHeaderLabel,
		labelTransform: props.labelTransform,
		items,
		selectedValue: props.selectedValue,
	});

	const itemRenderer = ({ item }: { item: DropdownListItem }) => {
		const key = item.value ? item.value.toString() : '__null'; // The top item ("Move item to notebook...") has a null value.
		const indentWidth = Math.min((item.depth ?? 0) * 32, dropdownWidth * 2 / 3);

		return (
			<TouchableOpacity
				style={styles.itemWrapper}
				accessibilityRole="menuitem"
				accessibilityState={{ selected: item.value === props.selectedValue }}
				key={key}
				onPress={() => {
					onCloseList();
					if (props.onValueChange) props.onValueChange(item.value);
				}}
			>
				<Text ellipsizeMode="tail" numberOfLines={1} style={[styles.item, { marginStart: indentWidth }]} key={key}>
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
			onPress={onCloseList}
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
				onLayout={updateHeaderCoordinates}
				ref={headerRef}
			>
				<TouchableOpacity
					style={styles.headerWrapper}
					disabled={props.disabled}
					onPress={onOpenList}
					accessibilityRole='button'
					accessibilityHint={[props.accessibilityHint, _('Opens dropdown')].join(' ')}
				>
					<Text ellipsizeMode="tail" numberOfLines={1} style={styles.header}>
						{headerLabel}
					</Text>
					<Text
						style={styles.headerArrow}
						aria-hidden={true}
						importantForAccessibility='no'
						accessibilityElementsHidden={true}
						accessibilityRole='image'
					>{'▼'}</Text>
				</TouchableOpacity>
				{listVisible ? null : props.coverableChildrenRight}
			</View>
			<Modal
				transparent={true}
				animationType='fade'
				visible={listVisible}
				onRequestClose={onCloseList}
				supportedOrientations={['landscape', 'portrait']}
			>
				<TouchableWithoutFeedback
					accessibilityElementsHidden={true}
					importantForAccessibility='no-hide-descendants'
					aria-hidden={true}
					onPress={onCloseList}
					style={styles.backgroundCloseButton}
				>
					<View style={{ flex: 1 }}/>
				</TouchableWithoutFeedback>

				<View
					accessibilityRole='menu'
					style={styles.wrapper}
				>
					<FlatList
						ref={onListLoad}
						style={styles.itemList}
						data={items}
						extraData={props.selectedValue}
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
};

interface HeaderLabelProps {
	defaultLabel: string;
	items: DropdownListItem[];
	selectedValue: string;
	labelTransform: string;
}

const useHeaderLabel = (props: HeaderLabelProps) => {
	let headerLabel = props.defaultLabel ?? '...';
	for (let i = 0; i < props.items.length; i++) {
		const item = props.items[i];
		if (item.value === props.selectedValue) {
			headerLabel = item.label;
			break;
		}
	}

	if (props.labelTransform && props.labelTransform === 'trim') {
		headerLabel = headerLabel.trim();
	}
	return headerLabel;
};

interface StyleProps {
	itemCount: number;
	headerSize: LayoutRectangle;
	headerStyle: ViewStyle|undefined;
	headerWrapperStyle: ViewStyle|undefined;
	itemStyle: ViewStyle|undefined;
	itemWrapperStyle: ViewStyle|undefined;
	itemListStyle: ViewStyle|undefined;
}

const useStyles = ({ itemCount, headerSize, itemStyle, itemWrapperStyle, itemListStyle, headerStyle, headerWrapperStyle }: StyleProps) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const { paddingTop: safeAreaTop, paddingBottom: safeAreaBottom } = useSafeAreaPadding();

	return useMemo(() => {
		const itemHeight = 60;

		const listMaxHeight = windowHeight - safeAreaTop - safeAreaBottom;
		const listHeight = Math.min(itemCount * itemHeight, listMaxHeight);
		const maxListTop = windowHeight - listHeight + safeAreaTop;
		const listTop = Math.min(maxListTop, headerSize.y + headerSize.height);

		const dropdownWidth = headerSize.width;

		const styles = StyleSheet.create({
			wrapper: {
				width: headerSize.width,
				height: listHeight + 2, // +2 for the border (otherwise it makes the scrollbar appear)
				top: listTop,
				left: headerSize.x,
				position: 'absolute',
			},
			backgroundCloseButton: {
				position: 'absolute',
				top: 0,
				left: 0,
				height: windowHeight,
				width: windowWidth,
			},
			itemList: {
				...(itemListStyle ?? {}),
				borderWidth: 1,
				borderColor: '#ccc',
			},
			itemWrapper: {
				...(itemWrapperStyle ?? {}),
				flex: 1,
				flexBasis: 'auto',
				justifyContent: 'center',
				height: itemHeight,
				paddingLeft: 20,
				paddingRight: 10,
			},
			headerWrapper: {
				...(headerWrapperStyle ?? {}),
				height: 35,
				flex: 1,
				flexDirection: 'row',
				alignItems: 'center',
			},
			header: {
				...(headerStyle ?? {}),
				flex: 1,
			},
			headerArrow: {
				...(headerStyle ?? {}),
				flex: 0,
			},
			item: itemStyle ?? {},
		});
		return { styles, dropdownWidth, itemHeight };
	}, [windowWidth, windowHeight, headerSize, headerStyle, headerWrapperStyle, itemCount, itemListStyle, itemStyle, itemWrapperStyle, safeAreaTop, safeAreaBottom]);
};

export default Dropdown;
export { Dropdown };
