import { hasOwnProperty } from '@joplin/utils/object';
import { _, _n } from '../../../locale';
import { NoteContext, ToolDefinition, ToolError, ToolInput } from './types';
import { EditorToolContext } from './types';
const Countable = require('../../../countable/Countable');
import buildTool from './utils/buildTool';
import Logger from '@joplin/utils/Logger';
import { applyAnchorEdits, supportedStructuredBlockTags } from './utils/applyNoteEdits';
import findFencedBlock from '../utils/findFencedBlock';

const logger = Logger.create('buildEditorTools');

export type EditOp =
	| { op: 'replaceSelection'; text: string }
	| { op: 'insertBefore'; anchor: string; text: string }
	| { op: 'insertAfter'; anchor: string; text: string }
	| { op: 'appendToNote'; text: string }
	| { op: 'replaceRange'; anchor: string; text: string }
	| { op: 'replaceFencedBlock'; tag: string; text: string }
;

const knownOps = new Set<EditOp['op']>([
	'replaceSelection', 'insertBefore', 'insertAfter', 'appendToNote', 'replaceRange', 'replaceFencedBlock',
]);

// Tools that make changes to the current note body
const isValidEditOp = (operation: string): operation is EditOp['op'] => {
	return knownOps.has(operation as EditOp['op']);
};

// Tools that interact with the editor
export const isEditorToolCall = (toolId: string) => {
	if (!toolId.startsWith('editor.')) return false;
	toolId = toolId.replace(/^editor\./, '');
	return isValidEditOp(toolId) || toolId === 'readNote';
};

const toolCallToEditOperation = (operationId: EditOp['op'], args: ToolInput): EditOp => {
	return {
		op: operationId,
		...('text' in args && typeof args.text === 'string' ? { text: args.text } : {}),
		...('anchor' in args && typeof args.anchor === 'string' ? { anchor: args.anchor } : {}),
		...('tag' in args && typeof args.tag === 'string' ? { tag: args.tag } : {}),
	} as EditOp;
};

const countWords = (text: string): number => Countable.countOnce(text, { stripTags: true }).words;

const describeEditOperation = (editOp: EditOp) => {
	const describeWordsAdded = (count: number) => _n('Added %d word', 'Added %d words', count, count);
	const describeWordsRemoved = (count: number) => _n('Removed %d word', 'Removed %d words', count, count);

	let actionDescription;
	if (editOp.op === 'replaceRange') {
		actionDescription = [
			describeWordsRemoved(countWords(editOp.anchor)),
			describeWordsAdded(countWords(editOp.text)),
		].join('\n');
	} else if (editOp.op === 'replaceFencedBlock') {
		actionDescription = _('Updated %s block', editOp.tag);
	} else if (editOp.op === 'replaceSelection') {
		actionDescription = _('Replaced selection');
	} else {
		actionDescription = describeWordsAdded(countWords(editOp.text));
	}
	return actionDescription;
};

const hasStructuredBlock = (note: NoteContext) => {
	return supportedStructuredBlockTags.some(tag => !!findFencedBlock(note.body, tag, 0));
};

