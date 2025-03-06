import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import DialogButtonRow from './DialogButtonRow';
import Note from '@joplin/lib/models/Note';
import bridge from '../services/bridge';
import shim from '@joplin/lib/shim';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { focus } from '@joplin/lib/utils/focusHandler';
import Dialog from './Dialog';
import { formatDateTimeLocalToMs, formatMsToDateTimeLocal, formatMsToLocal } from '@joplin/utils/time';
const { clipboard } = require('electron');
const formatcoords = require('formatcoords');

interface Props {
	noteId: string;
	onClose: ()=> void;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onRevisionLinkClick: Function;
	themeId: number;
}

interface FormNote {
	id: string;
	deleted_time: number;
	location: string;
	markup_language: string;
	revisionsLink: string;
	source_url: string;
	todo_completed?: number;
	user_created_time: number;
	user_updated_time: number;
}

interface State {
	editedKey: string;
	formNote: FormNote;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	editedValue: any;
	isValid: {
		location: boolean;
	};
}

const uniqueId = (key: string) => `note-properties-dialog-${key}`;

const isPropertyDatetimeRelated = (key: string) => {
	return key === 'user_created_time' || key === 'user_updated_time' || key === 'deleted_time';
};

class NotePropertiesDialog extends React.Component<Props, State> {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private okButton: any;
	private keyToLabel_: Record<string, string>;
	private styleKey_: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private styles_: any;
	private inputRef: React.RefObject<HTMLInputElement>;

	public constructor(props: Props) {
		super(props);

		this.revisionsLink_click = this.revisionsLink_click.bind(this);
		this.buttonRow_click = this.buttonRow_click.bind(this);
		this.locationOnChange = this.locationOnChange.bind(this);
		this.okButton = React.createRef();
		this.inputRef = React.createRef();

		this.state = {
			formNote: null,
			editedKey: null,
			editedValue: null,
			isValid: {
				location: true,
			},
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
			user_updated_time: note.user_updated_time,
			user_created_time: note.user_created_time,
			source_url: note.source_url,
			location: '',
			revisionsLink: note.id,
			markup_language: Note.markupLanguageToLabel(note.markup_language),
			deleted_time: note.deleted_time,
		};

		if (note.todo_completed) {
			formNote.todo_completed = note.todo_completed;
		}

		if (Number(note.latitude) || Number(note.longitude)) {
			formNote.location = `${note.latitude}, ${note.longitude}`;
		}

		return formNote;
	}

	public formNoteToNote(formNote: FormNote) {
		const note: NoteEntity = { id: formNote.id, ...this.latLongFromLocation(formNote.location) };
		note.user_created_time = formNote.user_created_time;
		note.user_updated_time = formNote.user_updated_time;

		if (formNote.todo_completed) {
			note.todo_completed = formNote.todo_completed;
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
			display: 'inline-flex',
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

		this.styles_.invalidInput = {
			border: '1px solid',
			borderColor: theme.colorWarn,
		};

		this.styles_.invalidMessage = {
			marginTop: '0.3em',
			color: theme.color,
			fontSize: theme.fontSize * 0.9,
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
			// Opens datetime-local fields with calendar
			if (this.inputRef.current.showPicker) {
				this.inputRef.current.showPicker();
			} else if (this.inputRef.current) {
				focus('NotePropertiesDialog::editPropertyButtonClick', (this.inputRef.current));
			}
		}, 100);
	}

