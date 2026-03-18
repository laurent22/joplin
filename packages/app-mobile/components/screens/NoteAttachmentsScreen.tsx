import * as React from 'react';

import { View, Text, FlatList, StyleSheet, Button, TouchableOpacity, ActivityIndicator } from 'react-native';
import { connect } from 'react-redux';
import ScreenHeader from '../ScreenHeader';
import SearchInput from '../SearchInput';
import IconButton from '../IconButton';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../utils/types';
import { themeStyle } from '../global-style';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Resource, { NoteAttachmentSortDirection, NoteAttachmentSortField } from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import showResource from '../../commands/util/showResource';
import { bytesToHuman } from '@joplin/utils/bytes';
import Clipboard from '@react-native-clipboard/clipboard';
import { buildResourceMarkdownLink, nextSortState } from './noteAttachmentsUtils';

interface Props {
	themeId: number;
}

interface ResourceListItem {
	item: ResourceEntity;
}

const PAGE_SIZE = 50;

const sortTypeLabel = (sortField: NoteAttachmentSortField, sortDirection: NoteAttachmentSortDirection) => {
	if (sortField === 'title') return sortDirection === 'asc' ? _('Title (A-Z)') : _('Title (Z-A)');
	return sortDirection === 'asc' ? _('Size (smallest first)') : _('Size (largest first)');
};

const displayTitle = (resource: ResourceEntity) => {
	return resource.title ? resource.title : `(${_('Untitled')})`;
};

const displaySize = (resource: ResourceEntity) => {
	if (typeof resource.size !== 'number' || resource.size < 0) return _('Unknown size');
	return bytesToHuman(resource.size);
};

