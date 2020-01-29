const React = require('react');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Folder = require('lib/models/Folder');

class NotebookPropertiesDialog extends React.Component {
	constructor() {
		super();

		this.buttonRow_click = this.buttonRow_click.bind(this);
		this.okButton = React.createRef();

		this.state = {
			formNotebook: null,
			editedKey: null,
			editedValue: null,
		};

		this.keyToLabel_ = {
			title: _('Name'),
			icon: _('Icon'),
		};
	}

	componentDidMount() {
		this.loadNotebook(this.props.folderId);
	}

	componentDidUpdate() {
		if (this.state.editedKey == null) {
			this.okButton.current.focus();
		}
	}

	async loadNotebook(folderId) {
		if (!folderId) {
			this.setState({ formNotebook: null });
		} else {
			const notebook = await Folder.load(folderId);
			const formNotebook = this.notebookToFormNotebook(notebook);
			this.setState({ formNotebook: formNotebook });
		}
	}

	notebookToFormNotebook(notebook) {
		const formNotebook = {};

		formNotebook.title = notebook.title;
		formNotebook.icon = notebook.icon;

		return formNotebook;
	}

	formNotebookToNotebook(formNotebook) {
		const notebook = {};
		notebook.title = formNotebook.title;
		notebook.icon = formNotebook.icon;

		return notebook;
	}

	styles(themeId) {
		const styleKey = themeId;
		if (styleKey === this.styleKey_) return this.styles_;

		const theme = themeStyle(themeId);

		this.styles_ = {};
		this.styleKey_ = styleKey;

		this.styles_.controlBox = {
			marginBottom: '1em',
			color: 'black',
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
			const notebook = this.formNotebookToNotebook(this.state.formNotebook);
			await Folder.save(notebook, { autoTimestamp: false });
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

		setTimeout(() => {
			this.refs.editField.focus();
		}, 100);
	}

	async saveProperty() {
		if (!this.state.editedKey) return;

		return new Promise((resolve) => {
			const newFormNotebook = Object.assign({}, this.state.formNotebook);
			newFormNotebook[this.state.editedKey] = this.state.editedValue;

			this.setState(
				{
					formNotebook: newFormNotebook,
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

	createNotebookField(key, value) {
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
						this.setState({ editedValue: event.target.value });
					}}
					onKeyDown={event => onKeyDown(event)}
					style={styles.input}
				/>
			);
		} else if (['title', 'icon'].indexOf(key) < 0) {
			editCompHandler = () => {
				this.editPropertyButtonClick(key, value);
			};
			editCompIcon = 'fa-edit';
		}

		if (editCompHandler) {
			editComp = (
				<a href="#" onClick={editCompHandler} style={styles.editPropertyButton}>
					<i className={`fa ${editCompIcon}`} aria-hidden="true"></i>
				</a>
			);
		}
		return (
			<div key={key} style={this.styles_.controlBox} className="notebook-property-box">
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

	formatValue(key, notebook) {
		return notebook[key];
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const formNotebook = this.state.formNotebook;

		const notebookComps = [];

		if (formNotebook) {
			for (let key in formNotebook) {
				if (!formNotebook.hasOwnProperty(key)) continue;
				const comp = this.createNotebookField(key, formNotebook[key]);
				notebookComps.push(comp);
			}
		}

		return (
			<div style={theme.dialogModalLayer}>
				<div style={theme.dialogBox}>
					<div style={theme.dialogTitle}>{_('Notebook Properties')}</div>
					<div>{notebookComps}</div>
					<DialogButtonRow theme={this.props.theme} okButtonRef={this.okButton} onClick={this.buttonRow_click}/>
				</div>
			</div>
		);
	}
}

module.exports = NotebookPropertiesDialog;