	public async saveProperty() {
		if (!this.state.editedKey) return null;

		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		return new Promise((resolve: Function) => {
			const newFormNote = { ...this.state.formNote };

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			(newFormNote as any)[this.state.editedKey] = this.state.editedValue;

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

	public async locationOnChange(event: React.ChangeEvent<HTMLInputElement>) {
		this.setState({ editedValue: event.target.value });
		if (!event.target.value) {
			this.setState({ isValid: { ...this.state.isValid, location: true } });
			return;
		}

		if (event.target.value.includes(',')) {
			const [lat, log] = event.target.value.split(',');
			if (parseFloat(lat) < 90 && parseFloat(lat) > -90 && parseFloat(log) < 180 && parseFloat(log) > -180) {
				this.setState({ isValid: { ...this.state.isValid, location: true } });
				return;
			}
		}

		this.setState({ isValid: { ...this.state.isValid, location: false } });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public createNoteField(key: keyof FormNote, value: any) {
		const styles = this.styles(this.props.themeId);
		const theme = themeStyle(this.props.themeId);
		const labelText = this.formatLabel(key);
		const labelComp = <label htmlFor={uniqueId(key)} role='rowheader' style={{ ...theme.textStyle, ...theme.controlBoxLabel }}>{labelText}</label>;
		let controlComp = null;
		let editComp = null;
		let editCompHandler = null;
		let editCompIcon = null;
		let editComDescription = null;

		const onKeyDown = (event: React.KeyboardEvent) => {
			if (event.keyCode === 13) {
				void this.saveProperty();
			} else if (event.keyCode === 27) {
				void this.cancelProperty();
			}
		};

		if (this.state.editedKey === key) {
			if (isPropertyDatetimeRelated(key)) {
				controlComp = <input
					type="datetime-local"
					defaultValue={formatMsToDateTimeLocal(value)}
					ref={this.inputRef}
					onChange={event => this.setState({ editedValue: formatDateTimeLocalToMs(event.target.value) })}
					onKeyDown={event => onKeyDown(event)}
					style={styles.input}
					id={uniqueId(key)}
					name={uniqueId(key)}
				/>;

				editCompHandler = () => {
					void this.saveProperty();
				};
				editCompIcon = 'fa-save';
				editComDescription = _('Save changes');
			} else if (this.state.editedKey === 'location') {
				controlComp = (
					<React.Fragment>
						<input
							defaultValue={value}
							type="text"
							ref={this.inputRef}
							onChange={this.locationOnChange}
							onKeyDown={event => onKeyDown(event)}
							style={this.state.isValid.location ? styles.input : { ...styles.input, ...styles.invalidInput }}
							id={uniqueId(key)}
							name={uniqueId(key)}
							aria-invalid={!this.state.isValid.location}
						/>
						{
							this.state.isValid.location ? null
								: <React.Fragment>
									<div aria-live='polite' style={styles.invalidMessage}>
										{_('Invalid format. E.g.: 48.8581372, 2.2926735')}
									</div>
								</React.Fragment>
						}
					</React.Fragment>
				);
			} else {
				controlComp = (
					<input
						defaultValue={value}
						type="text"
						ref={this.inputRef}
						onChange={event => {
							this.setState({ editedValue: event.target.value });
						}}
						onKeyDown={event => onKeyDown(event)}
						style={styles.input}
						id={uniqueId(key)}
						name={uniqueId(key)}
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
			} else if (isPropertyDatetimeRelated(key)) {
				displayedValue = formatMsToLocal(value);
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
				editComDescription = _('Edit');
			}

			// Add the copy icon and the 'copy on click' event
			if (key === 'id') {
				editCompIcon = 'fa-copy';
				editCompHandler = () => clipboard.writeText(value);
				editComDescription = _('Copy');
			}
		}

		if (editCompHandler && !this.isReadOnly()) {
			editComp = (
				<a
					href="#"
					onClick={editCompHandler}
					style={styles.editPropertyButton}
					aria-label={editComDescription}
					title={editComDescription}
				>
					<i className={`fas ${editCompIcon}`} aria-hidden="true"></i>
				</a>
			);
		}

		return (
			<div role='row' key={key} style={theme.controlBox} className="note-property-box">
				{labelComp}
				<span role='cell'>{controlComp} {editComp}</span>
			</div>
		);
	}

	public formatLabel(key: string) {
		if (this.keyToLabel_[key]) return this.keyToLabel_[key];
		return key;
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
			<Dialog onCancel={this.props.onClose}>
				<div style={theme.dialogTitle} id='note-properties-dialog-title'>{_('Note properties')}</div>
				<div role='table' aria-labelledby='note-properties-dialog-title'>
					{noteComps}
				</div>
				<DialogButtonRow themeId={this.props.themeId} okButtonShow={!this.isReadOnly()} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
			</Dialog>
		);
	}
}

export default NotePropertiesDialog;
