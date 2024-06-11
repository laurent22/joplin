import { stat } from 'fs-extra';
import { extname } from 'path';


const isSafeToOpen = async (path: string) => {
	// This is intended to fix an issue where some platforms would execute attachment
	// files without confirmation depending on the file extension (e.g. .EXE). This is
	// mostly for Windows.
	//
	// Below is a list of extensions that we should be able to safely pass to shell.openItem
	// without code execution.

	// Prevent CSpell from marking file extensions as misspellings:
	// cSpell:disable
	const generallySafeExtensions = [
		// Image files (see https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types)
		'.apng',
		'.avif',
		'.bmp',
		'.gif',
		'.heic',
		'.heics',
		'.ico',
		'.jpeg',
		'.jpg',
		'.pjp',
		'.pjpeg',
		'.png',
		'.svg',
		'.svgz',
		'.webp',
		'.tiff',
		'.tif',

		// Video files
		'.3g2',
		'.3gp',
		'.avi',
		'.divx',
		'.h261',
		'.h263',
		'.h264',
		'.jpgv',
		'.m4p',
		'.m4v',
		'.mk3d',
		'.mkv',
		'.mov',
		'.movie',
		'.mp4',
		'.mp4v',
		'.mpeg',
		'.mpg',
		'.mpg4',
		'.ogv',
		'.webm',
		'.wmv',

		// Audio files
		// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers#browser_compatibility
		'.3gp',
		'.aac',
		'.flac',
		'.m2a',
		'.m3a',
		'.m4a',
		'.mp2',
		'.mp3',
		'.mpga',
		'.oga',
		'.ogg',
		'.wav',
		'.wma',

		// Document files
		'.epub',
		'.pdf',
		'.txt',

		// By default (as of Feb 2024), Word/Excel disable macros by default, and should thus
		// be reasonably safe to include here. Pay attention to these Office extensions in the future.
		'.docx', // Word (no macros)
		'.odp',
		'.ods',
		'.odt',
		'.pptx', // PowerPoint (no macros)
		// '.psd', // PhotoShop
		// MS Word can try to convert RTF files, causing security issues: https://en.wikipedia.org/wiki/Rich_Text_Format#Security_concerns
		// However, macros are disabled by default in modern Office.
		// '.rtf',
		'.xlsx', // Excel (no macros)
		// '.xopp', // Xournal++ -- Can include LaTeX. Verify it's safe before including.

		// Text files
		'.c',
		'.cjs',
		'.cpp',
		'.css',
		'.csv',
		'.cxx',
		'.dart',
		'.go',
		'.h',
		'.hh',
		'.f', // Fortran
		'.for',
		'.f77',
		'.f90',
		'.hmm',
		'.hpp',
		'.hxx',
		'.java',
		'.json',
		'.json5',
		'.jsx',
		'.log',
		'.m',
		'.md',
		'.markdown',
		'.mdx',
		'.mjs',
		'.mm',
		'.patch',
		'.r',
		'.rmd',
		'.rs', // Rust
		'.sass',
		'.scss',
		'.sha256',
		'.sha512',
		'.swift',
		'.tex',
		'.toml',
		'.ts',
		'.tsv',
		'.tsx',
		'.xml',
		'.yaml',
		// .js may be set to run with Windows Script Host on some systems
		// .ml: OCaml
		// .py may be set to run with the system Python interpreter on some systems
		// .rkt: Racket

		// Archives
		'.7z',
		'.tar.gz',
		'.tar',
		'.zip',

		// Fonts
		'.ttf',
		'.woff',
		'.otf',

		// Calendar
		'.ics',
		'.ical',
		'.icalendar',

		// Joplin
		'.jex',
		// '.jpl', // Plugin files

		// Other
		'.htm',
		'.html',
		'.enex', // Evernote
		// '.desktop', // May be auto-executed on some Linux systems
	];
	// cSpell:enable

	const lowercasedPath = path.trim().toLowerCase();
	for (const ext of generallySafeExtensions) {
		if (lowercasedPath.endsWith(ext)) {
			return true;
		}
	}

	if (extname(path) === '' && (await stat(path)).isDirectory()) {
		return true;
	}

	return false;
};

export default isSafeToOpen;
