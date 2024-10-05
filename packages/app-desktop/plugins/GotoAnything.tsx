import * as React from 'react';
import { AppState } from '../app.reducer';
import CommandService, { SearchResult as CommandSearchResult } from '@joplin/lib/services/CommandService';
import KeymapService from '@joplin/lib/services/KeymapService';
const { connect } = require('react-redux');
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import SearchEngine, { ComplexTerm } from '@joplin/lib/services/search/SearchEngine';
import gotoAnythingStyleQuery from '@joplin/lib/services/search/gotoAnythingStyleQuery';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import Tag from '@joplin/lib/models/Tag';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import ItemList from '../gui/ItemList';
import HelpButton from '../gui/HelpButton';
import { surroundKeywords, nextWhitespaceIndex, removeDiacritics } from '@joplin/lib/string-utils';
import { mergeOverlappingIntervals } from '@joplin/lib/ArrayUtils';
import markupLanguageUtils from '../utils/markupLanguageUtils';
import focusEditorIfEditorCommand from '@joplin/lib/services/commands/focusEditorIfEditorCommand';
import Logger from '@joplin/utils/Logger';
import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import Resource from '@joplin/lib/models/Resource';
import { NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
import Dialog from '../gui/Dialog';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';

const logger = Logger.create('GotoAnything');

const PLUGIN_NAME = 'gotoAnything';

interface GotoAnythingSearchResult {
	id: string;
	title: string;
	parent_id: string;
	fields: string[];
	fragments?: string;
	path?: string;
	type?: number;
	item_id?: string;
	item_type?: ModelType;
}

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	folders: any[];
	showCompletedTodos: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	userData: any;
}

interface State {
	query: string;
	results: GotoAnythingSearchResult[];
	selectedItemId: string;
	keywords: string[];
	listType: number;
	showHelp: boolean;
	resultsInBody: boolean;
	commandArgs: string[];
}

interface CommandQuery {
	name: string;
	args: string[];
}

const getContentMarkupLanguageAndBody = (result: GotoAnythingSearchResult, notesById: Record<string, NoteEntity>, resources: ResourceEntity[]) => {
	if (result.item_type === ModelType.Resource) {
		const resource = resources.find(r => r.id === result.item_id);
		if (!resource) {
			logger.warn('Could not find resources associated with result:', result);
			return { markupLanguage: MarkupLanguage.Markdown, content: '' };
		} else {
			return { markupLanguage: MarkupLanguage.Markdown, content: resource.ocr_text };
		}
	} else { // a note
		const note = notesById[result.id];
		return { markupLanguage: note.markup_language, content: note.body };
	}
};

// A result row contains an `id` property (the note ID) and, if the current row
// is a resource, an `item_id` property, which is the resource ID. In that case,
// the row also has an `id` property, which is the note that contains the
// resource.
//
// It means a result set may include multiple results with the same `id`
// property, if it contains one or more resources that are in a note that's
// already in the result set. For that reason, when we need a unique ID for the
// result, we use this function - which returns either the item_id, if present,
// or the note ID.
const getResultId = (result: GotoAnythingSearchResult) => {
	// This ID used as a DOM ID for accessibility purposes, so it is prefixed to prevent
	// name collisions.
	return `goto-anything-result-${result.item_id ? result.item_id : result.id}`;
};

const itemListId = 'goto-anything-item-list';

class GotoAnything {

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public dispatch: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static Dialog: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static manifest: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public onTrigger(event: any) {
		this.dispatch({
			type: 'PLUGINLEGACY_DIALOG_SET',
			open: true,
			pluginName: PLUGIN_NAME,
			userData: event.userData,
		});
	}

}

class DialogComponent extends React.PureComponent<Props, State> {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private styles_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private inputRef: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private itemListRef: any;
	private listUpdateQueue_: AsyncActionQueue;
	private markupToHtml_: MarkupToHtml;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private userCallback_: any = null;

