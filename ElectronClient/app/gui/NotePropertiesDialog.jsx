const React = require('react');
const { connect } = require('react-redux');
const { _ } = require('lib/locale.js');
const moment = require('moment');
const { themeStyle } = require('../theme.js');
const { time } = require('lib/time-utils.js');
const Datetime = require('react-datetime');
const Note = require('lib/models/Note');
const formatcoords = require('formatcoords');
const { bridge } = require('electron').remote.require('./bridge');
const { Button, ButtonIcon } = require('@rmwc/button');
const { IconButton } = require('@rmwc/icon-button');
const { TextField } = require('@rmwc/textfield');
const { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton } = require('@rmwc/dialog');


class NotePropertiesDialog extends React.Component {

	constructor() {
		super();

		this.okButton_click = this.okButton_click.bind(this);
		this.cancelButton_click = this.cancelButton_click.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
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
			location: _('Location'),
			source_url: _('URL'),
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
		formNote.source_url = note.source_url;

		formNote.location = '';
		if (Number(note.latitude) || Number(note.longitude)) {
			formNote.location = note.latitude + ', ' + note.longitude;
		}

		formNote.id = note.id;

		return formNote;
	}

	formNoteToNote(formNote) {
		const note = Object.assign({ id: formNote.id }, this.latLongFromLocation(formNote.location));
		note.user_created_time = time.formatLocalToMs(formNote.user_created_time);
		note.user_updated_time = time.formatLocalToMs(formNote.user_updated_time);
		note.source_url = formNote.source_url;

		return note;
	}

	styles(themeId) {
		const styleKey = themeId;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styles_ = {};
		this.styleKey_ = styleKey;

		this.styles_.modalLayer = {
			zIndex: 9999,
			display: 'flex',
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			backgroundColor: 'rgba(0,0,0,0.6)',
			alignItems: 'flex-start',
			justifyContent: 'center',
		};

		this.styles_.dialogBox = {
			backgroundColor: theme.backgroundColor,
			padding: 16,
			boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
			marginTop: 20,
		}

		this.styles_.controlBox = {
			marginBottom: '1em',
			color: 'black', //This will apply for the calendar
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
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		this.styles_.input = {
			display: 'inline-block',
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			border: '1px solid',
			borderColor: theme.dividerColor,
		};

		this.styles_.dialogTitle = Object.assign({}, theme.h1Style, { marginBottom: '1.2em' });

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

	okButton_click() {
		this.closeDialog(true);
	}

	cancelButton_click() {
		this.closeDialog(false);
	}

	onKeyDown(event) {
		if (event.keyCode === 13) {
			this.closeDialog(true);
		} else if (event.keyCode === 27) {
			this.closeDialog(false);
		}
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

		return new Promise((resolve, reject) => {
			const newFormNote = Object.assign({}, this.state.formNote);

			if (this.state.editedKey.indexOf('_time') >= 0) {
				const dt = time.anythingToDateTime(this.state.editedValue, new Date());
				newFormNote[this.state.editedKey] = time.formatMsToLocal(dt.getTime());
			} else {
				newFormNote[this.state.editedKey] = this.state.editedValue;
			}

			this.setState({
				formNote: newFormNote,
				editedKey: null,
				editedValue: null
			}, () => { resolve() });
		});
	}

	async cancelProperty() {
		return new Promise((resolve, reject) => {
			this.okButton.current.focus();
			this.setState({
				editedKey: null,
				editedValue: null
			}, () => { resolve() });
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

		const onKeyDown = (event) => {
			if (event.keyCode === 13) {
				this.saveProperty();
			} else if (event.keyCode === 27) {
				this.cancelProperty();
			}
		}

		if (this.state.editedKey === key) {
			if (key.indexOf('_time') >= 0) {

				controlComp = <Datetime
					ref="editField"
					defaultValue={value}
					dateFormat={time.dateFormat()}
					timeFormat={time.timeFormat()}
					inputProps={{
						onKeyDown: (event) => onKeyDown(event, key),
						style: styles.input
					}}
					onChange={(momentObject) => { this.setState({ editedValue: momentObject }) }}
				/>

				editCompHandler = () => { this.saveProperty() };
				editCompIcon = 'save';
			} else {

				controlComp = <TextField
					defaultValue={value}
					type="text"
					ref="editField"
					onChange={(event) => { this.setState({ editedValue: event.target.value }) }}
					onKeyDown={(event) => onKeyDown(event)}
					style={styles.input}
				/>
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
				controlComp = <a href="#" onClick={() => bridge().openExternal(url)} style={theme.urlStyle}>{displayedValue}</a>
			} else {
				controlComp = <div style={Object.assign({}, theme.textStyle, { display: 'inline-block' })}>{displayedValue}</div>
			}

			if (key !== 'id') {
				editCompHandler = () => { this.editPropertyButtonClick(key, value) };
				editCompIcon = 'edit';
			}
		}

		if (editCompHandler) {
			editComp = (
				<IconButton href="#" onClick={editCompHandler} icon={editCompIcon} />
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
			const dms = formatcoords(Number(note.latitude), Number(note.longitude))
			return dms.format('DDMMss', { decimalPlaces: 0 });
		}

		if (['user_updated_time', 'user_created_time'].indexOf(key) >= 0) {
			return time.formatMsToLocal(note[key]);
		}

		return note[key];
	}

	render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.theme);
		const styles = this.styles(this.props.theme);
		const formNote = this.state.formNote;

		const buttonComps = [];
		buttonComps.push(
			<DialogButton
				key="ok"
				style={styles.button}
				onClick={this.okButton_click}
				ref={this.okButton}
				onKeyDown={this.onKeyDown}
				label={_('Apply')}
			>
				{_('Apply')}
			</DialogButton>
		);
		buttonComps.push(<DialogButton key="cancel" onClick={this.cancelButton_click}>{_('Cancel')}</DialogButton >);

		const noteComps = [];

		if (formNote) {
			for (let key in formNote) {
				if (!formNote.hasOwnProperty(key)) continue;
				const comp = this.createNoteField(key, formNote[key]);
				noteComps.push(comp);
			}
		}

		return (
			<Dialog>
				<DialogTitle>
					{_('Note properties')}
				</DialogTitle>
				<DialogContent>
					{noteComps}
				</DialogContent>
				<DialogActions>
					{buttonComps}
				</DialogActions>
			</Dialog>

		);
	}

}

module.exports = NotePropertiesDialog;
