import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import time from '@joplin/lib/time';
import DialogButtonRow from './DialogButtonRow';
import Note from '@joplin/lib/models/Note';
import bridge from '../services/bridge';
import shim from '@joplin/lib/shim';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { focus } from '@joplin/lib/utils/focusHandler';
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

interface FormNote {
	id: string;
	deleted_time: string;
	location: string;
	markup_language: string;
	revisionsLink: string;
	source_url: string;
	todo_completed?: string;
	user_created_time: string;
	user_updated_time: string;
}

interface State {
	editedKey: string;
	formNote: FormNote;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	editedValue: any;
}

class NotePropertiesDialog extends React.Component<Props, State> {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private okButton: any;
	private keyToLabel_: Record<string, string>;
	private styleKey_: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			deleted_time: _('Deleted'),
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
			if (this.okButton.current) focus('NotePropertiesDialog::componentDidUpdate', this.okButton.current);
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

	private isReadOnly() {
		return this.state.formNote && !!this.state.formNote.deleted_time;
	}

	public latLongFromLocation(location: string) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		const formNote: FormNote = {
			id: note.id,
			user_updated_time: time.formatMsToLocal(note.user_updated_time),
			user_created_time: time.formatMsToLocal(note.user_created_time),
			source_url: note.source_url,
			location: '',
			revisionsLink: note.id,
			markup_language: Note.markupLanguageToLabel(note.markup_language),
			deleted_time: note.deleted_time ? time.formatMsToLocal(note.deleted_time) : '',
		};

		if (note.todo_completed) {
			formNote.todo_completed = time.formatMsToLocal(note.todo_completed);
		}

		if (Number(note.latitude) || Number(note.longitude)) {
			formNote.location = `${note.latitude}, ${note.longitude}`;
		}

		return formNote;
	}

	public formNoteToNote(formNote: FormNote) {
		const note: NoteEntity = { id: formNote.id, ...this.latLongFromLocation(formNote.location) };
		note.user_created_time = time.formatLocalToMs(formNote.user_created_time);
		note.user_updated_time = time.formatLocalToMs(formNote.user_updated_time);

		if (formNote.todo_completed) {
			note.todo_completed = time.formatLocalToMs(formNote.todo_completed);
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private buttonRow_click(event: any) {
		void this.closeDialog(event.buttonName === 'ok');
	}

	private revisionsLink_click() {
		void this.closeDialog(false);
		if (this.props.onRevisionLinkClick) this.props.onRevisionLinkClick();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public editPropertyButtonClick(key: string, initialValue: any) {
		this.setState({
			editedKey: key,
			editedValue: initialValue,
		});

		shim.setTimeout(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			if ((this.refs.editField as any).openCalendar) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(this.refs.editField as any).openCalendar();
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				focus('NotePropertiesDialog::editPropertyButtonClick', (this.refs.editField as any));
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(newFormNote as any)[this.state.editedKey] = time.formatMsToLocal(dt.getTime());
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(newFormNote as any)[this.state.editedKey] = this.state.editedValue;
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
			if (this.okButton.current) focus('NotePropertiesDialog::focus', this.okButton.current);
			this.setState({
				editedKey: null,
				editedValue: null,
			}, () => {
				resolve();
			});
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public createNoteField(key: keyof FormNote, value: any) {
		const styles = this.styles(this.props.themeId);
		const theme = themeStyle(this.props.themeId);
		const labelComp = <label style={{ ...theme.textStyle, ...theme.controlBoxLabel }}>{this.formatLabel(key)}</label>;
		let controlComp = null;
		let editComp = null;
		let editCompHandler = null;
		let editCompIcon = null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
							// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
							onKeyDown: (event: any) => onKeyDown(event),
							style: styles.input,
						}}
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
				const urlStyle: React.CSSProperties = { ...theme.urlStyle, maxWidth: '180px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };
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

		if (editCompHandler && !this.isReadOnly()) {
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			return time.formatMsToLocal((note as any)[key]);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return (note as any)[key];
	}

	public render() {
		const theme = themeStyle(this.props.themeId);
		const formNote = this.state.formNote;

		const noteComps = [];

		if (formNote) {
			for (const key of Object.keys(formNote)) {
				if (key === 'deleted_time' && !formNote.deleted_time) continue;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				const comp = this.createNoteField(key as (keyof FormNote), (formNote as any)[key]);
				noteComps.push(comp);
			}
		}

		return (
			<div style={theme.dialogModalLayer}>
				<div style={theme.dialogBox}>
					<div style={theme.dialogTitle}>{_('Note properties')}</div>
					<div>{noteComps}</div>
					<DialogButtonRow themeId={this.props.themeId} okButtonShow={!this.isReadOnly()} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
				</div>
			</div>
		);
	}
}

export default NotePropertiesDialog;