const NoteAttachmentsScreenComponent: React.FC<Props> = props => {
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [resources, setResources] = useState<ResourceEntity[]>([]);
	const [sortField, setSortField] = useState<NoteAttachmentSortField>('title');
	const [sortDirection, setSortDirection] = useState<NoteAttachmentSortDirection>('asc');
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const [refreshIndex, setRefreshIndex] = useState(0);
	const [errorMessage, setErrorMessage] = useState('');
	const [deletingResourceIds, setDeletingResourceIds] = useState<string[]>([]);
	const theme = themeStyle(props.themeId);
	const loadCounter = useRef(0);

	const styles = useMemo(() => {
		return StyleSheet.create({
			root: {
				...theme.rootStyle,
				flex: 1,
			},
			warning: {
				marginTop: theme.margin,
				marginBottom: theme.margin,
				marginLeft: theme.marginLeft,
				marginRight: theme.marginRight,
				backgroundColor: theme.warningBackgroundColor,
				paddingTop: 5,
				paddingBottom: 5,
				paddingLeft: 10,
				paddingRight: 10,
			},
			warningText: {
				color: theme.color,
				fontSize: theme.fontSize,
			},
			searchInputContainer: {
				marginBottom: theme.itemMarginBottom,
				marginLeft: theme.marginLeft,
				marginRight: theme.marginRight,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: 4,
				paddingBottom: 4,
				borderWidth: 1,
				borderColor: theme.dividerColor,
				borderRadius: 4,
				backgroundColor: theme.backgroundColor,
			},
			listContent: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingBottom: theme.marginBottom,
			},
			row: {
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
			},
			rowTop: {
				flexDirection: 'row',
				alignItems: 'flex-start',
			},
			rowHeader: {
				paddingRight: 8,
			},
			rowPressable: {
				flex: 1,
				minHeight: 44,
				paddingTop: 6,
				paddingBottom: 8,
			},
			sortBar: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingBottom: theme.itemMarginBottom,
			},
			errorText: {
				color: theme.colorError,
				fontSize: theme.fontSize,
				marginBottom: 8,
			},
			rowTitle: {
				color: theme.colorFaded,
				fontSize: theme.fontSize,
				lineHeight: theme.fontSize * 1.4,
			},
			rowFieldLabel: {
				color: theme.color,
				fontSize: theme.fontSizeSmaller,
				fontWeight: '600',
				marginBottom: 2,
			},
			rowMeta: {
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
				marginBottom: 4,
			},
			copyButtonInline: {
				marginLeft: 8,
			},
			actionsRow: {
				marginTop: 4,
				flexDirection: 'row',
				alignItems: 'center',
			},
			actionsRowButton: {
				flex: 1,
			},
			copyButtonContainer: {
				minWidth: 44,
				minHeight: 44,
				paddingLeft: 10,
				paddingRight: 10,
				justifyContent: 'center',
				alignItems: 'center',
			},
			copyIcon: {
				color: theme.color,
				fontSize: theme.fontSizeLarger,
			},
			emptyText: {
				color: theme.colorFaded,
				fontSize: theme.fontSize,
				marginTop: theme.marginTop,
			},
			loadingFooter: {
				paddingTop: theme.marginTop,
				paddingBottom: theme.marginBottom,
			},
		});
	}, [theme]);

	useEffect(() => {
		const timeout = shim.setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, 250);

		return () => {
			shim.clearTimeout(timeout);
		};
	}, [searchQuery]);

	const loadPage = useCallback(async (offset: number) => {
		loadCounter.current++;
		const currentLoad = loadCounter.current;
		const loadingInitialPage = offset === 0;

		if (loadingInitialPage) {
			setIsLoading(true);
			setErrorMessage('');
		} else {
			setIsLoadingMore(true);
		}

		try {
			const result = await Resource.noteAttachments({
				searchQuery: debouncedSearchQuery,
				sortField,
				sortDirection,
				limit: PAGE_SIZE,
				offset,
			});

			if (currentLoad !== loadCounter.current) return;

			if (loadingInitialPage) {
				setResources(result.items);
			} else {
				setResources(previous => previous.concat(result.items));
			}
			setHasMore(result.hasMore);
			setErrorMessage('');
		} catch (error) {
			if (currentLoad !== loadCounter.current) return;
			setErrorMessage(error.message);
		} finally {
			if (currentLoad === loadCounter.current) {
				setIsLoading(false);
				setIsLoadingMore(false);
			}
		}
	}, [debouncedSearchQuery, sortDirection, sortField]);

	useEffect(() => {
		void loadPage(0);
	}, [loadPage, refreshIndex]);

	const onDeleteResource = useCallback(async (resource: ResourceEntity) => {
		if (!resource.id) return;

		const confirmed = await shim.showConfirmationDialog(_('Delete attachment "%s"?', displayTitle(resource)));
		if (!confirmed) return;

		setDeletingResourceIds(previous => previous.concat(resource.id));

		try {
			await Resource.delete(resource.id, { sourceDescription: 'NoteAttachmentsScreen' });
			setRefreshIndex(index => index + 1);
		} catch (error) {
			await shim.showErrorDialog(error.message);
		} finally {
			setDeletingResourceIds(previous => previous.filter(id => id !== resource.id));
		}
	}, []);

	const onOpenResource = useCallback(async (resource: ResourceEntity) => {
		try {
			await showResource(resource);
		} catch (_error) {
			const fullPath = Resource.fullPath(resource);
			await shim.showErrorDialog(_('This file could not be opened: %s', fullPath));
		}
	}, []);

	const onCopyMarkdownLink = useCallback((resource: ResourceEntity) => {
		const markdownLink = buildResourceMarkdownLink(resource);
		if (!markdownLink) return;
		Clipboard.setString(markdownLink);
	}, []);

	const onToggleSorting = useCallback((nextSortField: NoteAttachmentSortField) => {
		const nextState = nextSortState(sortField, sortDirection, nextSortField);
		setSortField(nextState.sortField);
		setSortDirection(nextState.sortDirection);
	}, [sortDirection, sortField]);

	const onLoadMore = useCallback(() => {
		if (isLoading || isLoadingMore || !hasMore || errorMessage) return;
		void loadPage(resources.length);
	}, [errorMessage, hasMore, isLoading, isLoadingMore, loadPage, resources.length]);

	const listEmptyText = useMemo(() => {
		if (debouncedSearchQuery.trim()) return _('No attachments match your search.');
		return _('No resources!');
	}, [debouncedSearchQuery]);

	const loadingFooter = useMemo(() => {
		if (!isLoadingMore) return null;
		return <View style={styles.loadingFooter}><ActivityIndicator /></View>;
	}, [isLoadingMore, styles.loadingFooter]);

	const renderItem = useCallback(({ item }: ResourceListItem) => {
		if (!item.id) return null;
		const deleting = deletingResourceIds.includes(item.id);
		const title = displayTitle(item);
		const size = displaySize(item);

		return (
			<View style={styles.row} accessible={false}>
				<View style={styles.rowTop}>
					<TouchableOpacity
						accessible={true}
						focusable={true}
						style={styles.rowPressable}
						onPress={() => {
							void onOpenResource(item);
						}}
						accessibilityRole='button'
						accessibilityLabel={_('Attachment: %s. Size: %s. ID: %s', title, size, item.id)}
						accessibilityHint={_('Opens this attachment')}
					>
						<View style={styles.rowHeader}>
							<Text accessible={false} style={styles.rowFieldLabel}>{_('Title')}</Text>
						</View>
						<Text accessible={false} style={styles.rowTitle}>{title}</Text>
						<Text accessible={false} style={styles.rowFieldLabel}>{_('Size')}</Text>
						<Text accessible={false} style={styles.rowMeta}>{size}</Text>
						<Text accessible={false} style={styles.rowFieldLabel}>{_('ID')}</Text>
						<Text accessible={false} style={styles.rowMeta}>{item.id}</Text>
					</TouchableOpacity>
					<View style={styles.copyButtonInline}>
						<IconButton
							onPress={() => onCopyMarkdownLink(item)}
							description={_('Copy Markdown link')}
							accessibilityHint={_('Copies a Markdown link to this attachment')}
							iconName='material content-copy'
							iconStyle={styles.copyIcon}
							containerStyle={styles.copyButtonContainer}
							themeId={props.themeId}
							accessibilityRole='button'
						/>
					</View>
				</View>
				<View style={styles.actionsRow}>
					<View style={styles.actionsRowButton}>
						<Button title={_('Delete')} disabled={deleting} accessibilityLabel={_('Delete attachment: %s', title)} onPress={() => {
							void onDeleteResource(item);
						}} />
					</View>
				</View>
			</View>
		);
	}, [deletingResourceIds, onCopyMarkdownLink, onDeleteResource, onOpenResource, props.themeId, styles.actionsRow, styles.actionsRowButton, styles.copyButtonContainer, styles.copyButtonInline, styles.copyIcon, styles.row, styles.rowFieldLabel, styles.rowHeader, styles.rowMeta, styles.rowPressable, styles.rowTitle, styles.rowTop]);

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('Note attachments')} />
			<View style={styles.warning}>
				<Text style={styles.warningText}>
					{_('This is an advanced tool to show the attachments that are linked to your notes. Please be careful when deleting one of them as they cannot be restored afterwards.')}
				</Text>
			</View>
			<SearchInput
				themeId={props.themeId}
				value={searchQuery}
				onChangeText={setSearchQuery}
				placeholder={_('Search...')}
				autoCorrect={false}
				autoComplete='off'
				autoCapitalize='none'
				containerStyle={styles.searchInputContainer}
			/>
			<View style={styles.sortBar}>
				<Button title={sortTypeLabel(sortField, sortDirection)} onPress={() => onToggleSorting(sortField)} />
				<Button title={sortField === 'title' ? _('Sort by size') : _('Sort by title')} onPress={() => onToggleSorting(sortField === 'title' ? 'size' : 'title')} />
			</View>
			{errorMessage ? <View style={styles.listContent}>
				<Text style={styles.errorText}>{errorMessage}</Text>
				<Button title={_('Retry')} onPress={() => {
					void loadPage(0);
				}} />
			</View> : null}
			{isLoading ? <View style={styles.listContent}><ActivityIndicator /><Text style={styles.emptyText}>{_('Please wait...')}</Text></View> : null}
			<FlatList
				data={resources}
				keyExtractor={item => item.id}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={!isLoading && !errorMessage ? <Text style={styles.emptyText}>{listEmptyText}</Text> : null}
				renderItem={renderItem}
				onEndReached={onLoadMore}
				onEndReachedThreshold={0.8}
				ListFooterComponent={loadingFooter}
			/>
		</View>
	);
};

const NoteAttachmentsScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(NoteAttachmentsScreenComponent);

export default NoteAttachmentsScreen;
