import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import time from '@joplin/lib/time';
import DialogButtonRow from './DialogButtonRow';
import Note from '@joplin/lib/models/Note';
import bridge from '../services/bridge';
import shim from '@joplin/lib/shim';
import { NoteEntity } from '@joplin/lib/services/database/types';
const Datetime = require('react-datetime').default;
const { clipboard } = require('electron');
const formatcoords = require('formatcoords');

interface Props {
	noteId: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onClose: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onRevisionLinkClick: Function;
	themeId: number;
}

interface State {
	editedKey: string;
	formNote: any;
	editedValue: any;
}

class NotePropertiesDialog extends React.Component<Props, State> {

	private okButton: any;
	private keyToLabel_: Record<string, string>;
	private styleKey_: number;
	private styles_: any;

	public constructor(props: Props) {
		super(props);

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

	public componentDidMount() {
		void this.loadNote(this.props.noteId);
	}

	public componentDidUpdate() {
		if (this.state.editedKey === null) {
			this.okButton.current.focus();
		}
	}

	public async loadNote(noteId: string) {
		if (!noteId) {
			this.setState({ formNote: null });
		} else {
			const note = await Note.load(noteId);
			const formNote = this.noteToFormNote(note);
			this.setState({ formNote: formNote });
		}
	}

	public latLongFromLocation(location: string) {
		const o: any = {};
		const l = location.split(',');
		if (l.length === 2) {
			o.latitude = l[0].trim();
			o.longitude = l[1].trim();
		} else {
			o.latitude = '';
			o.longitude = '';
		}
		return o;
	}

	public noteToFormNote(note: NoteEntity) {
		const formNote: any = {};

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

	public formNoteToNote(formNote: any) {
		const note = { id: formNote.id, ...this.latLongFromLocation(formNote.location) };
		note.user_created_time = time.formatLocalToMs(formNote.user_created_time);
		note.user_updated_time = time.formatLocalToMs(formNote.user_updated_time);

		if (formNote.todo_completed) {
			note.todo_completed = time.formatMsToLocal(formNote.todo_completed);
		}

		note.source_url = formNote.source_url;

		return note;
	}

	public styles(themeId: number) {
		const styleKey = themeId;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styles_ = {};
		this.styleKey_ = styleKey;

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

	public async closeDialog(applyChanges: boolean) {
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

	private buttonRow_click(event: any) {
		void this.closeDialog(event.buttonName === 'ok');
	}

	private revisionsLink_click() {
		void this.closeDialog(false);
		if (this.props.onRevisionLinkClick) this.props.onRevisionLinkClick();
	}

	public editPropertyButtonClick(key: string, initialValue: any) {
		this.setState({
			editedKey: key,
			editedValue: initialValue,
		});

		shim.setTimeout(() => {
			if ((this.refs.editField as any).openCalendar) {
				(this.refs.editField as any).openCalendar();
			} else {
				(this.refs.editField as any).focus();
			}
		}, 100);
	}

	public async saveProperty() {
		if (!this.state.editedKey) return null;

		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		return new Promise((resolve: Function) => {
			const newFormNote = { ...this.state.formNote };

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
				},
			);
		});
	}

	public async cancelProperty() {
		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		return new Promise((resolve: Function) => {
			this.okButton.current.focus();
			this.setState({
				editedKey: null,
				editedValue: null,
			}, () => {
				resolve();
			});
		});
	}

	public createNoteField(key: string, value: any) {
		const styles = this.styles(this.props.themeId);
		const theme = themeStyle(this.props.themeId);
		const labelComp = <label style={{ ...theme.textStyle, ...theme.controlBoxLabel }}>{this.formatLabel(key)}</label>;
		let controlComp = null;
		let editComp = null;
		let editCompHandler = null;
		let editCompIcon = null;

		const onKeyDown = (event: any) => {
			if (event.keyCode === 13) {
				void this.saveProperty();
			} else if (event.keyCode === 27) {
				void this.cancelProperty();
			}
		};

		if (this.state.editedKey === key) {
			if (key.indexOf('_time') >= 0) {
				controlComp = (
					<Datetime
						ref="editField"
						initialValue={value}
						dateFormat={time.dateFormat()}
						timeFormat={time.timeFormat()}
						inputProps={{
							onKeyDown: (event: any) => onKeyDown(event),
							style: styles.input,
						}}
						onChange={(momentObject: any) => {
							this.setState({ editedValue: momentObject });
						}}
					/>
				);

				editCompHandler = () => {
					void this.saveProperty();
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
					displayedValue = dms.format('DD MM ss X', { latLonSeparator: ', ', decimalPlaces: 2 });
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
				const urlStyle = { ...theme.urlStyle, maxWidth: '180px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };
				controlComp = (
					<a href="#" onClick={() => bridge().openExternal(url)} style={urlStyle}>
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
				controlComp = <div style={{ ...theme.textStyle, ...theme.controlBoxValue }}>{displayedValue}</div>;
			}

			if (['id', 'revisionsLink', 'markup_language'].indexOf(key) < 0) {
				editCompHandler = () => {
					this.editPropertyButtonClick(key, value);
				};
				editCompIcon = 'fa-edit';
			}

			// Add the copy icon and the 'copy on click' event
			if (key === 'id') {
				editCompIcon = 'fa-copy';
				editCompHandler = () => clipboard.writeText(value);
			}
		}

		if (editCompHandler) {
			editComp = (
				<a href="#" onClick={editCompHandler} style={styles.editPropertyButton}>
					<i className={`fas ${editCompIcon}`} aria-hidden="true"></i>
				</a>
			);
		}

		return (
			<div key={key} style={theme.controlBox} className="note-property-box">
				{labelComp}
				{controlComp}
				{editComp}
			</div>
		);
	}

	public formatLabel(key: string) {
		if (this.keyToLabel_[key]) return this.keyToLabel_[key];
		return key;
	}

	public formatValue(key: string, note: NoteEntity) {
		if (key === 'location') {
			if (!Number(note.latitude) && !Number(note.longitude)) return null;
			const dms = formatcoords(Number(note.latitude), Number(note.longitude));
			return dms.format('DDMMss', { decimalPlaces: 0 });
		}

		if (['user_updated_time', 'user_created_time', 'todo_completed'].indexOf(key) >= 0) {
			return time.formatMsToLocal((note as any)[key]);
		}

		return (note as any)[key];
	}

	public render() {
		const theme = themeStyle(this.props.themeId);
		const formNote = this.state.formNote;

		const noteComps = [];

		if (formNote) {
			for (const key in formNote) {
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
					<DialogButtonRow themeId={this.props.themeId} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
				</div>
			</div>
		);
	}
}

export default NotePropertiesDialog;
