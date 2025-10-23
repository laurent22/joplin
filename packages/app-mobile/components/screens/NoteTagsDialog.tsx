import * as React from 'react';

import { connect } from 'react-redux';
import Tag from '@joplin/lib/models/Tag';
import ModalDialog from '../ModalDialog';
import { AppState } from '../../utils/types';
import { TagEntity } from '@joplin/lib/services/database/types';
import TagEditor, { TagEditorMode } from '../TagEditor';
import { _ } from '@joplin/lib/locale';
import { useCallback, useEffect, useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { ViewStyle } from 'react-native';

interface Props {
	themeId: number;
	noteId: string|null;
	onCloseRequested?: ()=> void;
	tags: TagEntity[];
}

const modalPropOverrides = {
	scrollOverflow: {
		// Prevent the keyboard from auto-dismissing when tapping outside the search input
		keyboardShouldPersistTaps: true,
	},
	containerStyle: {
		height: '100%',
	} as ViewStyle,
};

const NoteTagsDialogComponent: React.FC<Props> = props => {
	const [noteId, setNoteId] = useState(props.noteId);
	const [savingTags, setSavingTags] = useState(false);
	const [noteTags, setNoteTags] = useState<string[]>([]);

	useEffect(() => {
		if (props.noteId) setNoteId(props.noteId);
	}, [props.noteId]);

	const onOkayPress = useCallback(async () => {
		setSavingTags(true);

		try {
			await Tag.setNoteTagsByTitles(noteId, noteTags);
		} finally {
			setSavingTags(false);
		}

		props.onCloseRequested?.();
	}, [props.onCloseRequested, noteId, noteTags]);

	const onCancelPress = useCallback(() => {
		props.onCloseRequested?.();
	}, [props.onCloseRequested]);

	useAsyncEffect(async (event) => {
		const tags = await Tag.tagsByNoteId(noteId);
		const noteTags = tags.map(t => t.title);
		if (!event.cancelled) {
			setNoteTags(noteTags);
		}
	}, [noteId]);

	return <ModalDialog
		themeId={props.themeId}
		onOkPress={onOkayPress}
		onCancelPress={onCancelPress}
		buttonBarEnabled={!savingTags}
		okTitle={_('Apply')}
		cancelTitle={_('Cancel')}
		modalProps={modalPropOverrides}
	>
		<TagEditor
			themeId={props.themeId}
			tags={noteTags}
			allTags={props.tags}
			onTagsChange={setNoteTags}
			mode={TagEditorMode.Large}
			searchResultProps={{ nestedScrollEnabled: true }}
			style={{ flex: 1 }}
		/>
	</ModalDialog>;
};

const NoteTagsDialog = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		tags: state.tags,
		noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
	};
})(NoteTagsDialogComponent);

export default NoteTagsDialog;
