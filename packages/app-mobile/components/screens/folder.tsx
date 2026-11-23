import * as React from 'react';

import { View, StyleSheet, Button, Platform } from 'react-native';
import { connect } from 'react-redux';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';
import uuid from '@joplin/lib/uuid';
import BaseModel from '@joplin/lib/BaseModel';
import { ScreenHeader } from '../ScreenHeader';
import { BaseScreenComponent } from '../base-screen';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';
import FolderPicker from '../FolderPicker';
import TextInput from '../TextInput';
import { FolderEntity, FolderIconType } from '@joplin/lib/services/database/types';
import { AppState } from '../../utils/types';
import { Dispatch } from 'redux';
import SidebarIcon from '../SideMenuContent/SidebarIcon';
import pickDocument from '../../utils/pickDocument';
import resizeImage from '../../utils/image/resizeImage';
import firstEmoji from '../../utils/firstEmoji';
import type FsDriverWeb from '../../utils/fs-driver/fs-driver-rn.web';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('screens/folder');

interface Props {
	folderId: string;
	selectedFolderId: string;
	themeId: number;
	folders: FolderEntity[];
	dispatch: Dispatch;
}

interface State {
	folder: FolderEntity;
	lastSavedFolder: FolderEntity|null;
	imageProcessing: boolean;
}

class FolderScreenComponent extends BaseScreenComponent<Props, State> {
	private imageOperationId = 0;

	public constructor(props: Props) {
		super(props);
		this.state = {
			folder: Folder.new(),
			lastSavedFolder: null,
			imageProcessing: false,
		};
	}

