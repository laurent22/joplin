import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NoteEntity } from '@joplin/lib/services/database/types';
import NoteGridCard from './NoteGridCard';

interface Props {
	items: NoteEntity[];
	notesSource: string;
}

const gap = 10;
const minCardWidth = 160;

// Number of columns that fit in the given width (2 on most phones in portrait, more in
// landscape and on tablets).
export const getColumnCount = (availableWidth: number) => {
	return Math.max(2, Math.floor((availableWidth + gap) / (minCardWidth + gap)));
};

const styles = StyleSheet.create({
	content: {
		padding: gap,
	},
	row: {
		gap,
		marginBottom: gap,
	},
});

const NoteGrid: React.FC<Props> = props => {
	const { width } = useWindowDimensions();
	const listRef = useRef<FlatList<NoteEntity>>(null);

	const availableWidth = width - gap * 2;
	const columnCount = getColumnCount(availableWidth);
	const cardWidth = Math.floor((availableWidth - gap * (columnCount - 1)) / columnCount);

	// Reset the scroll position when switching notebook / tag.
	useEffect(() => {
		listRef.current?.scrollToOffset({ offset: 0, animated: false });
	}, [props.notesSource]);

	const renderItem = useCallback(({ item }: { item: NoteEntity }) => {
		return <NoteGridCard note={item} width={cardWidth} />;
	}, [cardWidth]);

	return (
		<View style={{ flex: 1 }}>
			<FlatList
				// The number of columns of a FlatList can't change on the fly
				key={`grid-${columnCount}`}
				ref={listRef}
				data={props.items}
				numColumns={columnCount}
				columnWrapperStyle={styles.row}
				contentContainerStyle={styles.content}
				renderItem={renderItem}
				keyExtractor={item => item.id}
			/>
		</View>
	);
};

export default NoteGrid;
