import * as React from 'react';
import { Button, Divider, Text } from 'react-native-paper';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { StateShare } from '@joplin/lib/services/share/reducer';
import ShareService from '@joplin/lib/services/share/ShareService';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import Clipboard from '@react-native-clipboard/clipboard';
import useOnShareLinkClick from '@joplin/lib/components/shared/ShareNoteDialog/useOnShareLinkClick';
import onUnshareNoteClick from '@joplin/lib/components/shared/ShareNoteDialog/onUnshareNoteClick';
import useShareStatusMessage from '@joplin/lib/components/shared/ShareNoteDialog/useShareStatusMessage';
import useEncryptionWarningMessage from '@joplin/lib/components/shared/ShareNoteDialog/useEncryptionWarningMessage';
import { SharingStatus } from '@joplin/lib/components/shared/ShareNoteDialog/types';
import { AppState } from '../../utils/types';
import { connect } from 'react-redux';
import DismissibleDialog, { DialogVariant } from '../DismissibleDialog';
import { _, _n } from '@joplin/lib/locale';
import { LinkButton, PrimaryButton } from '../buttons';
import { themeStyle } from '../global-style';

interface Props {
	themeId: number;
	noteId: string;
	visible: boolean;
	onClose: ()=> void;
	shares: StateShare[];
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			root: {
				flexGrow: 1,
			},
			scrollingRegion: {
				flexGrow: 1,
			},
			noteItem: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				paddingTop: 8,
				paddingBottom: 8,
				minHeight: 32,
			},
			noteTitle: {
				fontSize: theme.fontSize,
			},
		});
	}, [themeId]);
};

interface UnpublishProps {
	note: NoteEntity;
	onUnpublishStart: ()=> void;
}

const UnpublishButton: React.FC<UnpublishProps> = ({ note, onUnpublishStart }) => {
	const [unpublishing, setUnpublishing] = useState(false);
	const onPress = useCallback(async () => {
		onUnpublishStart();
		try {
			setUnpublishing(true);
			await onUnshareNoteClick({ noteId: note.id });
		} finally {
			setUnpublishing(false);
		}
	}, [note, onUnpublishStart]);

	return <Button
		accessibilityLabel={_('Unpublish "%s"', note.title)}
		loading={unpublishing}
		disabled={unpublishing}
		icon='share-off'
		onPress={onPress}
	>{_('Unpublish')}</Button>;
};

const ShareNoteDialogContent: React.FC<Props> = ({
	themeId, noteId, shares,
}) => {
	const [notes, setNotes] = useState<NoteEntity[]>([]);
	const recursiveShare = false;
	const [sharesState, setSharesState] = useState<SharingStatus>(SharingStatus.Unknown);
	const [shareLinks, setShareLinks] = useState<string[]>([]);

	const noteCount = notes.length;

	useEffect(() => {
		void ShareService.instance().refreshShares();
	}, []);

	useAsyncEffect(async (event) => {
		const note = await Note.load(noteId);
		if (event.cancelled) return;
		setNotes([note]);
	}, [noteId]);

	const onCopyLinks = useCallback(async (links: string[]) => {
		setShareLinks(links);
		const linkText = links.join('\n');
		Clipboard.setString(linkText);
	}, []);

	const onUnpublishStart = useCallback(() => {
		setShareLinks([]);
	}, []);

	const shareLinkButton_click = useOnShareLinkClick({
		setSharesState,
		onShareUrlsReady: onCopyLinks,
		notes,
		recursiveShare,
	});

	const styles = useStyles(themeId);

	const renderNote = (note: NoteEntity) => {
		const unshareButton = shares.find(s => s.note_id === note.id) ? (
			<UnpublishButton note={note} onUnpublishStart={onUnpublishStart}/>
		) : null;

		return (
			<View key={note.id} style={styles.noteItem}>
				<Text style={styles.noteTitle}>{note.title}</Text>{unshareButton}
			</View>
		);
	};

	const renderNoteList = (notes: NoteEntity[]) => {
		const noteComps = [];
		for (const note of notes) {
			noteComps.push(renderNote(note));
		}
		return <View>{noteComps}</View>;
	};

	const statusMessage = useShareStatusMessage({
		sharesState, noteCount,
	});
	const encryptionMessage = useEncryptionWarningMessage();

	const renderEncryptionWarningMessage = () => {
		if (!encryptionMessage) return null;
		return <>
			<Text>{encryptionMessage}</Text>
			<Divider/>
		</>;
	};

	const renderLinks = () => {
		if (shareLinks.length === 0) return null;
		return <>
			<Divider/>
			<Text variant='titleMedium' accessibilityRole='header'>{_('Links')}</Text>
			{shareLinks.map((link, index) => {
				return <LinkButton
					onPress={() => Linking.openURL(link)}
					key={`link-${index}`}
				>{link}</LinkButton>;
			})}
		</>;
	};

	const copyButtonLoading = [SharingStatus.Creating, SharingStatus.Synchronizing].includes(sharesState);
	const copyLinkButton = <PrimaryButton
		disabled={copyButtonLoading}
		loading={copyButtonLoading}
		onPress={shareLinkButton_click}
	>{
			_n('Copy Shareable Link', 'Copy Shareable Links', noteCount)
		}</PrimaryButton>;

	return <View style={styles.root}>
		<ScrollView style={styles.scrollingRegion}>
			{renderEncryptionWarningMessage()}
			<Divider/>
			{renderNoteList(notes)}
			{renderLinks()}
		</ScrollView>
		<Text aria-live='polite'>{statusMessage}</Text>
		{copyLinkButton}
	</View>;
};

const ShareNoteDialog: React.FC<Props> = props => {
	return <DismissibleDialog
		themeId={props.themeId}
		visible={props.visible}
		onDismiss={props.onClose}
		size={DialogVariant.Small}
		heading={_('Publish Note')}
	>
		{props.visible ? <ShareNoteDialogContent {...props}/> : null}
	</DismissibleDialog>;
};

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		shares: state.shareService.shares.filter(s => !!s.note_id),
	};
};

export default connect(mapStateToProps)(ShareNoteDialog);
