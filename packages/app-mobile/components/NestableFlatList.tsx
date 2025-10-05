import * as React from 'react';
import { Ref, useRef, useImperativeHandle, useState, useCallback } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, ScrollViewProps, View, ViewProps } from 'react-native';

interface RenderEvent<T> {
	item: T;
	index: number;
}

interface ScrollToOptions {
	index: number;
	viewPosition: number;
	animated: boolean;
}

export interface NestableFlatListControl {
	scrollToIndex(options: ScrollToOptions): void;
}

interface CellRendererProps<T> {
	index: number;
	item: T;
	children: React.ReactNode;
}

// For compatibility, these props should be mostly compatible with the
// native FlatList props:
interface Props<T> extends ScrollViewProps {
	ref: Ref<NestableFlatListControl>;
	data: T[];
	itemHeight: number;
	CellRendererComponent?: React.ComponentType<CellRendererProps<T>>;
	renderItem: (event: RenderEvent<T>)=> React.ReactNode;
	keyExtractor: (item: T)=> string;
	extraData: unknown;

	// Additional props.
	// The contentWrapperProps can be used to improve accessibility by
	// applying certain content roles to the <View> that directly contains
	// the list's content. At least on web, applying these props directly to the ScrollView may
	// not work due to additional <View>s added by React Native.
	contentWrapperProps?: ViewProps;
}

// This component allows working around restrictions on nesting React Native's built-in
// <FlatList> within <ScrollView>s. For the most part, this component's interface should
// be compatible with the <FlatList> API.
//
// See https://github.com/facebook/react-native/issues/31697.
const NestableFlatList = function<T>({
	ref,
	itemHeight,
	renderItem,
	keyExtractor,
	data,
	CellRendererComponent = React.Fragment,
	contentWrapperProps,
	...rest
}: Props<T>) {
	const scrollViewRef = useRef<ScrollView|null>(null);
	const [scroll, setScroll] = useState(0);
	const [listHeight, setListHeight] = useState(0);

	useImperativeHandle(ref, () => {
		return {
			scrollToIndex: ({ index, animated, viewPosition }) => {
				const offset = Math.max(0, index * itemHeight - viewPosition * listHeight);
				scrollViewRef.current.scrollTo({
					y: offset,
					animated,
				});
				// onScroll events don't seem to be sent when scrolling with .scrollTo.
				// The scroll offset needs to be updated manually:
				setScroll(offset);
			},
		};
	}, [itemHeight, listHeight]);

	const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		setScroll(event.nativeEvent.contentOffset.y);
	}, []);
	const onLayout = useCallback((event: LayoutChangeEvent) => {
		setListHeight(event.nativeEvent.layout.height);
	}, []);

	const bufferSize = 10;
	const visibleStartIndex = Math.min(Math.floor(scroll / itemHeight), data.length);
	const visibleEndIndex = Math.ceil((scroll + listHeight) / itemHeight);
	const startIndex = Math.max(0, visibleStartIndex - bufferSize);
	const maximumIndex = data.length - 1;
	const endIndex = Math.min(visibleEndIndex + bufferSize, maximumIndex);
	const paddingTop = startIndex * itemHeight;
	const paddingBottom = (maximumIndex - endIndex) * itemHeight;

	const renderVisibleItems = () => {
		const result: React.ReactNode[] = [];

		for (let i = startIndex; i <= endIndex; i++) {
			result.push(
				<CellRendererComponent
					index={i}
					item={data[i]}
					key={keyExtractor(data[i])}
				>
					{renderItem({ item: data[i], index: i })}
				</CellRendererComponent>,
			);
		}

		return result;
	};

	return <ScrollView
		ref={scrollViewRef}
		onScroll={onScroll}
		onLayout={onLayout}
		{...rest}
	>
		<View {...contentWrapperProps}>
			<View style={{ height: paddingTop }}/>
			{renderVisibleItems()}
			<View style={{ height: paddingBottom }}/>
		</View>
	</ScrollView>;
};

export default NestableFlatList;
