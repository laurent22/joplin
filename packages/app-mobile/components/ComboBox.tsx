import * as React from 'react';
import { AccessibilityInfo, NativeSyntheticEvent, Platform, Role, ScrollViewProps, StyleSheet, TextInput, TextInputProps, useWindowDimensions, View, ViewProps, ViewStyle } from 'react-native';
import { TouchableRipple, Text } from 'react-native-paper';
import { connect } from 'react-redux';
import { AppState } from '../utils/types';
import { themeStyle } from './global-style';
import Icon from './Icon';
import { RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import SearchInput from './SearchInput';
import focusView from '../utils/focusView';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import NestableFlatList, { NestableFlatListControl } from './NestableFlatList';
import useKeyboardState from '../utils/hooks/useKeyboardState';
import { getCollator, getCollatorLocale } from '@joplin/lib/models/utils/getCollator';


export interface Option {
	title: string;
	icon: string|undefined;
	accessibilityHint: string|undefined;
	onPress?: ()=> void;

	// True if pressing this option removes it. Used for working around
	// focus issues.
	willRemoveOnPress: boolean;
}

export type OnItemSelected = (item: Option, index: number)=> void;

interface BaseProps {
	themeId: number;
	items: Option[];
	alwaysExpand: boolean;
	placeholder: string;
	onItemSelected: OnItemSelected;
	style: ViewStyle;
	searchInputProps?: TextInputProps;
	searchResultProps?: ScrollViewProps;
}

type OnAddItem = (content: string)=> void;
type OnCanAddItem = (item: string)=> boolean;

type Props = BaseProps & ({
	onAddItem: OnAddItem|null;
	canAddItem: OnCanAddItem;
}|{
	onAddItem?: undefined;
	canAddItem?: undefined;
});

const optionKeyExtractor = (option: Option) => option.title;

interface UseSearchResultsOptions {
	search: string;
	setSearch: (search: string)=> void;

	options: Option[];
	onAddItem: null|OnAddItem;
	canAddItem: OnCanAddItem;
}

const useSearchResults = ({
	search, setSearch, options, onAddItem, canAddItem,
}: UseSearchResultsOptions) => {
	const collatorLocale = getCollatorLocale();
	const results = useMemo(() => {
		const collator = getCollator(collatorLocale);
		const lowerSearch = search?.toLowerCase();
		return options
			.filter(option => option.title.toLowerCase().includes(lowerSearch))
			.sort((a, b) => {
				if (a.title === b.title) return 0;
				// Full matches should go first
				if (a.title.toLowerCase() === lowerSearch) return -1;
				if (b.title.toLowerCase() === lowerSearch) return 1;
				return collator.compare(a.title, b.title);
			});
	}, [search, options, collatorLocale]);

	const canAdd = (
		!!onAddItem
		&& search.trim()
		&& results[0]?.title !== search
		&& canAddItem(search)
	);

	// Use a ref to prevent unnecessary rerenders if onAddItem changes
	const addCurrentSearch = useRef(()=>{});
	addCurrentSearch.current = () => {
		onAddItem(search);
		AccessibilityInfo.announceForAccessibility(_('Added new: %s', search));
		setSearch('');
	};

	return useMemo(() => {
		if (!canAdd) return results;

		return [
			...results,
			{
				title: _('Add new'),
				icon: 'fas fa-plus',
				accessibilityHint: undefined,
				willRemoveOnPress: true,
				onPress: () => {
					addCurrentSearch.current?.();
				},
			},
		];
	}, [canAdd, results]);
};

interface SelectedIndexControl {
	onNextResult: ()=> void;
	onPreviousResult: ()=> void;
	onFirstResult: ()=> void;
	onLastResult: ()=> void;
}

const useSelectedIndex = (search: string, searchResults: Option[]) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		if (search) {
			setSelectedIndex(0);
		} else {
			const hasResults = !!searchResults.length;
			setSelectedIndex(hasResults ? 0 : -1);
		}
	}, [searchResults, search]);

	const resultCount = searchResults.length;
	const selectedIndexControl: SelectedIndexControl = useMemo(() => ({
		onNextResult: () => {
			setSelectedIndex(index => {
				return Math.min(index + 1, resultCount - 1);
			});
		},
		onPreviousResult: () => {
			setSelectedIndex(index => {
				return Math.max(index - 1, 0);
			});
		},
		onFirstResult: () => {
			setSelectedIndex(0);
		},
		onLastResult: () => {
			setSelectedIndex(resultCount - 1);
		},
	}), [resultCount]);

	return { selectedIndex, selectedIndexControl };
};

