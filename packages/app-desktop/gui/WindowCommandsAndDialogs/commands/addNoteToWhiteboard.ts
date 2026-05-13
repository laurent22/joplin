import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { ModelType } from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import ItemChange from '@joplin/lib/models/ItemChange';
import Logger from '@joplin/utils/Logger';
import { Mode } from '../../../plugins/GotoAnything';
import { GotoAnythingOptions, UiType } from './gotoAnything';
import { parseWhiteboard } from '@joplin/lib/services/whiteboard/parse';
import { serializeWhiteboard } from '@joplin/lib/services/whiteboard/serialize';
import { CanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import generateId from '@joplin/lib/services/whiteboard/generateId';

const logger = Logger.create('addNoteToWhiteboard');

export const declaration: CommandDeclaration = {
	name: 'addNoteToWhiteboard',
	label: () => _('Add note to whiteboard...'),
};

// Adds a note (chosen via Goto Anything) as a card on the currently open
// whiteboard. The whiteboard is the currently selected note — the command is
// only enabled when that note contains a jsoncanvas fence.
export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const targetId = context.state.selectedNoteIds?.[0];
			if (!targetId) return;

			// Quick gate before opening the picker — if the active note isn't
			// a whiteboard, bail out without disturbing the user.
			const initial = await Note.load(targetId);
			if (!initial) return;
			if (!parseWhiteboard(initial.body || '').hasCanvas) {
				logger.warn('Active note is not a whiteboard:', targetId);
				return;
			}

			const options: GotoAnythingOptions = { mode: Mode.TitleOnly };
			const result = await CommandService.instance().execute('gotoAnything', UiType.ControlledApi, options);
			if (!result) return;
			if (result.type !== ModelType.Note) {
				logger.warn('Selected item is not a note:', result);
				return;
			}

			// Reload the note after the picker resolves: between opening the
			// picker and now, the whiteboard editor (or a sync) may have
			// written a newer body, and we want to append onto the freshest
			// persisted state — not the snapshot we read before the prompt.
			const fresh = await Note.load(targetId);
			if (!fresh) return;
			const parsed = parseWhiteboard(fresh.body || '');
			if (!parsed.hasCanvas) {
				logger.warn('Active note is no longer a whiteboard:', targetId);
				return;
			}

			// Place the new card near the centre of the existing layout, with a
			// small offset for each subsequent add so cards don't stack exactly.
			const xs = parsed.canvas.nodes.map(n => n.x + n.width / 2);
			const ys = parsed.canvas.nodes.map(n => n.y + n.height / 2);
			const cx = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
			const cy = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
			const offset = (parsed.canvas.nodes.length % 8) * 24;

			const newNode: CanvasNode = {
				id: generateId(),
				type: 'file',
				x: cx - 120 + offset,
				y: cy - 80 + offset,
				width: 240,
				height: 160,
				file: `:/${result.item.id}`,
			};

			const nextCanvas = {
				...parsed.canvas,
				nodes: [...parsed.canvas.nodes, newNode],
			};
			const newBody = serializeWhiteboard(fresh.body || '', nextCanvas);
			// Pass user_updated_time so the save layer can detect concurrent
			// edits (the whiteboard editor's own debounced save, or a sync
			// write between Note.load above and Note.save here). Mirrors the
			// linked-note write path in FileNode.tsx.
			await Note.save(
				{
					id: targetId,
					body: newBody,
					...(fresh.user_updated_time ? { user_updated_time: fresh.user_updated_time } : {}),
				},
				{ changeSource: ItemChange.SOURCE_UNSPECIFIED },
			);
		},
		enabledCondition: 'oneNoteSelected && activeNoteIsWhiteboard && !noteIsReadOnly',
	};
};
