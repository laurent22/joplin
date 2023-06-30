import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
	`The package 'react-native-saf-x' doesn't seem to be linked. Make sure: \n\n${
		Platform.select({ ios: '- You have run \'pod install\'\n', default: '' })
	}- You rebuilt the app after installing the package\n` +
	'- You are not using Expo managed workflow\n';

let SafX: SafxInterface;

if (Platform.OS === 'android') {
	SafX = (
		NativeModules.SafX
			? NativeModules.SafX
			: new Proxy(
				{},
				{
					get() {
						throw new Error(LINKING_ERROR);
					},
				}
			)
	) as SafxInterface;
} else {
	// @ts-ignore
	SafX = {};
}

export type Encoding = 'utf8' | 'base64' | 'ascii';

/** Native interface of the module */
interface SafxInterface {
  openDocumentTree(persist: boolean): Promise<DocumentFileDetail | null>;
  openDocument(
    persist: boolean,
    multiple: boolean,
  ): Promise<DocumentFileDetail[] | null>;
  createDocument(
    data: String,
    encoding?: String,
    initialName?: string,
    mimeType?: String,
  ): Promise<DocumentFileDetail | null>;
  hasPermission(uriString: string): Promise<boolean>;
  exists(uriString: string): Promise<boolean>;
  readFile(uriString: string, encoding?: Encoding): Promise<string>;
  writeFile(
    uriString: string,
    data: string,
    encoding?: Encoding,
    mimeType?: string,
    append?: boolean,
  ): Promise<void>;
  createFile(uriString: string, mimeType?: String): Promise<DocumentFileDetail>;
  unlink(uriString: string): Promise<boolean>;
  mkdir(uriString: string): Promise<DocumentFileDetail>;
  rename(uriString: string, newName: string): Promise<DocumentFileDetail>;
  getPersistedUriPermissions(): Promise<string[]>;
  releasePersistableUriPermission(uriString: string): Promise<void>;
  listFiles(uriString: string): Promise<DocumentFileDetail[]>;
  stat(uriString: string): Promise<DocumentFileDetail>;
  transferFile(
    srcUri: string,
    destUri: string,
    replaceIfDestExist: boolean,
    copy: boolean,
  ): Promise<DocumentFileDetail | null>;
}

export type DocumentFileDetail = {
  uri: string;
  name: string;
  type: 'directory' | 'file';
  lastModified: number;
  mime: string;
  size: number;
};

export type FileOperationOptions = {
  /** Defaults to `'utf8'` */
  encoding?: Encoding;

  /** Append data to the file. If not set file content will be overwritten. */
  append?: boolean;

  /** mime type of the file being saved. Defaults to '\*\/\*' */
  mimeType?: string;
};

export type CreateDocumentOptions = FileOperationOptions & {
  /** initial display name when opening file picker */
  initialName?: string;
};

/**
 * Open the Document Picker to select a folder. Read/Write Permission will be granted to the selected folder.
 * Returns an object of type `DocumentFileDetail` or `null` if user did not select a folder.
 */
export function openDocumentTree(persist: boolean) {
	return SafX.openDocumentTree(persist);
}

export type OpenDocumentOptions = {
  /** should the permission of returned document(s) be persisted ? */
  persist?: boolean;
  /** should the file picker allow multiple documents ? */
  multiple?: boolean;
};

/**
 * Open the Document Picker to select a file.
 * DocumentFileDetail is always an array.
 * @returns `DocumentFileDetail[]` or `null` if user did not select a file.
 */
export function openDocument(options: OpenDocumentOptions) {
	const { persist = false, multiple = false } = options;
	return SafX.openDocument(persist, multiple);
}

/**
 * Open the Document Picker to save a file.
 * Returns an object of type `DocumentFileDetail` or `null` if user did not select a file.
 */
export function createDocument(data: string, options?: CreateDocumentOptions) {
	if (!options) options = {};
	const { encoding, initialName, mimeType } = options;
	return SafX.createDocument(data, encoding, initialName, mimeType);
}

