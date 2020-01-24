const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const { time } = require('lib/time-utils.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Datetime = require('react-datetime');
const Note = require('lib/models/Note');
const formatcoords = require('formatcoords');
const { bridge } = require('electron').remote.require('./bridge');

class NotePropertiesDialog extends React.Component {
	constructor() {
		super();

		this.revisionsLink_click = this.revisionsLink_click.bind(this);
		this.buttonRow_click = this.buttonRow_click.bind(this);
		this.okButton = React.createRef();

		this.state = {
			formNote: null,
			editedKey: null,
			editedValue: null,
		};

		this.keyToLabel_ = {
			id: _('ID'),
			user_created_time: _('Created'),
			user_updated_time: _('Updated'),
			todo_completed: _('Completed'),
			location: _('Location'),
			source_url: _('URL'),
			revisionsLink: _('Note History'),
			markup_language: _('Markup'),
		};
	}

	componentDidMount() {
		this.loadNote(this.props.noteId);
	}

	componentDidUpdate() {
		if (this.state.editedKey == null) {
			this.okButton.current.focus();
		}
	}

	async loadNote(noteId) {
		if (!noteId) {
			this.setState({ formNote: null });
		} else {
			const note = await Note.load(noteId);
			const formNote = this.noteToFormNote(note);
			this.setState({ formNote: formNote });
		}
	}

	latLongFromLocation(location) {
		const o = {};
		const l = location.split(',');
		if (l.length == 2) {
			o.latitude = l[0].trim();
			o.longitude = l[1].trim();
		} else {
			o.latitude = '';
			o.longitude = '';
		}
		return o;
	}

	noteToFormNote(note) {
		const formNote = {};

		formNote.user_updated_time = time.formatMsToLocal(note.user_updated_time);
		formNote.user_created_time = time.formatMsToLocal(note.user_created_time);

		if (note.todo_completed) {
			formNote.todo_completed = time.formatMsToLocal(note.todo_completed);
		}

		formNote.source_url = note.source_url;

		formNote.location = '';
		if (Number(note.latitude) || Number(note.longitude)) {
			formNote.location = `${note.latitude}, ${note.longitude}`;
		}

		formNote.revisionsLink = note.id;
		formNote.markup_language = Note.markupLanguageToLabel(note.markup_language);
		formNote.id = note.id;

		return formNote;
	}

	formNoteToNote(formNote) {
		const note = Object.assign({ id: formNote.id }, this.latLongFromLocation(formNote.location));
		note.user_created_time = time.formatLocalToMs(formNote.user_created_time);
		note.user_updated_time = time.formatLocalToMs(formNote.user_updated_time);

		if (formNote.todo_completed) {
			note.todo_completed = time.formatMsToLocal(formNote.todo_completed);
		}

		note.source_url = formNote.source_url;

		return note;
	}

	styles(themeId) {
		const styleKey = themeId;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styles_ = {};
		this.styleKey_ = styleKey;

		this.styles_.controlBox = {
			marginBottom: '1em',
			color: 'black', // This will apply for the calendar
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
		};

		this.styles_.button = {
			minWidth: theme.buttonMinWidth,
			minHeight: theme.buttonMinHeight,
			marginLeft: 5,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		this.styles_.editPropertyButton = {
			color: theme.color,
			textDecoration: 'none',
			backgroundColor: theme.backgroundColor,
			padding: '.14em',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			marginLeft: '0.5em',
		};

		this.styles_.input = {
			display: 'inline-block',
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		return this.styles_;
	}

	async closeDialog(applyChanges) {
		if (applyChanges) {
			await this.saveProperty();
			const note = this.formNoteToNote(this.state.formNote);
			note.updated_time = Date.now();
			await Note.save(note, { autoTimestamp: false });
		} else {
			await this.cancelProperty();
		}

		if (this.props.onClose) {
			this.props.onClose();
		}
	}

	buttonRow_click(event) {
		this.closeDialog(event.buttonName === 'ok');
	}

	revisionsLink_click() {
		this.closeDialog(false);
		if (this.props.onRevisionLinkClick) this.props.onRevisionLinkClick();
	}

	editPropertyButtonClick(key, initialValue) {
		this.setState({
			editedKey: key,
			editedValue: initialValue,
		});

		setTimeout(() => {
			if (this.refs.editField.openCalendar) {
				this.refs.editField.openCalendar();
			} else {
				this.refs.editField.focus();
			}
		}, 100);
	}

	async saveProperty() {
		if (!this.state.editedKey) return;

		return new Promise((resolve) => {
			const newFormNote = Object.assign({}, this.state.formNote);

			if (this.state.editedKey.indexOf('_time') >= 0) {
				const dt = time.anythingToDateTime(this.state.editedValue, new Date());
				newFormNote[this.state.editedKey] = time.formatMsToLocal(dt.getTime());
			} else {
				newFormNote[this.state.editedKey] = this.state.editedValue;
			}

			this.setState(
				{
					formNote: newFormNote,
					editedKey: null,
					editedValue: null,
				},
				() => {
					resolve();
				}
			);
		});
	}

	async cancelProperty() {
		return new Promise((resolve) => {
			this.okButton.current.focus();
			this.setState({
				editedKey: null,
				editedValue: null,
			}, () => {
				resolve();
			});
		});
	}

	createNoteField(key, value) {
		const styles = this.styles(this.props.theme);
		const theme = themeStyle(this.props.theme);
		const labelComp = <label style={Object.assign({}, theme.textStyle, { marginRight: '1em', width: '6em', display: 'inline-block', fontWeight: 'bold' })}>{this.formatLabel(key)}</label>;
		let controlComp = null;
		let editComp = null;
		let editCompHandler = null;
		let editCompIcon = null;

		const onKeyDown = event => {
			if (event.keyCode === 13) {
				this.saveProperty();
			} else if (event.keyCode === 27) {
				this.cancelProperty();
			}
		};

		if (this.state.editedKey === key) {
			if (key.indexOf('_time') >= 0) {
				controlComp = (
					<Datetime
						ref="editField"
						defaultValue={value}
						dateFormat={time.dateFormat()}
						timeFormat={time.timeFormat()}
						inputProps={{
							onKeyDown: event => onKeyDown(event, key),
							style: styles.input,
						}}
						onChange={momentObject => {
							this.setState({ editedValue: momentObject });
						}}
					/>
				);

				editCompHandler = () => {
					this.saveProperty();
				};
				editCompIcon = 'fa-save';
			} else {
				controlComp = (
					<input
						defaultValue={value}
						type="text"
						ref="editField"
						onChange={event => {
							this.setState({ editedValue: event.target.value });
						}}
						onKeyDown={event => onKeyDown(event)}
						style={styles.input}
					/>
				);
			}
		} else {
			let displayedValue = value;

			if (key === 'location') {
				try {
					const dms = formatcoords(value);
					displayedValue = dms.format('DDMMss', { decimalPlaces: 0 });
				} catch (error) {
					displayedValue = '';
				}
			}

			if (['source_url', 'location'].indexOf(key) >= 0) {
				let url = '';
				if (key === 'source_url') url = value;
				if (key === 'location') {
					const ll = this.latLongFromLocation(value);
					url = Note.geoLocationUrlFromLatLong(ll.latitude, ll.longitude);
				}
				controlComp = (
					<a href="#" onClick={() => bridge().openExternal(url)} style={theme.urlStyle}>
						{displayedValue}
					</a>
				);
			} else if (key === 'revisionsLink') {
				controlComp = (
					<a href="#" onClick={this.revisionsLink_click} style={theme.urlStyle}>
						{_('Previous versions of this note')}
					</a>
				);
			} else {
				controlComp = <div style={Object.assign({}, theme.textStyle, { display: 'inline-block' })}>{displayedValue}</div>;
			}

			if (['id', 'revisionsLink', 'markup_language'].indexOf(key) < 0) {
				editCompHandler = () => {
					this.editPropertyButtonClick(key, value);
				};
				editCompIcon = 'fa-edit';
			}
		}

		if (editCompHandler) {
			editComp = (
				<a href="#" onClick={editCompHandler} style={styles.editPropertyButton}>
					<i className={`fa ${editCompIcon}`} aria-hidden="true"></i>
				</a>
			);
		}

		return (
			<div key={key} style={this.styles_.controlBox} className="note-property-box">
				{labelComp}
				{controlComp}
				{editComp}
			</div>
		);
	}

	formatLabel(key) {
		if (this.keyToLabel_[key]) return this.keyToLabel_[key];
		return key;
	}

	formatValue(key, note) {
		if (key === 'location') {
			if (!Number(note.latitude) && !Number(note.longitude)) return null;
			const dms = formatcoords(Number(note.latitude), Number(note.longitude));
			return dms.format('DDMMss', { decimalPlaces: 0 });
		}

		if (['user_updated_time', 'user_created_time', 'todo_completed'].indexOf(key) >= 0) {
			return time.formatMsToLocal(note[key]);
		}

		return note[key];
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const formNote = this.state.formNote;

		const noteComps = [];

		if (formNote) {
			for (let key in formNote) {
				if (!formNote.hasOwnProperty(key)) continue;
				const comp = this.createNoteField(key, formNote[key]);
				noteComps.push(comp);
			}
		}

		return (
			<div style={theme.dialogModalLayer}>
				<div style={theme.dialogBox}>
					<div style={theme.dialogTitle}>{_('Note properties')}</div>
					<div>{noteComps}</div>
					<DialogButtonRow theme={this.props.theme} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
				</div>
			</div>
		);
	}
}

module.exports = NotePropertiesDialog;
