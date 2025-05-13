import * as React from 'react';
import { useEffect } from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import NoteTextViewer, { NoteViewerControl } from './NoteTextViewer';
import HelpButton from './HelpButton';
import BaseModel from '@joplin/lib/BaseModel';
import Revision from '@joplin/lib/models/Revision';
import RevisionService from '@joplin/lib/services/RevisionService';
import { MarkupLanguage } from '@joplin/renderer';
import time from '@joplin/lib/time';
import bridge from '../services/bridge';
import { NoteEntity, RevisionEntity } from '@joplin/lib/services/database/types';
import { AppState } from '../app.reducer';
const urlUtils = require('@joplin/lib/urlUtils');
const ReactTooltip = require('react-tooltip');
const { connect } = require('react-redux');
import shared from '@joplin/lib/components/shared/note-screen-shared';
import shim, { MessageBoxType } from '@joplin/lib/shim';
import { RefObject, useCallback, useRef, useState } from 'react';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import useMarkupToHtml from './hooks/useMarkupToHtml';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { ScrollbarSize } from '@joplin/lib/models/settings/builtInMetadata';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	themeId: number;
	noteId: string;
	onBack: ()=> void;
	customCss: string;
	scrollbarSize: ScrollbarSize;
}

const useNoteContent = (
	viewerRef: RefObject<NoteViewerControl>,
	currentRevId: string,
	revisions: RevisionEntity[],
	themeId: number,
	customCss: string,
	scrollbarSize: ScrollbarSize,
) => {
	const [note, setNote] = useState<NoteEntity>(null);

	const markupToHtml = useMarkupToHtml({
		themeId,
		customCss,
		plugins: {},
		whiteBackgroundNoteRendering: false,
		scrollbarSize,
	});

	useAsyncEffect(async (event) => {
		if (!revisions.length || !currentRevId) {
			setNote(null);
		} else {
			const revIndex = BaseModel.modelIndexById(revisions, currentRevId);
			const note = await RevisionService.instance().revisionNote(revisions, revIndex);
			if (!note || event.cancelled) return;
			setNote(note);
		}
	}, [revisions, currentRevId, themeId, customCss, viewerRef]);

	useQueuedAsyncEffect(async () => {
		const noteBody = note?.body ?? _('This note has no history');
		const markupLanguage = note?.markup_language ?? MarkupLanguage.Markdown;
		const result = await markupToHtml(markupLanguage, noteBody, {
			resources: await shared.attachedResources(noteBody),
			whiteBackgroundNoteRendering: markupLanguage === MarkupLanguage.Html,
		});

		viewerRef.current.setHtml(result.html, {
			pluginAssets: result.pluginAssets,
		});
	}, [note, viewerRef]);

	return note;
};

