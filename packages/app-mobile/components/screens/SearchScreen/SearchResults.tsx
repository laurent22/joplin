import * as React from 'react';

import { FlatList, View } from 'react-native';
import NoteItem from '../../NoteItem';
import { useEffect, useRef, useState } from 'react';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { NoteEntity } from '@joplin/lib/services/database/types';
import SearchEngineUtils from '@joplin/lib/services/search/SearchEngineUtils';
import Note from '@joplin/lib/models/Note';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import { ProgressBar } from 'react-native-paper';
import shim from '@joplin/lib/shim';

interface Props {
	query: string;
	onHighlightedWordsChange: (highlightedWords: string[])=> void;

	ftsEnabled: number;
}

const useResults = (props: Props) => {
	const [notes, setNotes] = useState<NoteEntity[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const query = props.query;
	const ftsEnabled = props.ftsEnabled;

	useQueuedAsyncEffect(async (event) => {
		let notes: NoteEntity[] = [];
		setIsProcessing(true);
		try {
			if (query) {
				if (ftsEnabled) {
					const r = await SearchEngineUtils.notesForQuery(query, true, { appendWildCards: true });
					notes = r.notes;
				} else {
					const p = query.split(' ');
					const temp = [];
					for (let i = 0; i < p.length; i++) {
						const t = p[i].trim();
						if (!t) continue;
						temp.push(t);
					}

					notes = await Note.previews(null, {
						anywherePattern: `*${temp.join('*')}*`,
					});
				}
			}

			if (event.cancelled) return;

			const parsedQuery = await SearchEngine.instance().parseQuery(query);
			const highlightedWords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);

			props.onHighlightedWordsChange(highlightedWords);
			setNotes(notes);
		} finally {
			setIsProcessing(false);
		}
	}, [query, ftsEnabled], { interval: 200 });

	return {
		notes,
		isPending: isProcessing,
	};
};

const useIsLongRunning = (isPending: boolean) => {
	const [isLongRunning, setIsLongRunning] = useState(false);
	const isPendingRef = useRef(isPending);
	isPendingRef.current = isPending;

	type TimeoutType = ReturnType<typeof shim.setTimeout>;
	const timeoutRef = useRef<TimeoutType|null>(null);

	useEffect(() => {
		if (timeoutRef.current !== null) {
			shim.clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}

		if (isPending) {
			const longRunningTimeout = 1000;
			timeoutRef.current = shim.setTimeout(() => {
				timeoutRef.current = null;
				setIsLongRunning(isPendingRef.current);
			}, longRunningTimeout);
		} else {
			setIsLongRunning(false);
		}
	}, [isPending]);

	return isLongRunning;
};

const containerStyle = { flex: 1 };

const SearchResults: React.FC<Props> = props => {
	const { notes, isPending } = useResults(props);
	// Don't show the progress bar immediately, only show if the search
	// is taking some time.
	const longRunning = useIsLongRunning(isPending);

	// To have the correct height on web, the progress bar needs to be wrapped:
	const progressBar = <View>
		<ProgressBar indeterminate={true} visible={longRunning}/>
	</View>;

	return (
		<View style={containerStyle}>
			{progressBar}
			<FlatList
				data={notes}
				keyExtractor={(item) => item.id}
				renderItem={event => <NoteItem note={event.item} />}
			/>
		</View>
	);
};

export default SearchResults;