const useStyles = (themeId: number, showSearchResults: boolean) => {
	const { fontScale, height: screenHeight } = useWindowDimensions();
	const { dockedKeyboardHeight: keyboardHeight } = useKeyboardState();

	// Allow the search results size to decrease when the keyboard is visible.
	const searchResultsHeight = Math.max(128, Math.min(200, (screenHeight - keyboardHeight) / 3));

	const menuItemHeight = 40 * fontScale;
	const theme = themeStyle(themeId);

	const styles = useMemo(() => {
		const borderRadius = 4;
		const itemMarginVertical = 8;
		return StyleSheet.create({
			root: {
				flexDirection: 'column',
				overflow: 'hidden',

				borderRadius,
				backgroundColor: theme.backgroundColor,
				borderColor: theme.dividerColor,
				borderWidth: showSearchResults ? 1 : 0,
			},
			searchInputContainer: {
				borderRadius,
				backgroundColor: theme.backgroundColor,
				borderColor: theme.dividerColor,
				borderWidth: 1,
				...(showSearchResults ? {
					borderTopWidth: 0,
					borderLeftWidth: 0,
					borderRightWidth: 0,
				} : {}),
			},
			tagSearchHelp: {
				color: theme.colorFaded,
				marginTop: 6,
			},
			searchInput: {
				minHeight: 32,
			},
			searchResults: {
				height: searchResultsHeight,
				flexGrow: 1,
				flexShrink: 1,
				...(showSearchResults ? {} : {
					display: 'none',
				}),
			},
			optionIcon: {
				color: theme.color,
				fontSize: theme.fontSizeSmaller,
				textAlign: 'center',
				paddingLeft: 4,
				paddingRight: 4,
			},
			optionLabel: {
				fontSize: theme.fontSize,
				color: theme.color,
				paddingInlineStart: 3,
			},
			optionContent: {
				flexDirection: 'row',
				alignItems: 'center',
				borderRadius,

				height: menuItemHeight - itemMarginVertical,
				marginTop: itemMarginVertical / 2,
				marginBottom: itemMarginVertical / 2,
				paddingHorizontal: 3,
			},
			optionContentSelected: {
				backgroundColor: theme.selectedColor,
			},
		});
	}, [theme, menuItemHeight, searchResultsHeight, showSearchResults]);

	return { menuItemHeight, styles };
};

type Styles = ReturnType<typeof useStyles>['styles'];

interface SearchResultProps {
	text: string;
	icon: string;
	selected: boolean;
	styles: Styles;
}

const SearchResult: React.FC<SearchResultProps> = ({
	text, styles, selected, icon: iconName,
}) => {
	const icon = iconName ? <Icon
		style={styles.optionIcon}
		name={iconName}
		// Description is provided by adjacent text
		accessibilityLabel={null}
	/> : null;

	return (
		<View style={[styles.optionContent, selected && styles.optionContentSelected]}>
			{icon}
			<Text
				ellipsizeMode='tail'
				numberOfLines={1}
				style={styles.optionLabel}
			>{text}</Text>
		</View>
	);
};

interface ResultWrapperProps extends ViewProps {
	index: number;
	item: Option;
}

interface SearchResultContainerProps {
	onItemSelected: OnItemSelected;
	selectedIndex: number;
	baseId: string;
	resultCount: number;
	searchInputRef: RefObject<TextInput>;
	// Used to determine focus
	resultsHideOnPress: boolean;
}

const useSearchResultContainerComponent = ({
	onItemSelected, selectedIndex, baseId, resultCount, searchInputRef, resultsHideOnPress,
}: SearchResultContainerProps): React.FC<ResultWrapperProps> => {
	const listItemsRef = useRef<Record<number, View>>({});

	const eventQueue = useMemo(() => {
		const queue = new AsyncActionQueue(100);
		// Don't allow skipping any onItemSelected calls:
		queue.setCanSkipTaskHandler(() => false);
		return queue;
	}, []);
	const onItemPressRef = useRef(onItemSelected);
	onItemPressRef.current = (item, index) => {
		let focusTarget = null;

		if (resultsHideOnPress) {
			focusTarget = searchInputRef.current;
		} else if (Platform.OS === 'android' && item.willRemoveOnPress) {
			// Workaround for an accessibility bug on Android: By default, when an item is removed
			// from the list of results, focus can occasionally jump to the start of the document.
			// To prevent this, manually move focus to the next item before the results list changes:
			const adjacentView = listItemsRef.current[index + 1] ?? listItemsRef.current[index - 1];

			focusTarget = adjacentView ?? searchInputRef.current;
		}

		if (focusTarget) {
			focusView('ComboBox::focusAfterPress', focusTarget);

			eventQueue.push(() => {
				onItemSelected(item, index);
			});
		} else {
			onItemSelected(item, index);
		}
	};

	// For the correct accessibility structure, the `TouchableRipple`s need to be siblings.
	return useMemo(() => ({ index, item, children, ...rest }) => (
		<TouchableRipple
			{...rest}
			ref={(item) => {
				listItemsRef.current[index] = item;
			}}
			onPress={() => { onItemPressRef.current(item, index); }}
			// On web, focus is controlled using the arrow keys. On other
			// platforms, arrow key navigation is not available and each item
			// needs to be focusable
			tabIndex={Platform.OS === 'web' ? -1 : undefined}
			role={Platform.OS === 'web' ? 'option' : 'button'}
			accessibilityHint={item.accessibilityHint}
			aria-selected={index === selectedIndex}
			nativeID={`${baseId}-${index}`}
			testID={`search-result-${index}`}
			aria-setsize={resultCount}
			aria-posinset={index + 1}
		><View>{children}</View></TouchableRipple>
	), [selectedIndex, baseId, resultCount]);
};

