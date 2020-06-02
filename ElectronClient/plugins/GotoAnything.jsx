const React = require('react');
const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const SearchEngine = require('lib/services/SearchEngine');
const BaseModel = require('lib/BaseModel');
const Tag = require('lib/models/Tag');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const { ItemList } = require('../gui/ItemList.min');
const HelpButton = require('../gui/HelpButton.min');
const { surroundKeywords, nextWhitespaceIndex, removeDiacritics } = require('lib/string-utils.js');
const { mergeOverlappingIntervals } = require('lib/ArrayUtils.js');
const PLUGIN_NAME = 'gotoAnything';

class GotoAnything {

	onTrigger() {
		this.dispatch({
			type: 'PLUGIN_DIALOG_SET',
			open: true,
			pluginName: PLUGIN_NAME,
		});
	}

}

class Dialog extends React.PureComponent {

	constructor() {
		super();

		this.state = {
			query: '',
			results: [],
			selectedItemId: null,
			keywords: [],
			listType: BaseModel.TYPE_NOTE,
			showHelp: false,
			resultsInBody: false,
		};

		this.styles_ = {};

		this.inputRef = React.createRef();
		this.itemListRef = React.createRef();

		this.onKeyDown = this.onKeyDown.bind(this);
		this.input_onChange = this.input_onChange.bind(this);
		this.input_onKeyDown = this.input_onKeyDown.bind(this);
		this.modalLayer_onClick = this.modalLayer_onClick.bind(this);
		this.listItemRenderer = this.listItemRenderer.bind(this);
		this.listItem_onClick = this.listItem_onClick.bind(this);
		this.helpButton_onClick = this.helpButton_onClick.bind(this);
	}

	style() {
		const styleKey = [this.props.theme, this.state.resultsInBody ? '1' : '0'].join('-');

		if (this.styles_[styleKey]) return this.styles_[styleKey];

		const theme = themeStyle(this.props.theme);

		const itemHeight = this.state.resultsInBody ? 84 : 64;

		this.styles_[styleKey] = {
			dialogBox: Object.assign({}, theme.dialogBox, { minWidth: '50%', maxWidth: '50%' }),
			input: Object.assign({}, theme.inputStyle, { flex: 1 }),
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
			help: Object.assign({}, theme.textStyle, { marginBottom: 10 }),
			inputHelpWrapper: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
		};

		const rowTextStyle = {
			fontSize: theme.fontSize,
			color: theme.color,
			fontFamily: theme.fontFamily,
			whiteSpace: 'nowrap',
			opacity: 0.7,
			userSelect: 'none',
		};

		const rowTitleStyle = Object.assign({}, rowTextStyle, {
			fontSize: rowTextStyle.fontSize * 1.4,
			marginBottom: this.state.resultsInBody ? 6 : 4,
			color: theme.colorFaded,
		});

		const rowFragmentsStyle = Object.assign({}, rowTextStyle, {
			fontSize: rowTextStyle.fontSize * 1.2,
			marginBottom: this.state.resultsInBody ? 8 : 6,
			color: theme.colorFaded,
		});

		this.styles_[styleKey].rowSelected = Object.assign({}, this.styles_[styleKey].row, { backgroundColor: theme.selectedColor });
		this.styles_[styleKey].rowPath = rowTextStyle;
		this.styles_[styleKey].rowTitle = rowTitleStyle;
		this.styles_[styleKey].rowFragments = rowFragmentsStyle;
		this.styles_[styleKey].itemHeight = itemHeight;

		return this.styles_[styleKey];
	}

	componentDidMount() {
		document.addEventListener('keydown', this.onKeyDown);
	}

	componentWillUnmount() {
		if (this.listUpdateIID_) clearTimeout(this.listUpdateIID_);
		document.removeEventListener('keydown', this.onKeyDown);
	}

	onKeyDown(event) {
		if (event.keyCode === 27) { // ESCAPE
			this.props.dispatch({
				pluginName: PLUGIN_NAME,
				type: 'PLUGIN_DIALOG_SET',
				open: false,
			});
		}
	}

	modalLayer_onClick(event) {
		if (event.currentTarget == event.target) {
			this.props.dispatch({
				pluginName: PLUGIN_NAME,
				type: 'PLUGIN_DIALOG_SET',
				open: false,
			});
		}
	}

	helpButton_onClick() {
		this.setState({ showHelp: !this.state.showHelp });
	}