const NoteRevisionViewerComponent: React.FC<Props> = ({ themeId, noteId, onBack, customCss, scrollbarSize }) => {
	const helpButton_onClick = useCallback(() => {}, []);
	const viewerRef = useRef<NoteViewerControl|null>(null);
	const revisionListRef = useRef<HTMLSelectElement|null>(null);

	const [revisions, setRevisions] = useState<RevisionEntity[]>([]);
	const [currentRevId, setCurrentRevId] = useState('');
	const [restoring, setRestoring] = useState(false);

	const note = useNoteContent(viewerRef, currentRevId, revisions, themeId, customCss, scrollbarSize);

	const viewer_domReady = useCallback(async () => {
		// this.viewerRef_.current.openDevTools();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);

		setRevisions(revisions);
		setCurrentRevId(revisions.length ? revisions[revisions.length - 1].id : '');
	}, [noteId]);

	const importButton_onClick = useCallback(async () => {
		if (!note) return;
		setRestoring(true);
		await RevisionService.instance().importRevisionNote(note);
		setRestoring(false);
		await shim.showMessageBox(RevisionService.instance().restoreSuccessMessage(note), { type: MessageBoxType.Info });
	}, [note]);

	const backButton_click = useCallback(() => {
		if (onBack) onBack();
	}, [onBack]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const revisionList_onChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback((event) => {
		const value = event.target.value;

		if (!value) {
			if (onBack) onBack();
		} else {
			setCurrentRevId(value);
		}
	}, [onBack]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const webview_ipcMessage = useCallback(async (event: any) => {
		// For the revision view, we only support a minimal subset of the IPC messages.
		// For example, we don't need interactive checkboxes or sync between viewer and editor view.
		// We try to get most links work though, except for internal (joplin://) links.

		const msg = event.channel ? event.channel : '';
		// const args = event.args;

		// if (msg !== 'percentScroll') console.info(`Got ipc-message: ${msg}`, args);

		try {
			if (msg.indexOf('joplin://') === 0) {
				throw new Error(_('Unsupported link or message: %s', msg));
			} else if (urlUtils.urlProtocol(msg)) {
				await bridge().openExternal(msg);
			} else if (msg.indexOf('#') === 0) {
				// This is an internal anchor, which is handled by the WebView so skip this case
			} else {
				console.warn(`Unsupported message in revision view: ${msg}`);
			}
		} catch (error) {
			console.warn(error);
			bridge().showErrorMessageBox(error.message);
		}
	}, []);

	const theme = themeStyle(themeId);

	const revisionListItems = [];
	const revs = revisions.slice().reverse();
	for (let i = 0; i < revs.length; i++) {
		const rev = revs[i];
		const stats = Revision.revisionPatchStatsText(rev);

		revisionListItems.push(
			<option key={rev.id} value={rev.id}>
				{`${time.formatMsToLocal(rev.item_updated_time)} (${stats})`}
			</option>,
		);
	}

	const restoreButtonTitle = _('Restore');
	const helpMessage = _('Click "%s" to restore the note. It will be copied in the notebook named "%s". The current version of the note will not be replaced or modified.', restoreButtonTitle, RevisionService.instance().restoreFolderTitle());

	const titleInput = (
		<div className='revision-viewer-title'>
			<button onClick={backButton_click} style={{ ...theme.buttonStyle, marginRight: 10, height: theme.inputStyle.height }}>
				<i style={theme.buttonIconStyle} className={'fa fa-chevron-left'}></i>{_('Back')}
			</button>
			<input readOnly type="text" className='title' style={theme.inputStyle} value={note?.title ?? ''} />
			<select disabled={!revisions.length} value={currentRevId} className='revisions' style={theme.dropdownList} onChange={revisionList_onChange} ref={revisionListRef}>
				{revisionListItems}
			</select>
			<button disabled={!revisions.length || restoring} onClick={importButton_onClick} className='restore'style={{ ...theme.buttonStyle, marginLeft: 10, height: theme.inputStyle.height }}>
				{restoreButtonTitle}
			</button>
			<HelpButton tip={helpMessage} id="noteRevisionHelpButton" onClick={helpButton_onClick} />
		</div>
	);

	const viewer = <NoteTextViewer themeId={themeId} viewerStyle={{ display: 'flex', flex: 1, borderLeft: 'none' }} ref={viewerRef} onDomReady={viewer_domReady} onIpcMessage={webview_ipcMessage} />;

	useEffect(() => {
		// We need to force focus here because otherwise the focus is lost and goes back
		// to the start of the document. See https://github.com/laurent22/joplin/pull/11769
		focus('NoteRevisionViewer', revisionListRef.current);
	}, [revisionListRef, revisions]);

	return (
		<div className='revision-viewer-root'>
			{titleInput}
			{viewer}
			<ReactTooltip place="bottom" delayShow={300} className="help-tooltip" />
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		scrollbarSize: state.settings['style.scrollbarSize'],
	};
};

const NoteRevisionViewer = connect(mapStateToProps)(NoteRevisionViewerComponent);

export default NoteRevisionViewer;
