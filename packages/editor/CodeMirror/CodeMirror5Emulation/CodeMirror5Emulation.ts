import { EditorView, ViewPlugin, ViewUpdate, showPanel } from '@codemirror/view';
import { Extension, Text, Transaction } from '@codemirror/state';
import getScrollFraction from '../getScrollFraction';
import { CodeMirror as BaseCodeMirror5Emulation, Vim } from '@replit/codemirror-vim';
import { LogMessageCallback } from '../../types';
import editorCommands from '../editorCommands/editorCommands';
import { StateEffect } from '@codemirror/state';
import { StreamParser } from '@codemirror/language';
import Decorator, { LineWidgetOptions, MarkTextOptions } from './Decorator';
import insertLineAfter from '../editorCommands/insertLineAfter';
import CodeMirror5BuiltInOptions from './CodeMirror5BuiltInOptions';
const { pregQuote } = require('@joplin/lib/string-utils-common');


type CodeMirror5Command = (codeMirror: CodeMirror5Emulation)=> void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type EditorEventCallback = (editor: CodeMirror5Emulation, ...args: any[])=> void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type OptionUpdateCallback = (editor: CodeMirror5Emulation, newVal: any, oldVal: any)=> void;

type OverlayType<State> = StreamParser<State>|{ query: RegExp };

interface CodeMirror5OptionRecord {
	onUpdate: OptionUpdateCallback;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
}

interface DocumentPosition {
	line: number;
	ch: number;
}

interface DocumentPositionRange {
	from: DocumentPosition;
	to: DocumentPosition;
}

const clampPositionToDoc = (doc: Text, pos: number) => {
	return Math.min(Math.max(0, pos), doc.length);
};

const documentPositionFromPos = (doc: Text, pos: number): DocumentPosition => {
	const line = doc.lineAt(pos);
	return {
		// CM 5 uses 0-based line numbering
		line: line.number - 1,
		ch: pos - line.from,
	};
};

const posFromDocumentPosition = (doc: Text, pos: DocumentPosition) => {
	const line = doc.line(pos.line + 1);
	const result = line.from + pos.ch;

	if (!Number.isInteger(result)) {
		throw new Error(`Document position ${result} (${pos.line}:${pos.ch}) is not an integer`);
	}
	return result;
};

export default class CodeMirror5Emulation extends BaseCodeMirror5Emulation {
	private _events: Record<string, EditorEventCallback[]> = {};
	private _options: Record<string, CodeMirror5OptionRecord> = Object.create(null);
	private _decorator: Decorator;
	private _decoratorExtension: Extension;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private _userExtensions: Record<string, any> = Object.create(null);
	private _builtInOptions: CodeMirror5BuiltInOptions;

	// Used by some plugins to store state.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public state: Record<string, any> = Object.create(null);

	public Vim = Vim;

	// Passed as initial state to plugins
	public Init = { toString: () => 'CodeMirror.Init' };

	public constructor(
		public editor: EditorView,
		private logMessage: LogMessageCallback,
	) {
		super(editor);

		const { decorator, extension: decoratorExtension } = Decorator.create(editor);
		this._decorator = decorator;
		this._decoratorExtension = decoratorExtension;
		this._builtInOptions = new CodeMirror5BuiltInOptions(editor);

		editor.dispatch({
			effects: StateEffect.appendConfig.of(this.makeCM6Extensions()),
		});
	}

