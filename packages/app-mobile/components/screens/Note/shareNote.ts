import FsDriverBase from '@joplin/lib/fs-driver-base';
import { _ } from '@joplin/lib/locale';
import markupLanguageUtils from '@joplin/lib/markupLanguageUtils';
import Setting from '@joplin/lib/models/Setting';
import { friendlySafeFilename } from '@joplin/lib/path-utils';
import { NoteEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import Logger from '@joplin/utils/Logger';
const { dialogs } = require('../../../utils/dialogs.js');
import { printToFileAsync } from 'expo-print';
import { Share } from 'react-native';
import ExtendedShare from 'react-native-share';

const logger = Logger.create('shareNote');

const shareNote = async (note: NoteEntity, noteResources: any, dialogbox: any) => {
	const markdownId = 'markdown';
	const pdfId = 'pdf';
	const actions = [
		{ text: _('Markdown'), id: markdownId },
		{ text: _('PDF'), id: pdfId },
	];
	const action = await dialogs.pop({ dialogbox }, _('Share as:'), actions);

	logger.info(`Sharing note ${note.id} as ${action}`);

	if (action === markdownId) {
		await Share.share({
			message: `${note.title}\n\n${note.body}`,
			title: note.title,
		});
	} else if (action === pdfId) {
		const markupToHtml = markupLanguageUtils.newMarkupToHtml(undefined, {
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});
		const renderResult = await markupToHtml.render(
			note.markup_language,
			note.body,
			themeStyle(Setting.THEME_LIGHT),
			{
				resources: noteResources,
			},
		);

		const html = renderResult.html;
		const savedPdf = await printToFileAsync({ html });
		const pdfUri = savedPdf.uri;

		logger.debug(`Saved PDF to ${pdfUri}. Now sharing...`);
		await ExtendedShare.open({
			type: 'application/pdf',
			filename: friendlySafeFilename(note.title),
			url: savedPdf.uri,
			failOnCancel: false,
		});

		logger.debug('Shared. Removing saved PDF.');
		const fsDriver: FsDriverBase = await shim.fsDriver();
		await fsDriver.remove(pdfUri);
	}
};

export default shareNote;