/** Check if you have permission to access the uri. */
export function hasPermission(uriString: string) {
	return SafX.hasPermission(uriString);
}

/** Check if there's a document located at the given uri. */
export function exists(uriString: string) {
	return SafX.exists(uriString);
}

/** Read contents of the given uri. uri must point to a file. */
export function readFile(
	uriString: string,
	options?: Pick<FileOperationOptions, 'encoding'>
) {
	if (!options) options = {};
	const { encoding } = options;
	return SafX.readFile(uriString, encoding);
}

/**
 * Writes the given data to the file at given uri.
 * Tries to create the file if does not already exist before writing to it.
 * Resolves with given uriString if successful.
 */
export function writeFile(
	uriString: string,
	data: string,
	options?: FileOperationOptions
) {
	if (!options) options = {};
	const { encoding, append, mimeType } = options;
	return SafX.writeFile(uriString, data, encoding, mimeType, !!append);
}

/**
 * Creates an empty file at given uri.
 * Rejects if a file or directory exist at given uri.
 */
export function createFile(
	uriString: string,
	options?: Pick<FileOperationOptions, 'mimeType'>
) {
	if (!options) options = {};
	const { mimeType } = options;
	return SafX.createFile(uriString, mimeType);
}

/**
 * Removes the file or directory at given uri.
 * Resolves with `true` if delete is successful, throws otherwise.
 */
export function unlink(uriString: string) {
	return SafX.unlink(uriString);
}

/**
 * Create a directory at given uri.
 * Automatically creates folders in path if needed.
 * You can use it to create nested directories easily.
 * Rejects if it fails.
 */
export function mkdir(uriString: string) {
	return SafX.mkdir(uriString);
}

/**
 * Renames the document at given uri.
 * uri can be file or folder.
 * Resolves with `true` if successful and `false` otherwise.
 */
export function rename(uriString: string, newName: string) {
	return SafX.rename(uriString, newName);
}

/** Returns a list of all the persisted uri permissions. */
export function getPersistedUriPermissions() {
	return SafX.getPersistedUriPermissions();
}

/** Remove a uri from persisted uri permissions list. */
export function releasePersistableUriPermission(uriString: string) {
	return SafX.releasePersistableUriPermission(uriString);
}

/** List all files and folders in a directory uri. */
export function listFiles(uriString: string) {
	return SafX.listFiles(uriString);
}

/** Get details for a file/directory at given uri. */
export function stat(uriString: string) {
	return SafX.stat(uriString);
}

type FileTransferOptions = {
  replaceIfDestinationExists?: boolean;
};

/**
 * Copy file from source uri to destination uri.
 * promise Rejects if destination already exists and `replaceIfDestinationExists` option is not set to true.
 * Does not support moving directories.
 */
export function copyFile(
	srcUri: string,
	destUri: string,
	options?: FileTransferOptions
) {
	if (!options) options = {};
	const { replaceIfDestinationExists = false } = options;
	return SafX.transferFile(srcUri, destUri, replaceIfDestinationExists, true);
}

/**
 * Move file from source uri to destination uri.
 * promise Rejects if destination already exists and `replaceIfDestinationExists` option is not set to true.
 * Does not support moving directories.
 */
export function moveFile(
	srcUri: string,
	destUri: string,
	options?: FileTransferOptions
) {
	if (!options) options = {};
	const { replaceIfDestinationExists = false } = options;
	return SafX.transferFile(srcUri, destUri, replaceIfDestinationExists, false);
}

export default {
	openDocumentTree,
	openDocument,
	createDocument,
	hasPermission,
	exists,
	readFile,
	writeFile,
	createFile,
	unlink,
	mkdir,
	rename,
	getPersistedUriPermissions,
	releasePersistableUriPermission,
	listFiles,
	stat,
	copyFile,
	moveFile,
};