	public constructor(props: Props) {
		super(props);

		const startString = props?.userData?.startString ? props?.userData?.startString : '';

		this.userCallback_ = props?.userData?.callback;
		this.listUpdateQueue_ = new AsyncActionQueue(100);

		this.state = {
			query: startString,
			results: [],
			selectedItemId: null,
			keywords: [],
			listType: BaseModel.TYPE_NOTE,
			showHelp: false,
			resultsInBody: false,
			commandArgs: [],
		};

		this.styles_ = {};

		this.inputRef = React.createRef();
		this.itemListRef = React.createRef();

		this.input_onChange = this.input_onChange.bind(this);
		this.input_onKeyDown = this.input_onKeyDown.bind(this);
		this.renderItem = this.renderItem.bind(this);
		this.listItem_onClick = this.listItem_onClick.bind(this);
		this.helpButton_onClick = this.helpButton_onClick.bind(this);

		if (startString) this.scheduleListUpdate();
	}

	public style() {
		const styleKey = [this.props.themeId, this.state.listType, this.state.resultsInBody ? '1' : '0'].join('-');

		if (this.styles_[styleKey]) return this.styles_[styleKey];

		const theme = themeStyle(this.props.themeId);

		let itemHeight = this.state.resultsInBody ? 84 : 64;

		if (this.state.listType === BaseModel.TYPE_COMMAND) {
			itemHeight = 40;
		}

		this.styles_[styleKey] = {
			dialogBox: { ...theme.dialogBox, minWidth: '50%', maxWidth: '50%' },
			input: { ...theme.inputStyle, flex: 1 },
			row: {
				overflow: 'hidden',
				height: itemHeight,
				display: 'flex',
				justifyContent: 'center',
				flexDirection: 'column',
				paddingLeft: 10,
				paddingRight: 10,
				borderBottomWidth: 1,
				borderBottomStyle: 'solid',
				borderBottomColor: theme.dividerColor,
				boxSizing: 'border-box',
			},
			inputHelpWrapper: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
		};

		delete this.styles_[styleKey].dialogBox.maxHeight;

		const rowTextStyle = {
			fontSize: theme.fontSize,
			color: theme.color,
			fontFamily: theme.fontFamily,
			whiteSpace: 'nowrap',
			opacity: 0.7,
			userSelect: 'none',
		};

		const rowTitleStyle = { ...rowTextStyle, fontSize: rowTextStyle.fontSize * 1.4,
			marginBottom: this.state.resultsInBody ? 6 : 4,
			color: theme.colorFaded };

		const rowFragmentsStyle = { ...rowTextStyle, fontSize: rowTextStyle.fontSize * 1.2,
			marginBottom: this.state.resultsInBody ? 8 : 6,
			color: theme.colorFaded };

		this.styles_[styleKey].rowSelected = { ...this.styles_[styleKey].row, backgroundColor: theme.selectedColor };
		this.styles_[styleKey].rowPath = rowTextStyle;
		this.styles_[styleKey].rowTitle = rowTitleStyle;
		this.styles_[styleKey].rowFragments = rowFragmentsStyle;
		this.styles_[styleKey].itemHeight = itemHeight;

		return this.styles_[styleKey];
	}

	public componentDidMount() {
		this.props.dispatch({
			type: 'VISIBLE_DIALOGS_ADD',
			name: 'gotoAnything',
		});
	}

	public componentWillUnmount() {
		void this.listUpdateQueue_.reset();

		this.props.dispatch({
			type: 'VISIBLE_DIALOGS_REMOVE',
			name: 'gotoAnything',
		});
	}

	private modalLayer_onDismiss = () => {
		this.props.dispatch({
			pluginName: PLUGIN_NAME,
			type: 'PLUGINLEGACY_DIALOG_SET',
			open: false,
		});
	};