const useShowSearchResults = (alwaysExpand: boolean, search: string) => {
	const [showSearchResults, setShowSearchResults] = useState(alwaysExpand);

	const showResultsRef = useRef(showSearchResults);
	showResultsRef.current = showSearchResults;

	useEffect(() => {
		if (alwaysExpand) {
			setShowSearchResults(true);
		}
	}, [alwaysExpand]);

	useEffect(() => {
		if (search.length > 0 && !showResultsRef.current) {
			setShowSearchResults(true);
		}
	}, [search]);

	return { showSearchResults, setShowSearchResults };
};

interface AnnounceSelectionOptions {
	enabled: boolean;
	selectedResultTitle: string|undefined;
	resultCount: number;
	searchQuery: string;
}

const useAnnounceSelection = ({ selectedResultTitle, resultCount, enabled, searchQuery }: AnnounceSelectionOptions) => {
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;

	const announcement = (() => {
		if (!searchQuery) return '';
		if (resultCount === 0) return _('No results');
		if (selectedResultTitle) return _('Selected: %s', selectedResultTitle);
		return '';
	})();

	useEffect(() => {
		if (enabledRef.current && announcement) {
			AccessibilityInfo.announceForAccessibility(announcement);
		}
	}, [announcement]);
};

const useSelectionAutoScroll = (
	listRef: RefObject<NestableFlatListControl|null>, results: Option[], selectedIndex: number,
) => {
	const resultsRef = useRef(results);
	resultsRef.current = results;
	useEffect(() => {
		if (resultsRef.current?.length && selectedIndex >= 0) {
			listRef.current?.scrollToIndex({ index: selectedIndex, animated: false, viewPosition: 0.4 });
		}
	}, [selectedIndex, listRef]);
};

interface UseInputEventHandlersProps {
	selectedIndexControl: SelectedIndexControl;
	onItemSelected: OnItemSelected;

	selectedIndex: number;
	selectedResult: Option|null;
	alwaysExpand: boolean;
	showSearchResults: boolean;
	setShowSearchResults: (show: boolean)=> void;
	setSearch: (search: string)=> void;
}

const useInputEventHandlers = ({
	selectedIndexControl,
	onItemSelected: propsOnItemSelected, setShowSearchResults, alwaysExpand,
	setSearch, selectedResult, selectedIndex, showSearchResults,
}: UseInputEventHandlersProps) => {

	const propsOnItemSelectedRef = useRef(propsOnItemSelected);
	propsOnItemSelectedRef.current = propsOnItemSelected;

	const onItemSelected = useCallback((item: Option, index: number) => {
		let result;
		if (item.onPress) {
			result = item.onPress();
		} else {
			result = propsOnItemSelectedRef.current(item, index);
		}

		if (!alwaysExpand) {
			setSearch('');
			setShowSearchResults(false);
		}

		return result;
	}, [setShowSearchResults, alwaysExpand, setSearch]);

	const onSubmit = useCallback(() => {
		if (selectedResult) {
			onItemSelected(selectedResult, selectedIndex);
		}
	}, [onItemSelected, selectedResult, selectedIndex]);

	// For now, onKeyPress only works on web.
	// See https://github.com/react-native-community/discussions-and-proposals/issues/249
	type KeyPressEvent = { key: string };
	const onKeyPress = useCallback((event: NativeSyntheticEvent<KeyPressEvent>) => {
		const key = event.nativeEvent.key;
		const isDownArrow = key === 'ArrowDown';
		const isUpArrow = key === 'ArrowUp';
		if (!showSearchResults && (isDownArrow || isUpArrow)) {
			setShowSearchResults(true);
			if (isUpArrow) {
				selectedIndexControl.onLastResult();
			} else {
				selectedIndexControl.onFirstResult();
			}
			event.preventDefault();
		} else if (key === 'ArrowDown') {
			selectedIndexControl.onNextResult();
			event.preventDefault();
		} else if (key === 'ArrowUp') {
			selectedIndexControl.onPreviousResult();
			event.preventDefault();
		} else if (key === 'Enter' && Platform.OS === 'web') {
			// This case is necessary on web to prevent the
			// search input from becoming defocused after
			// pressing "enter". Enter key behavior is handled
			// elsewhere for other platforms.
			event.preventDefault();
			onSubmit();
			setSearch('');
		} else if (key === 'Escape' && !alwaysExpand) {
			setShowSearchResults(false);
			event.preventDefault();
		}
	}, [onSubmit, setSearch, selectedIndexControl, setShowSearchResults, showSearchResults, alwaysExpand]);

	return { onKeyPress, onItemSelected, onSubmit };
};


