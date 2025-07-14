import { useCallback, useRef } from 'react';
import bridge from '../../../services/bridge';
import InteropServiceHelper, { SourceType } from '../../../InteropServiceHelper';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { msleep } from '@joplin/utils/time';
import getPageSize from '@joplin/lib/services/ocr/utils/getPageSize';

let isPrinting = false;

interface Props {
	customCss: string;
	plugins: PluginStates;
	editorNoteStatuses: Record<string, string>;
}

interface PrintOptions {
	path?: string;
	id: string;
	sourceType: SourceType;
}

const determinePageSize = async (id: string, sourceType: SourceType) => {
	if (sourceType === 'pdf') return getPageSize(id);
	return Setting.value('export.pdfPageSize');
};

export type PrintCallback = (target: string, options: PrintOptions)=> Promise<void>;

const usePrintToCallback = (props: Props): PrintCallback => {
	const noteStatusesRef = useRef(props.editorNoteStatuses);
	noteStatusesRef.current = props.editorNoteStatuses;

	const waitForNoteToSaved = useCallback(async (noteId: string) => {
		while (noteId && noteStatusesRef.current[noteId] === 'saving') {
			// eslint-disable-next-line no-console -- Old code from before rule was applied
			console.info('Waiting for note to be saved...', noteStatusesRef.current);
			await msleep(100);
		}
	}, []);

	return useCallback(async (target, options) => {
		// Concurrent print calls are disallowed to avoid incorrect settings being restored upon completion
		if (isPrinting) {
			// eslint-disable-next-line no-console -- Old code from before rule was applied
			console.info(`Printing ${options.path ?? options.id} to ${target} disallowed, already printing.`);
			return;
		}

		isPrinting = true;

		// Need to wait for save because the interop service reloads the note from the database
		await waitForNoteToSaved(options.id);

		if (target === 'pdf') {
			try {
				const pageSize = await determinePageSize(options.id, options.sourceType);

				const pdfData = await InteropServiceHelper.exportToPdf(options.id, options.sourceType, {
					printBackground: true,
					pageSize,
					landscape: Setting.value('export.pdfPageOrientation') === 'landscape',
					customCss: props.customCss,
					plugins: props.plugins,
				});
				await shim.fsDriver().writeFile(options.path, pdfData, 'buffer');
			} catch (error) {
				console.error(error);
				bridge().showErrorMessageBox(error.message);
			}
		} else if (target === 'printer') {
			try {
				await InteropServiceHelper.printNote(options.id, {
					printBackground: true,
					customCss: props.customCss,
				});
			} catch (error) {
				console.error(error);
				bridge().showErrorMessageBox(error.message);
			}
		}
		isPrinting = false;
	}, [props.plugins, waitForNoteToSaved, props.customCss]);
};

export default usePrintToCallback;