	private makeCM6Extensions() {
		const cm5 = this;
		const editor = this.editor;

		return [
			// Fires events
			EditorView.domEventHandlers({
				scroll: () => CodeMirror5Emulation.signal(this, 'scroll'),
				focus: () => CodeMirror5Emulation.signal(this, 'focus'),
				paste: event => CodeMirror5Emulation.signal(this, 'paste', event),
				blur: () => CodeMirror5Emulation.signal(this, 'blur'),
				mousedown: event => CodeMirror5Emulation.signal(this, 'mousedown', event),
			}),
			ViewPlugin.fromClass(class {
				public update(update: ViewUpdate) {
					try {
						if (update.viewportChanged) {
							CodeMirror5Emulation.signal(
								cm5,
								'viewportChange',
								editor.viewport.from,
								editor.viewport.to,
							);
						}

						if (update.docChanged) {
							cm5.fireChangeEvents(update);
							cm5.onChange(update);
						}

						if (update.selectionSet) {
							cm5.onSelectionChange();
						}

						CodeMirror5Emulation.signal(cm5, 'update');
					// Catch the error -- otherwise, CodeMirror will de-register the update listener.
					} catch (error) {
						cm5.logMessage(`Error dispatching update: ${error}`);
					}
				}
			}),

			// Decorations
			this._decoratorExtension,

			// Some plugins rely on a CodeMirror-measure element
			// to store temporary content.
			showPanel.of(() => {
				const dom = document.createElement('div');
				dom.classList.add('CodeMirror-measure');

				// Make invisible, but still measurable
				dom.style.visibility = 'hidden';
				dom.style.pointerEvents = 'none';
				dom.style.height = '0';
				dom.style.overflow = 'auto';

				return { dom };
			}),

			// Allows legacy CM5 CSS to apply to the editor:
			EditorView.editorAttributes.of({ class: 'CodeMirror' }),
		];
	}

	private isEventHandledBySuperclass(eventName: string) {
		return ['beforeSelectionChange'].includes(eventName);
	}

	public on(eventName: string, callback: EditorEventCallback) {
		if (this.isEventHandledBySuperclass(eventName)) {
			return super.on(eventName, callback);
		}
		this._events[eventName] ??= [];
		this._events[eventName].push(callback);
	}

	public off(eventName: string, callback: EditorEventCallback) {
		if (!(eventName in this._events)) {
			return;
		}

		this._events[eventName] = this._events[eventName].filter(
			otherCallback => otherCallback !== callback,
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static signal(target: CodeMirror5Emulation, eventName: string, ...args: any[]) {
		const listeners = target._events[eventName] ?? [];

		for (const listener of listeners) {
			listener(target, ...args);
		}

		super.signal(target, eventName, ...args);
	}

	private fireChangeEvents(update: ViewUpdate) {
		type ChangeRecord = {
			from: DocumentPosition;
			to: DocumentPosition;
			text: string[];
			removed: string[];
			transaction: Transaction;
		};
		const changes: ChangeRecord[] = [];
		const origDoc = update.startState.doc;

		for (const transaction of update.transactions) {
			transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted: Text) => {
				changes.push({
					from: documentPositionFromPos(origDoc, fromA),
					to: documentPositionFromPos(origDoc, toA),
					text: inserted.sliceString(0).split('\n'),
					removed: origDoc.sliceString(fromA, toA).split('\n'),
					transaction,
				});
			});
		}

		// Delay firing events -- event listeners may try to create transactions.
		// (this is done by the rich markdown plugin).
		setTimeout(() => {
			for (const change of changes) {
				CodeMirror5Emulation.signal(this, 'change', change);

				// If triggered by a user, also send the inputRead event
				if (change.transaction.isUserEvent('input')) {
					CodeMirror5Emulation.signal(this, 'inputRead', change);
				}
			}

			CodeMirror5Emulation.signal(this, 'changes', changes);
		}, 0);

	}

	// codemirror-vim's adapter doesn't match the CM5 docs -- wrap it.
	public getCursor(mode?: 'head' | 'anchor' | 'from' | 'to'| 'start' | 'end') {
		if (mode === 'from') {
			mode = 'start';
		}
		if (mode === 'to') {
			mode = 'end';
		}

		return super.getCursor(mode);
	}

	public override getSearchCursor(query: RegExp|string, pos?: DocumentPosition|null|0) {
		// The superclass CodeMirror adapter only supports regular expression
		// arguments.
		if (typeof query === 'string') {
			query = new RegExp(pregQuote(query));
		}
		return super.getSearchCursor(query, pos || { line: 0, ch: 0 });
	}