	private helpButton_onClick() {
		this.setState({ showHelp: !this.state.showHelp });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private input_onChange(event: any) {
		this.setState({ query: event.target.value });

		this.scheduleListUpdate();
	}

	public scheduleListUpdate() {
		this.listUpdateQueue_.push(() => this.updateList());
	}

	public async keywords(searchQuery: string) {
		const parsedQuery = await SearchEngine.instance().parseQuery(searchQuery);
		return SearchEngine.instance().allParsedQueryTerms(parsedQuery);
	}

	public markupToHtml() {
		if (this.markupToHtml_) return this.markupToHtml_;
		this.markupToHtml_ = markupLanguageUtils.newMarkupToHtml();
		return this.markupToHtml_;
	}

	private parseCommandQuery(query: string): CommandQuery {
		const fullQuery = query;
		const splitted = fullQuery.split(/\s+/);
		return {
			name: splitted.length ? splitted[0] : '',
			args: splitted.slice(1),
		};
	}

	public async updateList() {
		let resultsInBody = false;

		if (!this.state.query) {
			this.setState({ results: [], keywords: [] });
		} else {
			let results: GotoAnythingSearchResult[] = [];
			let listType = null;
			let searchQuery = '';
			let keywords = null;
			let commandArgs: string[] = [];

			if (this.state.query.indexOf(':') === 0) { // COMMANDS
				const commandQuery = this.parseCommandQuery(this.state.query.substr(1));

				listType = BaseModel.TYPE_COMMAND;
				keywords = [commandQuery.name];
				commandArgs = commandQuery.args;

				const commandResults = CommandService.instance().searchCommands(commandQuery.name, true);

				results = commandResults.map((result: CommandSearchResult) => {
					return {
						id: result.commandName,
						title: result.title,
						parent_id: null,
						fields: [],
						type: BaseModel.TYPE_COMMAND,
					};
				});
			} else if (this.state.query.indexOf('#') === 0) { // TAGS
				listType = BaseModel.TYPE_TAG;
				searchQuery = `*${this.state.query.split(' ')[0].substr(1).trim()}*`;
				results = await Tag.searchAllWithNotes({ titlePattern: searchQuery });
			} else if (this.state.query.indexOf('@') === 0) { // FOLDERS
				listType = BaseModel.TYPE_FOLDER;
				searchQuery = `*${this.state.query.split(' ')[0].substr(1).trim()}*`;
				results = await Folder.search({ titlePattern: searchQuery });

				for (let i = 0; i < results.length; i++) {
					const row = results[i];
					const path = Folder.folderPathString(this.props.folders, row.parent_id);
					results[i] = { ...row, path: path ? path : '/' };
				}
			} else { // Note TITLE or BODY
				listType = BaseModel.TYPE_NOTE;
				searchQuery = gotoAnythingStyleQuery(this.state.query);
				// SearchEngine returns the title normalized, that is why we need to
				// override this field below with the original title
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				results = (await SearchEngine.instance().search(searchQuery)) as any[];

				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				resultsInBody = !!results.find((row: any) => row.fields.includes('body'));

				const resourceIds = results.filter(r => r.item_type === ModelType.Resource).map(r => r.item_id);
				const resources = await Resource.resourceOcrTextsByIds(resourceIds);

				if (!resultsInBody || this.state.query.length <= 1) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const notes = await Note.byIds(results.map((result: any) => result.id), { fields: ['id', 'title'] });
					for (let i = 0; i < results.length; i++) {
						const row = results[i];
						const path = Folder.folderPathString(this.props.folders, row.parent_id);
						const originalNote = notes.find(note => note.id === row.id);
						results[i] = { ...row, path: path, title: originalNote.title };
					}
				} else {
					const limit = 20;

					// Note: any filtering must be done **before** fetching the notes, because we're
					// going to apply a limit to the number of fetched notes.
					// https://github.com/laurent22/joplin/issues/9944
					if (!this.props.showCompletedTodos) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
						results = results.filter((row: any) => !row.is_todo || !row.todo_completed);
					}

					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const notes = await Note.byIds(results.map((result: any) => result.id).slice(0, limit), { fields: ['id', 'body', 'markup_language', 'is_todo', 'todo_completed', 'title'] });
					// Can't make any sense of this code so...
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const notesById = notes.reduce((obj, { id, body, markup_language, title }) => ((obj[[id] as any] = { id, body, markup_language, title }), obj), {});

					// Filter out search results that are associated with non-existing notes.
					// https://github.com/laurent22/joplin/issues/5417
					results = results.filter(r => !!notesById[r.id])
						.map(r => ({ ...r, title: notesById[r.id].title }));

					const normalizedKeywords = (await this.keywords(searchQuery)).map(
						({ valueRegex }: ComplexTerm) => new RegExp(removeDiacritics(valueRegex), 'ig'),
					);

					for (let i = 0; i < results.length; i++) {
						const row = results[i];
						const path = Folder.folderPathString(this.props.folders, row.parent_id);

						if (row.fields.includes('body')) {
							let fragments = '...';

							const loadFragments = (markupLanguage: MarkupLanguage, content: string) => {
								const indices = [];
								const body = this.markupToHtml().stripMarkup(markupLanguage, content, { collapseWhiteSpaces: true });
								const normalizedBody = removeDiacritics(body);

								// Iterate over all matches in the body for each search keyword
								for (const keywordRegex of normalizedKeywords) {
									for (const match of normalizedBody.matchAll(keywordRegex)) {
										// Populate 'indices' with [begin index, end index] of each note fragment
										// Begins at the regex matching index, ends at the next whitespace after seeking 15 characters to the right
										indices.push([match.index, nextWhitespaceIndex(body, match.index + match[0].length + 15)]);
										if (indices.length > 20) break;
									}
								}

								// Merge multiple overlapping fragments into a single fragment to prevent repeated content
								// e.g. 'Joplin is a free, open source' and 'open source note taking application'
								// will result in 'Joplin is a free, open source note taking application'
								const mergedIndices = mergeOverlappingIntervals(indices, 3);
								// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
								fragments = mergedIndices.map((f: any) => body.slice(f[0], f[1])).join(' ... ');
								// Add trailing ellipsis if the final fragment doesn't end where the note is ending
								if (mergedIndices.length && mergedIndices[mergedIndices.length - 1][1] !== body.length) fragments += ' ...';
							};

							if (i < limit) { // Display note fragments of search keyword matches
								const { markupLanguage, content } = getContentMarkupLanguageAndBody(
									row,
									notesById,
									resources,
								);

								// Don't load fragments for long notes -- doing so can lead to UI freezes.
								if (content.length < 100_000) {
									loadFragments(markupLanguage, content);
								}
							}

							results[i] = { ...row, path, fragments };
						} else {
							results[i] = { ...row, path: path, fragments: '' };
						}
					}
				}
			}

			// make list scroll to top in every search
			this.makeItemIndexVisible(0);

			const keywordsWithoutEmptyString = keywords?.filter(v => !!v);

			this.setState({
				listType: listType,
				results: results,
				keywords: keywordsWithoutEmptyString ? keywordsWithoutEmptyString : await this.keywords(searchQuery),
				selectedItemId: results.length === 0 ? null : getResultId(results[0]),
				resultsInBody: resultsInBody,
				commandArgs: commandArgs,
			});
		}
	}

	private makeItemIndexVisible(index: number) {
		// Looks like it's not always defined
		// https://github.com/laurent22/joplin/issues/5184#issuecomment-879714850
		if (!this.itemListRef || !this.itemListRef.current) {
			logger.warn('Trying to set item index but the item list is not defined. Index: ', index);
			return;
		}

		this.itemListRef.current.makeItemIndexVisible(index);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async gotoItem(item: any) {
		this.props.dispatch({
			pluginName: PLUGIN_NAME,
			type: 'PLUGINLEGACY_DIALOG_SET',
			open: false,
		});

		if (this.userCallback_) {
			logger.info('gotoItem: user callback', item);

			this.userCallback_.resolve({
				type: this.state.listType,
				item: { ...item },
			});
			return;
		}

		if (item.type === BaseModel.TYPE_COMMAND) {
			logger.info('gotoItem: execute command', item);
			void CommandService.instance().execute(item.id, ...item.commandArgs);
			void focusEditorIfEditorCommand(item.id, CommandService.instance());
			return;
		}

		if (this.state.listType === BaseModel.TYPE_NOTE || this.state.listType === BaseModel.TYPE_FOLDER) {
			const folderPath = await Folder.folderPath(this.props.folders, item.parent_id);

			for (const folder of folderPath) {
				this.props.dispatch({
					type: 'FOLDER_SET_COLLAPSED',
					id: folder.id,
					collapsed: false,
				});
			}
		}

		if (this.state.listType === BaseModel.TYPE_NOTE) {
			logger.info('gotoItem: note', item);

			this.props.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId: item.parent_id,
				noteId: item.id,
			});

			CommandService.instance().scheduleExecute('focusElement', 'noteBody');
		} else if (this.state.listType === BaseModel.TYPE_TAG) {
			logger.info('gotoItem: tag', item);

			this.props.dispatch({
				type: 'TAG_SELECT',
				id: item.id,
			});
		} else if (this.state.listType === BaseModel.TYPE_FOLDER) {
			logger.info('gotoItem: folder', item);

			this.props.dispatch({
				type: 'FOLDER_SELECT',
				id: item.id,
			});
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private listItem_onClick(event: any) {
		const itemId = event.currentTarget.getAttribute('data-id');
		const parentId = event.currentTarget.getAttribute('data-parent-id');
		const itemType = Number(event.currentTarget.getAttribute('data-type'));

		void this.gotoItem({
			id: itemId,
			parent_id: parentId,
			type: itemType,
			commandArgs: this.state.commandArgs,
		});
	}

	public renderItem(item: GotoAnythingSearchResult, index: number) {
		const theme = themeStyle(this.props.themeId);
		const style = this.style();
		const resultId = getResultId(item);
		const isSelected = resultId === this.state.selectedItemId;
		const rowStyle = isSelected ? style.rowSelected : style.row;

		const wrapKeywordMatches = (unescapedContent: string) => {
			return surroundKeywords(
				this.state.keywords,
				unescapedContent,
				`<span class="match-highlight" style="font-weight: bold; color: ${theme.searchMarkerColor}; background-color: ${theme.searchMarkerBackgroundColor}">`,
				'</span>',
				{ escapeHtml: true },
			);
		};

		const titleHtml = item.fragments
			? `<span style="font-weight: bold; color: ${theme.color};">${item.title}</span>`
			: wrapKeywordMatches(item.title);

		const fragmentsHtml = !item.fragments ? null : wrapKeywordMatches(item.fragments);

		const folderIcon = <i style={{ fontSize: theme.fontSize, marginRight: 2 }} className="fa fa-book" role='img' aria-label={_('Notebook')} />;
		const pathComp = !item.path ? null : <div style={style.rowPath}>{folderIcon} {item.path}</div>;
		const fragmentComp = !fragmentsHtml ? null : <div style={style.rowFragments} dangerouslySetInnerHTML={{ __html: (fragmentsHtml) }}></div>;

		return (
			<div
				key={resultId}
				className={isSelected ? 'selected' : null}
				style={rowStyle}
				onClick={this.listItem_onClick}

				data-id={item.id}
				data-parent-id={item.parent_id}
				data-type={item.type}

				role='option'
				id={resultId}
				aria-posinset={index + 1}
			>
				<div style={style.rowTitle} dangerouslySetInnerHTML={{ __html: titleHtml }}></div>
				{fragmentComp}
				{pathComp}
			</div>
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public selectedItemIndex(results: any[] = undefined, itemId: string = undefined) {
		if (typeof results === 'undefined') results = this.state.results;
		if (typeof itemId === 'undefined') itemId = this.state.selectedItemId;
		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			if (getResultId(r) === itemId) return i;
		}
		return -1;
	}

	public selectedItem() {
		const index = this.selectedItemIndex();
		if (index < 0) return null;
		return { ...this.state.results[index], commandArgs: this.state.commandArgs };
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private input_onKeyDown(event: any) {
		const keyCode = event.keyCode;

		if (this.state.results.length > 0 && (keyCode === 40 || keyCode === 38)) { // DOWN / UP
			event.preventDefault();

			const inc = keyCode === 38 ? -1 : +1;
			let index = this.selectedItemIndex();
			if (index < 0) return; // Not possible, but who knows

			index += inc;
			if (index < 0) index = 0;
			if (index >= this.state.results.length) index = this.state.results.length - 1;

			const newId = getResultId(this.state.results[index]);

			this.makeItemIndexVisible(index);

			this.setState({ selectedItemId: newId });
		}

		if (keyCode === 13) { // ENTER
			event.preventDefault();

			const item = this.selectedItem();
			if (!item) return;

			void this.gotoItem(item);
		}
	}

	private calculateMaxHeight(itemHeight: number) {
		const maxItemCount = Math.floor((0.7 * window.innerHeight) / itemHeight);
		return maxItemCount * itemHeight;
	}

	public renderList() {
		const style = this.style();

		const itemListStyle = {
			marginTop: 5,
			height: Math.min(style.itemHeight * this.state.results.length, this.calculateMaxHeight(style.itemHeight)),
		};

		return (
			<ItemList
				ref={this.itemListRef}
				id={itemListId}
				role='listbox'
				aria-label={_('Search results')}
				itemHeight={style.itemHeight}
				items={this.state.results}
				style={itemListStyle}
				itemRenderer={this.renderItem}
			/>
		);
	}

	public render() {
		const style = this.style();
		const helpTextId = 'goto-anything-help-text';
		const helpComp = (
			<div
				className='help-text'
				aria-live='polite'
				id={helpTextId}
				style={style.help}
				hidden={!this.state.showHelp}
			>{_('Type a note title or part of its content to jump to it. Or type # followed by a tag name, or @ followed by a notebook name. Or type : to search for commands.')}</div>
		);

		return (
			<Dialog className='go-to-anything-dialog' onCancel={this.modalLayer_onDismiss} contentStyle={style.dialogBox}>
				{helpComp}
				<div style={style.inputHelpWrapper}>
					<input
						autoFocus
						type='text'
						style={style.input}
						ref={this.inputRef}
						value={this.state.query}
						onChange={this.input_onChange}
						onKeyDown={this.input_onKeyDown}

						aria-describedby={helpTextId}
						aria-autocomplete='list'
						aria-controls={itemListId}
						aria-activedescendant={this.state.selectedItemId}
					/>
					<HelpButton
						onClick={this.helpButton_onClick}
						aria-controls={helpTextId}
						aria-expanded={this.state.showHelp}
					/>
				</div>
				{this.renderList()}
			</Dialog>
		);
	}

}

const mapStateToProps = (state: AppState) => {
	return {
		folders: state.folders,
		themeId: state.settings.theme,
		showCompletedTodos: state.settings.showCompletedTodos,
		highlightedWords: state.highlightedWords,
	};
};

GotoAnything.Dialog = connect(mapStateToProps)(DialogComponent);

GotoAnything.manifest = {

	name: PLUGIN_NAME,
	menuItems: [
		{
			id: 'gotoAnything',
			name: 'main',
			parent: 'go',
			label: _('Goto Anything...'),
			accelerator: () => KeymapService.instance().getAccelerator('gotoAnything'),
			screens: ['Main'],
		},
		{
			id: 'commandPalette',
			name: 'main',
			parent: 'tools',
			label: _('Command palette'),
			accelerator: () => KeymapService.instance().getAccelerator('commandPalette'),
			screens: ['Main'],
			userData: {
				startString: ':',
			},
		},
		{
			id: 'controlledApi',
		},
	],

};

export default GotoAnything;
