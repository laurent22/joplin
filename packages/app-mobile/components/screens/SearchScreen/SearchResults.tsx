import * as React from 'react';
import { useMemo } from 'react';

import { FlatList, View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import NoteItem from '../../NoteItem';
import { useEffect, useRef, useState } from 'react';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { NoteEntity } from '@joplin/lib/services/database/types';
import SearchEngineUtils from '@joplin/lib/services/search/SearchEngineUtils';
import Note from '@joplin/lib/models/Note';
import SearchEngine, { ComplexTerm } from '@joplin/lib/services/search/SearchEngine';
import { ProgressBar } from 'react-native-paper';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import { connect } from 'react-redux';
import { AppState } from '../../../utils/types';

interface Props {
	themeId: number;
	query: string;
	onHighlightedWordsChange: (highlightedWords: (ComplexTerm | string)[])=> void;

	ftsEnabled: number;
	initialNumToRender?: number;
}

export const limit = 100;

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const limitMessageContainer: ViewStyle = {
			marginLeft: theme.marginLeft,
		};

		const limitMessage: TextStyle = {
			color: theme.colorFaded,
			fontSize: theme.fontSize * 0.8,
			marginRight: theme.marginRight,
		};

		return StyleSheet.create({
			limitMessageContainer,
			limitMessage,
		});
	}, [themeId]);
};

type LimitMessageProps = {
	themeId: number;
};

const LimitMessage = (props: LimitMessageProps) => {
	const styles = useStyles(props.themeId);

	return <View style={styles.limitMessageContainer}>
		<Text style={styles.limitMessage}>{_('Only the first %s results are being shown', limit)}</Text>
	</View>;

};

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
					const r = await SearchEngineUtils.notesForQuery(query, true, { appendWildCards: true, limit });
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
	const progressVisible = longRunning;

	// To have the correct height on web, the progress bar needs to be wrapped:
	const progressBar = <View aria-hidden={!progressVisible}>
		<ProgressBar indeterminate={true} visible={progressVisible}/>
	</View>;

	return (
		<View style={containerStyle}>
			{progressBar}
			<FlatList
				data={notes}
				keyExtractor={(item) => item.id}
				initialNumToRender={props.initialNumToRender}
				renderItem={event => {
					if (event.index === 0 && notes.length === limit) {
						return <React.Fragment>
							<LimitMessage themeId={props.themeId} />
							<NoteItem note={event.item} />
						</React.Fragment>;
					}
					return <NoteItem note={event.item} />;
				}}
			/>
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(SearchResults);