	public lineAtHeight(height: number, _mode?: 'local') {
		const lineInfo = this.editor.lineBlockAtHeight(height);

		// - 1: Convert to zero-based.
		const lineNumber = this.editor.state.doc.lineAt(lineInfo.to).number - 1;
		return lineNumber;
	}

	public heightAtLine(lineNumber: number, mode?: 'local') {
		// CodeMirror 5 uses 0-based line numbers. CM6 uses 1-based
		// line numbers.
		const doc = this.editor.state.doc;
		const lineInfo = doc.line(Math.min(lineNumber + 1, doc.lines));
		const lineBlock = this.editor.lineBlockAt(lineInfo.from);

		const height = lineBlock.top;
		if (mode === 'local') {
			const editorTop = this.editor.lineBlockAt(0).top;
			return height - editorTop;
		} else {
			return height;
		}
	}

	public lineInfo(lineNumber: number) {
		const line = this.editor.state.doc.line(lineNumber + 1);

		const result = {
			line: lineNumber,

			// Note: In CM5, a line handle is not just a line number
			handle: lineNumber,

			text: line.text,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			gutterMarkers: [] as any[],
			textClass: ['cm-line', ...this._decorator.getLineClasses(lineNumber)],
			bgClass: '',
			wrapClass: '',
			widgets: this._decorator.getLineWidgets(lineNumber),
		};

		return result;
	}

	public getStateAfter(_line: number) {
		// TODO: Should return parser state. Returning an empty object
		//       allows some plugins to run without crashing, however.
		return {};
	}

	public getScrollPercent() {
		return getScrollFraction(this.editor);
	}

	// CodeMirror-Vim's scrollIntoView only supports pos as a DocumentPosition.
	public override scrollIntoView(
		pos: DocumentPosition|DocumentPositionRange, margin?: number,
	): void {
		const isPosition = (arg: unknown): arg is DocumentPosition => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			return (arg as any).line !== undefined && (arg as any).ch !== undefined;
		};

