import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { ModelType } from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import Logger from '@joplin/utils/Logger';
import { Mode } from '../../../plugins/GotoAnything';
import { GotoAnythingOptions, UiType } from './gotoAnything';
import { parseWhiteboard } from '@joplin/lib/services/whiteboard/parse';
import { serializeWhiteboard } from '@joplin/lib/services/whiteboard/serialize';
import { CanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';

const logger = Logger.create('addNoteToWhiteboard');

const generateId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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

			const target = await Note.load(targetId);
			if (!target) return;

			const parsed = parseWhiteboard(target.body || '');
			if (!parsed.hasCanvas) {
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
			const newBody = serializeWhiteboard(target.body || '', nextCanvas);
			await Note.save({ id: targetId, body: newBody });
		},
		enabledCondition: 'oneNoteSelected && noteIsWhiteboard && !noteIsReadOnly',
	};
};