const buildEditorTools = ({ note, commands }: EditorToolContext) => {
	const result: ToolDefinition[] = [];
	const addSelectionOperations = () => {
		result.push(buildTool({
			id: 'editor.replaceSelection',
			userDescription: (_input: ToolInput, output: string) => output,
			description: 'Replaces the text currently selected by the user.',
			inputSchema: {
				type: 'object',
				properties: {
					text: { type: 'string' },
				},
				required: ['text'],
				additionalProperties: false,
			},
			handler: async (args: ToolInput) => {
				if (!hasOwnProperty(args, 'text') || typeof args.text !== 'string') {
					throw new ToolError('missing or invalid `text` property');
				} else {
					try {
						await commands.replaceSelection(args.text, note.selection);
					} catch (error) {
						logger.error(error.message ?? String(error));
						throw new ToolError('failed to replace selection');
					}
					return describeEditOperation({ op: 'replaceSelection', text: args.text });
				}
			},
		}));
	};

	const addEditOperations = () => {
		const buildEditTool = (id: EditOp['op']) => ({
			id: `editor.${id}`,
			userDescription: (args: ToolInput) => (
				describeEditOperation(toolCallToEditOperation(id, args))
			),
			handler: async (args: ToolInput) => {
				const editOperation = toolCallToEditOperation(id, args);
				const { newBody, appliedEdits } = applyAnchorEdits(note.body, [editOperation], 0);
				await commands.updateNoteBody(newBody, note.body);

				if (appliedEdits.length !== 1) {
					throw new Error(`Invalid state: Wrong number of applied edits, ${appliedEdits.length}`);
				}

				const edit = appliedEdits[0];
				if (edit.status === 'applied') {
					return describeEditOperation(editOperation);
				} else {
					throw new ToolError(edit.status);
				}
			},
		});

		result.push(
			{
				...buildEditTool('appendToNote'),
				description: 'Adds text to the end of the current note: Text is always added to the end of the note. This tool does not require an anchor.',
				inputSchema: {
					type: 'object',
					properties: {
						text: { type: 'string' },
					},
					required: ['text'],
					additionalProperties: false,
				},
			},
		);

		const anchoredSchema = (anchorDescription: string, textDescription: string) => ({
			type: 'object',
			properties: {
				anchor: { type: 'string', description: anchorDescription },
				text: { type: 'string', description: textDescription },
			},
			required: ['anchor', 'text'],
			additionalProperties: false,
		});
		result.push(
			{
				...buildEditTool('insertBefore'),
				description: 'Add text before an `anchor` in the current note: Insert text immediately before the first occurrence of `anchor`.',
				inputSchema: anchoredSchema(
					'Text to find',
					'What to insert just **before** the found text',
				),
			},
			{
				...buildEditTool('insertAfter'),
				description: 'Add text after an `anchor` in the current note: Inserts text immediately after the first occurrence of `anchor` in the current note.',
				inputSchema: anchoredSchema(
					'Text to find',
					'What to insert just **after** the found text',
				),
			},
			{
				...buildEditTool('replaceRange'),
				description: 'Remove or replace text in the current note: Replaces the first occurrence of `anchor` with `text`.',
				inputSchema: anchoredSchema(
					'The text to replace',
					'What to replace it with',
				),
			},
		);

		const hasFencedBlock = hasStructuredBlock(note);
		if (hasFencedBlock) {
			result.push({
				...buildEditTool('replaceFencedBlock'),
				description: [
					'Replaces the inner content of the first ```<tag>``` fenced block in the current note.',
					`"text" is the new content inside the fence (no fence markers). Supported tags: ${supportedStructuredBlockTags.join(', ')}.`,
					'Use appendToNote to create a new fenced block.',
				].join(' '),
				inputSchema: {
					type: 'object',
					properties: {
						tag: {
							type: 'string',
							enum: supportedStructuredBlockTags,
						},
						text: {
							type: 'string',
							description: 'The new content for the block content. Should not include the fenced block delimiters.',
						},
					},
					required: ['tag', 'text'],
					additionalProperties: false,
				},
			});
		}
	};
	const addReadOperation = () => {
		result.push(
			{
				id: 'editor.readNote',
				// Always enabled in the editor context:
				enabled: true,
				userDescription: () => _('Read note'),
				description: 'Get the current, up-to-date content of the note. This returns the full content of the note that\'s currently open in Joplin\'s editor.',
				inputSchema: {
					type: 'object',
					required: [],
					additionalProperties: false,
				},
				handler: () => {
					return Promise.resolve(note.body);
				},
			},
		);
	};

	if (note.selection) {
		addSelectionOperations();
	} else {
		addReadOperation();
		addEditOperations();
	}

	return result;
};

export default buildEditorTools;