	input_onChange(event) {
		this.setState({ query: event.target.value });

		this.scheduleListUpdate();
	}

	scheduleListUpdate() {
		if (this.listUpdateIID_) return;

		this.listUpdateIID_ = setTimeout(async () => {
			await this.updateList();
			this.listUpdateIID_ = null;
		}, 10);
	}

	makeSearchQuery(query) {
		const output = [];
		const splitted = query.split(' ');

		for (let i = 0; i < splitted.length; i++) {
			const s = splitted[i].trim();
			if (!s) continue;
			output.push(`${s}*`);
		}

		return output.join(' ');
	}

	keywords(searchQuery) {
		const parsedQuery = SearchEngine.instance().parseQuery(searchQuery);
		return SearchEngine.instance().allParsedQueryTerms(parsedQuery);
	}

	async updateList() {
		let resultsInBody = false;

		if (!this.state.query) {
			this.setState({ results: [], keywords: [] });
		} else {
			let results = [];
			let listType = null;
			let searchQuery = '';

			if (this.state.query.indexOf('#') === 0) { // TAGS
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
					results[i] = Object.assign({}, row, { path: path ? path : '/' });
				}
			} else { // Note TITLE or BODY
				listType = BaseModel.TYPE_NOTE;
				searchQuery = this.makeSearchQuery(this.state.query);
				results = await SearchEngine.instance().search(searchQuery);

				resultsInBody = !!results.find(row => row.fields.includes('body'));

				if (!resultsInBody) {
					for (let i = 0; i < results.length; i++) {
						const row = results[i];
						const path = Folder.folderPathString(this.props.folders, row.parent_id);
						results[i] = Object.assign({}, row, { path: path });
					}
				} else {
					const limit = 20;
					const searchKeywords = this.keywords(searchQuery);
					const notes = await Note.byIds(results.map(result => result.id).slice(0, limit), { fields: ['id', 'body'] });
					const notesById = notes.reduce((obj, { id, body }) => ((obj[[id]] = body), obj), {});

					for (let i = 0; i < results.length; i++) {
						const row = results[i];
						const path = Folder.folderPathString(this.props.folders, row.parent_id);

						if (row.fields.includes('body')) {
							let fragments = '...';

							if (i < limit) { // Display note fragments of search keyword matches
								const indices = [];
								const body = notesById[row.id];

								// Iterate over all matches in the body for each search keyword
								for (let { valueRegex } of searchKeywords) {
									valueRegex = removeDiacritics(valueRegex);

									for (const match of removeDiacritics(body).matchAll(new RegExp(valueRegex, 'ig'))) {
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
								fragments = mergedIndices.map(f => body.slice(f[0], f[1])).join(' ... ');
								// Add trailing ellipsis if the final fragment doesn't end where the note is ending
								if (mergedIndices.length && mergedIndices[mergedIndices.length - 1][1] !== body.length) fragments += ' ...';
							}

							results[i] = Object.assign({}, row, { path, fragments });
						} else {
							results[i] = Object.assign({}, row, { path: path, fragments: '' });
						}
					}
				}
			}

			let selectedItemId = null;
			const itemIndex = this.selectedItemIndex(results, this.state.selectedItemId);
			if (itemIndex > 0) {
				selectedItemId = this.state.selectedItemId;
			} else if (results.length > 0) {
				selectedItemId = results[0].id;
			}

			this.setState({
				listType: listType,
				results: results,
				keywords: this.keywords(searchQuery),
				selectedItemId: selectedItemId,
				resultsInBody: resultsInBody,
			});
		}
	}

	async gotoItem(item) {
		this.props.dispatch({
			pluginName: PLUGIN_NAME,
			type: 'PLUGIN_DIALOG_SET',
			open: false,
		});

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
			this.props.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId: item.parent_id,
				noteId: item.id,
			});

