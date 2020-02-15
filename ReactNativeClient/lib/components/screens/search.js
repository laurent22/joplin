const React = require('react');

const { StyleSheet, View, TextInput, FlatList, TouchableHighlight } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { _ } = require('lib/locale.js');
const Note = require('lib/models/Note.js');
const { NoteItem } = require('lib/components/note-item.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { themeStyle } = require('lib/components/global-style.js');
const SearchEngineUtils = require('lib/services/SearchEngineUtils');
const DialogBox = require('react-native-dialogbox').default;

Icon.loadFont();

class SearchScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			query: '',
			notes: [],
		};
		this.isMounted_ = false;
		this.styles_ = {};
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		let styles = {
			body: {
				flex: 1,
			},
			searchContainer: {
				flexDirection: 'row',
				alignItems: 'center',
				borderWidth: 1,
				borderColor: theme.dividerColor,
			},
		};

		styles.searchTextInput = Object.assign({}, theme.lineInput);
		styles.searchTextInput.paddingLeft = theme.marginLeft;
		styles.searchTextInput.flex = 1;
		styles.searchTextInput.backgroundColor = theme.backgroundColor;
		styles.searchTextInput.color = theme.color;

		styles.clearIcon = Object.assign({}, theme.icon);
		styles.clearIcon.color = theme.colorFaded;
		styles.clearIcon.paddingRight = theme.marginRight;
		styles.clearIcon.backgroundColor = theme.backgroundColor;

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
	}

	componentDidMount() {
		this.setState({ query: this.props.query });
		this.refreshSearch(this.props.query);
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.isMounted_ = false;
	}

	// UNSAFE_componentWillReceiveProps(newProps) {
	// 	console.info('UNSAFE_componentWillReceiveProps', newProps);

	// 	let newState = {};
	// 	if ('query' in newProps && !this.state.query) newState.query = newProps.query;

	// 	if (Object.getOwnPropertyNames(newState).length) {
	// 		this.setState(newState);
	// 		this.refreshSearch(newState.query);
	// 	}
	// }

	searchTextInput_submit() {
		const query = this.state.query.trim();
		if (!query) return;

		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: query,
		});

		this.setState({ query: query });
		this.refreshSearch(query);
	}

	clearButton_press() {
		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: '',
		});

		this.setState({ query: '' });
		this.refreshSearch('');
	}

	async refreshSearch(query = null) {
		if (!this.props.visible) return;

		query = query === null ? this.state.query.trim : query.trim();

		let notes = [];

		if (query) {
			if (this.props.settings['db.ftsEnabled']) {
				notes = await SearchEngineUtils.notesForQuery(query);
			} else {
				let p = query.split(' ');
				let temp = [];
				for (let i = 0; i < p.length; i++) {
					let t = p[i].trim();
					if (!t) continue;
					temp.push(t);
				}

				notes = await Note.previews(null, {
					anywherePattern: `*${temp.join('*')}*`,
				});
			}
		}

		if (!this.isMounted_) return;

		this.setState({ notes: notes });
	}

	searchTextInput_changeText(text) {
		this.setState({ query: text });
	}

	render() {
		if (!this.isMounted_) return null;

		const theme = themeStyle(this.props.theme);

		let rootStyle = {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		};

		if (!this.props.visible) {
			rootStyle.flex = 0.001; // This is a bit of a hack but it seems to work fine - it makes the component invisible but without unmounting it
		}

		const thisComponent = this;

		return (
			<View style={rootStyle}>
				<ScreenHeader
					title={_('Search')}
					parentComponent={thisComponent}
					folderPickerOptions={{
						enabled: this.props.noteSelectionEnabled,
						mustSelect: true,
					}}
					showSideMenuButton={false}
					showSearchButton={false}
				/>
				<View style={this.styles().body}>
					<View style={this.styles().searchContainer}>
						<TextInput
							style={this.styles().searchTextInput}
							autoFocus={this.props.visible}
							underlineColorAndroid="#ffffff00"
							onSubmitEditing={() => {
								this.searchTextInput_submit();
							}}
							onChangeText={text => this.searchTextInput_changeText(text)}
							value={this.state.query}
							selectionColor={theme.textSelectionColor}
						/>
						<TouchableHighlight onPress={() => this.clearButton_press()}>
							<Icon name="md-close-circle" style={this.styles().clearIcon} />
						</TouchableHighlight>
					</View>

					<FlatList data={this.state.notes} keyExtractor={(item) => item.id} renderItem={event => <NoteItem note={event.item} />} />
				</View>
				<DialogBox
					ref={dialogbox => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const SearchScreen = connect(state => {
	return {
		query: state.searchQuery,
		theme: state.settings.theme,
		settings: state.settings,
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
})(SearchScreenComponent);

module.exports = { SearchScreen };
