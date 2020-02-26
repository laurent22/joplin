const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Folder = require('lib/models/Folder');

class FolderPropertiesDialog extends React.Component {
	constructor() {
		super();

		this.buttonRow_click = this.buttonRow_click.bind(this);
		this.okButton = React.createRef();

		this.state = {
			formFolder: null,
			editedKey: null,
			editedValue: null,
		};

		this.keyToLabel_ = {
			id: _('ID'),
			title: _('Name'),
			icon: _('Icon'),
		};
	}

	componentDidMount() {
		this.loadFolder(this.props.folderId);
	}

	componentDidUpdate() {
		if (this.state.editedKey == null) {
			this.okButton.current.focus();
		}
	}

	async loadFolder(folderId) {
		if (!folderId) {
			this.setState({ formFolder: null });
		} else {
			const folder = await Folder.load(folderId);
			const formFolder = this.folderToFormFolder(folder);
			this.setState({ formFolder: formFolder });
		}
	}

	folderToFormFolder(folder) {
		const formFolder = {};

		formFolder.id = folder.id;
		formFolder.title = folder.title;
		formFolder.icon = folder.icon;

		return formFolder;
	}

	formFolderToFolder(formFolder) {
		const folder = Object.assign({
			id: formFolder.id,
			title: formFolder.title,
			icon: formFolder.icon,
		});
		return folder;
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
			const folder = this.formFolderToFolder(this.state.formFolder);
			await Folder.save(folder, { autoTimestamp: false });
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


	editPropertyButtonClick(key, initialValue) {
		this.setState({
			editedKey: key,
			editedValue: initialValue,
		});

	}

	async saveProperty() {
		if (!this.state.editedKey) return;
		return new Promise((resolve) => {
			const newFormFolder = Object.assign({}, this.state.formFolder);
			newFormFolder[this.state.editedKey] = this.state.editedValue;
			this.setState(
				{
					formFolder: newFormFolder,
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

	createFolderField(key, value) {
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
			controlComp = (
				<input
					defaultValue={value}
					type="text"
					ref="editField"
					onChange={event => {
						this.setState({
							editedKey: key,
							editedValue: event.target.value,
						});
					}}
					onKeyDown={event => onKeyDown(event)}
					style={styles.input}
				/>
			);
			editCompHandler = () => {
				this.saveProperty();
			};
			editCompIcon = 'fa-save';
		} else {
			let displayedValue = value;

			controlComp = <div style={Object.assign({}, theme.textStyle, { display: 'inline-block' })}>{displayedValue}</div>;

			if (['id'].indexOf(key) < 0) {
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

	formatValue(key, folder) {
		return folder[key];
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const formFolder = this.state.formFolder;

		const folderComps = [];

		if (formFolder) {
			for (let key in formFolder) {
				if (!formFolder.hasOwnProperty(key)) continue;
				const comp = this.createFolderField(key, formFolder[key]);
				folderComps.push(comp);
			}
		}

		return (
			<div style={theme.dialogModalLayer}>
				<div style={theme.dialogBox}>
					<div style={theme.dialogTitle}>{_('Notebook properties')}</div>
					<div>{folderComps}</div>
					<DialogButtonRow theme={this.props.theme} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
				</div>
			</div>
		);
	}
}

module.exports = FolderPropertiesDialog;