			this.props.dispatch({
				type: 'WINDOW_COMMAND',
				name: 'focusElement',
				target: 'noteBody',
			});
		} else if (this.state.listType === BaseModel.TYPE_TAG) {
			this.props.dispatch({
				type: 'TAG_SELECT',
				id: item.id,
			});
		} else if (this.state.listType === BaseModel.TYPE_FOLDER) {
			this.props.dispatch({
				type: 'FOLDER_SELECT',
				id: item.id,
			});
		}
	}

	listItem_onClick(event) {
		const itemId = event.currentTarget.getAttribute('data-id');
		const parentId = event.currentTarget.getAttribute('data-parent-id');

		this.gotoItem({
			id: itemId,
			parent_id: parentId,
		});
	}

	listItemRenderer(item) {
		const theme = themeStyle(this.props.theme);
		const style = this.style();
		const rowStyle = item.id === this.state.selectedItemId ? style.rowSelected : style.row;
		const titleHtml = item.fragments
			? `<span style="font-weight: bold; color: ${theme.colorBright};">${item.title}</span>`
			: surroundKeywords(this.state.keywords, item.title, `<span style="font-weight: bold; color: ${theme.colorBright};">`, '</span>');

		const fragmentsHtml = !item.fragments ? null : surroundKeywords(this.state.keywords, item.fragments, `<span style="font-weight: bold; color: ${theme.colorBright};">`, '</span>');

		const folderIcon = <i style={{ fontSize: theme.fontSize, marginRight: 2 }} className="fa fa-book" />;
		const pathComp = !item.path ? null : <div style={style.rowPath}>{folderIcon} {item.path}</div>;
		const fragmentComp = !fragmentsHtml ? null : <div style={style.rowFragments} dangerouslySetInnerHTML={{ __html: fragmentsHtml }}></div>;

		return (
			<div key={item.id} style={rowStyle} onClick={this.listItem_onClick} data-id={item.id} data-parent-id={item.parent_id}>
				<div style={style.rowTitle} dangerouslySetInnerHTML={{ __html: titleHtml }}></div>
				{fragmentComp}
				{pathComp}
			</div>
		);
	}

	selectedItemIndex(results, itemId) {
		if (typeof results === 'undefined') results = this.state.results;
		if (typeof itemId === 'undefined') itemId = this.state.selectedItemId;
		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			if (r.id === itemId) return i;
		}
		return -1;
	}

	selectedItem() {
		const index = this.selectedItemIndex();
		if (index < 0) return null;
		return this.state.results[index];
	}

	input_onKeyDown(event) {
		const keyCode = event.keyCode;

		if (this.state.results.length > 0 && (keyCode === 40 || keyCode === 38)) { // DOWN / UP
			event.preventDefault();

			const inc = keyCode === 38 ? -1 : +1;
			let index = this.selectedItemIndex();
			if (index < 0) return; // Not possible, but who knows

			index += inc;
			if (index < 0) index = 0;
			if (index >= this.state.results.length) index = this.state.results.length - 1;

			const newId = this.state.results[index].id;

			this.itemListRef.current.makeItemIndexVisible(index);

			this.setState({ selectedItemId: newId });
		}

		if (keyCode === 13) { // ENTER
			event.preventDefault();

			const item = this.selectedItem();
			if (!item) return;

			this.gotoItem(item);
		}
	}

	renderList() {
		const style = this.style();

		const itemListStyle = {
			marginTop: 5,
			height: Math.min(style.itemHeight * this.state.results.length, 7 * style.itemHeight),
		};

		return (
			<ItemList
				ref={this.itemListRef}
				itemHeight={style.itemHeight}
				items={this.state.results}
				style={itemListStyle}
				itemRenderer={this.listItemRenderer}
			/>
		);
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.style();
		const helpComp = !this.state.showHelp ? null : <div style={style.help}>{_('Type a note title or part of its content to jump to it. Or type # followed by a tag name, or @ followed by a notebook name.')}</div>;

		return (
			<div onClick={this.modalLayer_onClick} style={theme.dialogModalLayer}>
				<div style={style.dialogBox}>
					{helpComp}
					<div style={style.inputHelpWrapper}>
						<input autoFocus type="text" style={style.input} ref={this.inputRef} value={this.state.query} onChange={this.input_onChange} onKeyDown={this.input_onKeyDown}/>
						<HelpButton onClick={this.helpButton_onClick}/>
					</div>
					{this.renderList()}
				</div>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		folders: state.folders,
		theme: state.settings.theme,
	};
};

GotoAnything.Dialog = connect(mapStateToProps)(Dialog);

GotoAnything.manifest = {

	name: PLUGIN_NAME,
	menuItems: [
		{
			name: 'main',
			parent: 'tools',
			label: _('Goto Anything...'),
			accelerator: 'CommandOrControl+G',
			screens: ['Main'],
		},
	],

};

module.exports = GotoAnything;