		if (isPosition(pos)) {
			return super.scrollIntoView(pos, margin);
		} else {
			return super.scrollIntoView(pos.from, margin);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public defineExtension(name: string, value: any) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(CodeMirror5Emulation.prototype as any)[name] = value;
		this._userExtensions[name] = value;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public defineOption(name: string, defaultValue: any, onUpdate: OptionUpdateCallback) {
		this._options[name] = {
			value: defaultValue,
			onUpdate,
		};
		onUpdate(this, defaultValue, this.Init);
	}

	// Override codemirror-vim's setOption to allow user-defined options
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override setOption(name: string, value: any) {
		if (name in this._options) {
			const oldValue = this._options[name].value;
			this._options[name].value = value;
			this._options[name].onUpdate(this, value, oldValue);
		} else if (this._builtInOptions.supportsOption(name)) {
			this._builtInOptions.setOption(name, value);
		} else {
			super.setOption(name, value);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override getOption(name: string): any {
		if (name in this._options) {
			return this._options[name].value;
		} else {
			return super.getOption(name);
		}
	}

	public override coordsChar(coords: { left: number; top: number }, mode?: 'div' | 'local'): DocumentPosition {
		// codemirror-vim's API only supports "div" mode. Thus, we convert
		// local to div:
		if (mode !== 'div') {
			const bbox = this.editor.contentDOM.getBoundingClientRect();
			coords = {
				left: coords.left - bbox.left,
				top: coords.top - bbox.top,
			};
		}

		return super.coordsChar(coords, 'div');
	}

	// codemirror-vim's API doesn't match the API docs here -- it expects addOverlay
	// to return a SearchQuery. As such, this override returns "any".
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override addOverlay<State>(modeObject: OverlayType<State>): any {
		if ('query' in modeObject) {
			return super.addOverlay(modeObject);
		}

		return this._decorator.addOverlay(modeObject);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override removeOverlay(overlay?: OverlayType<any>): void {
		super.removeOverlay(overlay);
		this._decorator.removeOverlay(overlay);
	}

	public addLineClass(lineNumber: number, where: string, className: string) {
		this._decorator.addLineClass(lineNumber, where, className);
	}

	public removeLineClass(lineNumber: number, where: string, className: string) {
		this._decorator.removeLineClass(lineNumber, where, className);
	}

	public addLineWidget(lineNumber: number, node: HTMLElement, options: LineWidgetOptions) {
		return this._decorator.addLineWidget(lineNumber, node, options);
	}

	public addWidget(pos: DocumentPosition, node: HTMLElement) {
		if (node.parentElement) {
			node.remove();
		}

		const loc = posFromDocumentPosition(this.editor.state.doc, pos);
		const screenCoords = this.editor.coordsAtPos(loc);
		const bbox = this.editor.contentDOM.getBoundingClientRect();

		node.style.position = 'absolute';

		const left = screenCoords.left - bbox.left;
		node.style.left = `${left}px`;
		node.style.maxWidth = `${bbox.width - left}px`;
		node.style.top = `${screenCoords.top + this.editor.scrollDOM.scrollTop}px`;

		this.editor.scrollDOM.appendChild(node);
	}

	public markText(from: DocumentPosition, to: DocumentPosition, options?: MarkTextOptions) {
		const doc = this.editor.state.doc;

		return this._decorator.markText(
			clampPositionToDoc(doc, posFromDocumentPosition(doc, from)),
			clampPositionToDoc(doc, posFromDocumentPosition(doc, to)),
			options,
		);
	}

	public getDoc() {
		// The emulation layer has several of the methods available on a CodeMirror 5 document.
		// For some plugins, `this` is sufficient.
		return this;
	}

	public static commands = (() => {
		const commands: Record<string, CodeMirror5Command> = {
			...BaseCodeMirror5Emulation.commands,

			vimInsertListElement: (codeMirror: BaseCodeMirror5Emulation) => {
				insertLineAfter(codeMirror.cm6);
				Vim.handleKey(codeMirror, 'i', 'macro');
			},
		};

		for (const commandName in editorCommands) {
			const command = editorCommands[commandName as keyof typeof editorCommands];

			commands[commandName] = (codeMirror: BaseCodeMirror5Emulation) => command(codeMirror.cm6);
		}

		// as any: Required to properly extend the base class -- without this,
		// the commands dictionary isn't known (by TypeScript) to have the same
		// properties as the commands dictionary in the parent class.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return commands as any;
	})();

	public commands = CodeMirror5Emulation.commands;

	private joplinCommandToCodeMirrorCommand(commandName: string): string|null {
		const match = /^editor\.(.*)$/g.exec(commandName);

		if (!match || !(match[1] in CodeMirror5Emulation.commands)) {
			return null;
		}

		return match[1] as string;
	}

	public supportsJoplinCommand(commandName: string): boolean {
		return this.joplinCommandToCodeMirrorCommand(commandName) in CodeMirror5Emulation.commands;
	}

	public execJoplinCommand(joplinCommandName: string) {
		const commandName = this.joplinCommandToCodeMirrorCommand(joplinCommandName);

		if (commandName === null) {
			this.logMessage(`Unsupported Joplin command, ${joplinCommandName}`);
			return;
		}

		if (this.commandExists(commandName)) {
			return this.execCommand(commandName);
		}
	}

	public commandExists(commandName: string) {
		return commandName in CodeMirror5Emulation.commands || typeof this._userExtensions[commandName] === 'function';
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public execCommand(name: string, ...args: any[]) {
		if (!this.commandExists(name)) {
			this.logMessage(`Unsupported CodeMirror command, ${name}`);
			return;
		}

		if (name in CodeMirror5Emulation.commands) {
			return CodeMirror5Emulation.commands[name as (keyof typeof CodeMirror5Emulation.commands)](this);
		} else if (typeof this._userExtensions[name] === 'function') {
			return this._userExtensions[name].call(this, ...args);
		}
	}
}

