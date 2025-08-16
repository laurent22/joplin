import * as React from 'react';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { themeStyle } from '../../global-style';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CameraResult } from '../../CameraView/types';
import TextInput from '../../TextInput';
import PhotoPreview from '../../CameraView/PhotoPreview';
import TagEditor, { TagEditorMode } from '../../TagEditor';
import { AppState } from '../../../utils/types';
import { connect } from 'react-redux';
import { FolderEntity, TagEntity } from '@joplin/lib/services/database/types';
import { _ } from '@joplin/lib/locale';
import FolderPicker from '../../FolderPicker';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';
import { formatMsToLocal } from '@joplin/utils/time';
import { PrimaryButton } from '../../buttons';

export interface CreateNoteEvent {
	title: string;
	tags: string[];
	parentId: string;
}

type OnCreateNote = (event: CreateNoteEvent)=> void;

interface Props {
	themeId: number;
	imageCount: number;
	lastImage: CameraResult;
	allTags: TagEntity[];
	allFolders: FolderEntity[];
	selectedFolderId: string;

	onCreateNote: null|OnCreateNote;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			titleInput: {
				color: theme.color,
				fontSize: theme.fontSize,
			},
			rootScrollView: {
				flex: 1,
				width: '100%',
				maxWidth: 700,
				alignSelf: 'center',
			},
			photoBackground: {

			},
			photoLabel: {

			},
			tagEditor: {
				marginHorizontal: theme.margin,
			},
			tagEditorHeader: {
				fontWeight: 'normal',
			},
			folderPickerLine: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				gap: theme.margin * 2,
				margin: theme.margin,
				marginBottom: theme.margin * 2,
			},
			folderPicker: {
				flexGrow: 1,
			},
			actionButton: {
				alignSelf: 'flex-end',
				margin: theme.margin,
			},
		});
	}, [themeId]);
};

const tagSearchResultsProps = {
	// Required on Android when including one <ScrollView> inside another:
	nestedScrollEnabled: true,
};

const NotePreview: React.FC<Props> = ({
	themeId, lastImage, imageCount, allTags, onCreateNote, allFolders, selectedFolderId: propsSelectedFolderId,
}) => {
	const styles = useStyles(themeId);
	const [title, setTitle] = useState('');
	const [tags, setTags] = useState([]);
	const [selectedFolderId, setSelectedFolderId] = useState(propsSelectedFolderId);

	const realFolders = useMemo(() => {
		return Folder.getRealFolders(allFolders);
	}, [allFolders]);

	useEffect(() => {
		// Don't allow selecting a virtual folder
		if (selectedFolderId && realFolders.every(folder => folder.id !== selectedFolderId)) {
			setSelectedFolderId('');
		}
	}, [realFolders, selectedFolderId]);

	useEffect(() => {
		const template = Setting.value('scanner.titleTemplate');
		const date = formatMsToLocal(Date.now(), Setting.value('dateFormat'));
		setTitle(
			template.replace(/{date}/g, date)
				.replace(/{count}/g, `${imageCount}`),
		);
	}, [imageCount]);

	const onNewNote = useCallback(() => {
		if (!onCreateNote) return;

		onCreateNote({
			tags,
			title,
			parentId: selectedFolderId ?? '',
		});
	}, [onCreateNote, tags, title, selectedFolderId]);

	const onNewFolder = useCallback(async (title: string) => {
		const folder = await Folder.save({ title });
		setSelectedFolderId(folder.id);
	}, []);

	return <ScrollView style={styles.rootScrollView}>
		<TextInput
			style={styles.titleInput}
			themeId={themeId}
			value={title}
			onChangeText={setTitle}
		/>
		<View style={styles.folderPickerLine}>
			<PhotoPreview
				source={lastImage}
				backgroundStyle={styles.photoBackground}
				textStyle={styles.photoLabel}
				label={imageCount}
			/>
			<FolderPicker
				themeId={themeId}
				darkText
				placeholder={_('Select notebook')}
				folders={realFolders}
				onValueChange={setSelectedFolderId}
				selectedFolderId={selectedFolderId}
				mustSelect={true}
				onNewFolder={onNewFolder}
			/>
		</View>
		<TagEditor
			themeId={themeId}
			tags={tags}
			mode={TagEditorMode.Compact}
			allTags={allTags}
			style={styles.tagEditor}
			onTagsChange={setTags}
			headerStyle={styles.tagEditorHeader}
			searchResultProps={tagSearchResultsProps}
		/>
		<PrimaryButton
			onPress={onNewNote}
			style={styles.actionButton}
			disabled={!onCreateNote}
		>{_('Create note')}</PrimaryButton>
	</ScrollView>;
};

export default connect((state: AppState) => ({
	allTags: state.tags,
	allFolders: state.folders,
	selectedFolderId: state.selectedFolderId,
	themeId: state.settings.theme,
}))(NotePreview);