	public override UNSAFE_componentWillMount() {
		if (!this.props.folderId) {
			const folder = Folder.new();
			this.setState({
				folder: folder,
				lastSavedFolder: { ...folder },
			});
		} else {
			// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			void Folder.load(this.props.folderId).then(folder => {
				this.setState({
					folder: folder,
					lastSavedFolder: { ...folder },
				});
			});
		}
	}

	private isModified() {
		if (!this.state.folder || !this.state.lastSavedFolder) return false;
		const diff = BaseModel.diffObjects(this.state.folder, this.state.lastSavedFolder);
		delete diff.type_;
		return !!Object.getOwnPropertyNames(diff).length;
	}

	private folderComponent_change(propName: keyof FolderEntity, propValue: string) {
		this.setState((prevState) => {
			const folder = {
				...prevState.folder,
				[propName]: propValue,
			};
			return { folder: folder };
		});
	}

	private title_changeText(text: string) {
		this.folderComponent_change('title', text);
	}

	private parent_changeValue(parent: string) {
		this.folderComponent_change('parent_id', parent);
	}

	private emoji_changeText(emoji: string) {
		const selectedEmoji = firstEmoji(emoji);
		this.icon_change(selectedEmoji ? Folder.serializeIcon({ type: FolderIconType.Emoji, emoji: selectedEmoji, name: '', dataUrl: '' }) : '');
	}

	private icon_change(icon: string) {
		this.imageOperationId++;
		this.setState(prevState => ({
			folder: { ...prevState.folder, icon },
			imageProcessing: false,
		}));
	}

	private async showImageError(error: Error) {
		try {
			await shim.showErrorDialog(_('The notebook icon could not be set: %s', error.message));
		} catch (dialogError) {
			logger.error('Could not show notebook icon error dialog:', dialogError);
		}
	}

	private async selectImage_onPress() {
		try {
			await this.selectImage();
		} catch (error) {
			logger.error('Could not select notebook icon:', error);
		}
	}

	private async selectImage() {
		const operationId = ++this.imageOperationId;
		this.setState({ imageProcessing: true });
		const tempPath = `${Setting.value('tempDir')}/${uuid.createNano()}`;
		let resizedPath = `${tempPath}.jpg`;
		let pickedVirtualFilePath: string|null = null;
		try {
			const [file] = await pickDocument();
			if (!file) return;
			if (Platform.OS === 'web') pickedVirtualFilePath = file.uri;
			if (!['image/jpeg', 'image/png'].includes(file.type) && !/\.(jpe?g|png)$/i.test(file.fileName)) {
				throw new Error(_('Unsupported image type: %s', file.type || file.fileName));
			}
			const isPng = file.type === 'image/png' || /\.png$/i.test(file.fileName);
			resizedPath = `${tempPath}.${isPng ? 'png' : 'jpg'}`;

			const sourcePath = Platform.OS === 'ios' ? decodeURIComponent(file.uri) : file.uri;
			await shim.fsDriver().copy(sourcePath, tempPath);
			await resizeImage({ inputPath: tempPath, outputPath: resizedPath, maxWidth: 256, maxHeight: 256, format: isPng ? 'PNG' : 'JPEG', quality: 0.8 });
			const base64 = await shim.fsDriver().readFile(resizedPath, 'base64');
			if (operationId !== this.imageOperationId) return;
			const icon = Folder.serializeIcon({
				type: FolderIconType.DataUrl, emoji: '', name: '', dataUrl: `data:image/${isPng ? 'png' : 'jpeg'};base64,${base64}`,
			});
			this.setState(prevState => ({ folder: { ...prevState.folder, icon }, imageProcessing: false }));
		} catch (error) {
			if (operationId === this.imageOperationId) void this.showImageError(error);
		} finally {
			if (operationId === this.imageOperationId) this.setState({ imageProcessing: false });
			if (pickedVirtualFilePath) {
				try {
					await (shim.fsDriver() as FsDriverWeb).releaseReadOnlyVirtualFile(pickedVirtualFilePath);
				} catch (error) {
					logger.warn('Could not release selected notebook icon file:', error);
				}
			}
			await Promise.all([tempPath, resizedPath].map(async path => {
				try {
					if (await shim.fsDriver().exists(path)) await shim.fsDriver().remove(path);
				} catch (error) {
					logger.warn(`Could not remove temporary notebook icon file ${path}:`, error);
				}
			}));
		}
	}


	private async saveFolderButton_press() {
		if (this.state.imageProcessing) return;
		let folder = { ...this.state.folder };

		try {
			if (folder.id && !(await Folder.canNestUnder(folder.id, folder.parent_id))) throw new Error(_('Cannot move notebook to this location'));
			folder = await Folder.save(folder, { userSideValidation: true });
		} catch (error) {
			void shim.showErrorDialog(_('The notebook could not be saved: %s', error.message));
			return;
		}

		this.setState({
			lastSavedFolder: { ...folder },
			folder: folder,
		});

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	}

	public override render() {
		const saveButtonDisabled = this.state.imageProcessing || !this.isModified() || !this.state.folder.title;
		const icon = Folder.unserializeIcon(this.state.folder.icon);

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader title={_('Edit notebook')} showSaveButton={true} saveButtonDisabled={saveButtonDisabled} onSaveButtonPress={() => this.saveFolderButton_press()} showSideMenuButton={false} showSearchButton={false} />
				<TextInput
					themeId={this.props.themeId}
					placeholder={_('Enter notebook title')}
					autoFocus={true}
					value={this.state.folder.title}
					onChangeText={text => this.title_changeText(text)}
					editable={!this.state.folder.encryption_applied}
				/>
				<View style={styles.folderPickerContainer}>
					<FolderPicker
						themeId={this.props.themeId}
						placeholder={_('Select parent notebook')}
						folders={Folder.getRealFolders(this.props.folders)}
						selectedFolderId={this.state.folder.parent_id}
						onValueChange={newValue => this.parent_changeValue(newValue)}
						mustSelect
					/>
				</View>
				<View style={styles.iconContainer}>
					{icon && <SidebarIcon icon={icon} />}
					<TextInput
						style={styles.emojiInput}
						themeId={this.props.themeId}
						placeholder={_('Enter emoji')}
						value={icon?.type === FolderIconType.Emoji ? icon.emoji : ''}
						onChangeText={text => this.emoji_changeText(text)}
					/>
				</View>
				<View style={styles.iconButtons}>
					<Button title={_('Select image...')} onPress={() => void this.selectImage_onPress()} />
					{icon && <Button title={_('Clear')} onPress={() => this.icon_change('')} />}
				</View>
				<View style={{ flex: 1 }} />
			</View>
		);
	}
}

export default connect((state: AppState) => {
	return {
		folderId: state.selectedFolderId,
		themeId: state.settings.theme,
		folders: state.folders.filter((folder) => folder.id !== state.selectedFolderId),
	};
})(FolderScreenComponent);

const styles = StyleSheet.create({
	folderPickerContainer: {
		height: 46,
		paddingLeft: 14,
		paddingRight: 14,
		paddingTop: 12,
		paddingBottom: 12,
	},
	iconContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 14,
		paddingRight: 14,
	},
	emojiInput: {
		flex: 1,
	},
	iconButtons: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
});