const ComboBox: React.FC<Props> = ({
	themeId,
	items,
	onItemSelected: propsOnItemSelected,
	placeholder,
	onAddItem,
	canAddItem,
	style: rootStyle,
	alwaysExpand,
	searchInputProps,
	searchResultProps,
}) => {
	const [search, setSearch] = useState('');
	const { showSearchResults, setShowSearchResults } = useShowSearchResults(alwaysExpand, search);
	const { styles, menuItemHeight } = useStyles(themeId, showSearchResults);

	const results = useSearchResults({
		search,
		setSearch,
		options: items,
		onAddItem,
		canAddItem,
	});
	const { selectedIndex, selectedIndexControl } = useSelectedIndex(search, results);
	const searchInputRef = useRef<TextInput|null>(null);
	const listRef = useRef<NestableFlatListControl|null>(null);

	useSelectionAutoScroll(listRef, results, selectedIndex);

	useAnnounceSelection({
		// On web, announcements are handled natively based on accessibility roles.
		// Manual announcements are only needed on iOS and Android:
		enabled: Platform.OS !== 'web',
		selectedResultTitle: results[selectedIndex]?.title,
		searchQuery: search,
		resultCount: results.length,
	});

	const { onItemSelected, onKeyPress, onSubmit } = useInputEventHandlers({
		selectedIndexControl,
		onItemSelected: propsOnItemSelected,

		selectedIndex,
		selectedResult: results[selectedIndex],
		alwaysExpand,
		showSearchResults,
		setShowSearchResults,
		setSearch,
	});

	const baseId = useId();
	const SearchResultWrapper = useSearchResultContainerComponent({
		onItemSelected, selectedIndex, baseId, searchInputRef, resultCount: results.length,
		resultsHideOnPress: !alwaysExpand,
	});

	type RenderEvent = { item: Option; index: number };
	const renderItem = useCallback(({ item, index }: RenderEvent) => {
		return <SearchResult
			text={item.title}
			styles={styles}
			selected={index === selectedIndex}
			icon={item.icon ?? ''}
		/>;
	}, [selectedIndex, styles]);

	const webProps = {
		onKeyDown: onKeyPress,
	};
	const activeId = `${baseId}-${selectedIndex}`;
	const searchResults = <NestableFlatList
		keyboardShouldPersistTaps="handled"
		ref={listRef}
		data={results}
		{...searchResultProps}

		CellRendererComponent={SearchResultWrapper}
		itemHeight={menuItemHeight}

		contentWrapperProps={{
			// A better role would be 'listbox', but that isn't supported by RN.
			role: Platform.OS === 'web' ? 'listbox' as Role : undefined,
			'aria-activedescendant': activeId,
			nativeID: `menuBox-${baseId}`,
			onKeyPress,
			// Allow focusing the results list directly on web. It has been observed
			// that certain screen readers on web sometimes fail to read changes to the results list.
			// Being able to navigate directly to the results list may help users in this case.
			tabIndex: Platform.OS === 'web' ? 0 : undefined,
		} as ViewProps}

		style={styles.searchResults}
		keyExtractor={optionKeyExtractor}
		extraData={renderItem}
		renderItem={renderItem}
	/>;

	const helpComponent = <Text style={styles.tagSearchHelp}>{_('To create a new tag, type the name and press enter.')}</Text>;

	return <View style={[styles.root, rootStyle]} {...webProps}>
		<SearchInput
			inputRef={searchInputRef}
			themeId={themeId}
			containerStyle={styles.searchInputContainer}
			style={styles.searchInput}
			value={search}
			onChangeText={setSearch}
			onKeyPress={onKeyPress}
			onSubmitEditing={onSubmit}
			submitBehavior='submit'
			placeholder={placeholder}
			aria-activedescendant={showSearchResults ? activeId : undefined}
			aria-controls={`menuBox-${baseId}`}

			// Certain accessibility properties only work well on web:
			{...(Platform.OS === 'web' ? {
				role: 'combobox',
				'aria-autocomplete': 'list',
				'aria-expanded': showSearchResults,
				'aria-label': placeholder,
			} : {})}
			{...searchInputProps}
		/>
		{searchResults}
		{!showSearchResults && helpComponent}
	</View>;
};


export default connect((state: AppState) => ({
	themeId: state.settings.theme,
}))(ComboBox);
