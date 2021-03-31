import { toSystemSlashes } from '@joplin/lib/path-utils';

export default function(string: string) {
	// This will get the src of the img tag
	let imagePath = string.match(/<img.+src=(?:"|')(.+?)(?:"|')(?:.+?)>/)[1];
	// The src will always start with file protocol, i.e file:///, which will have to be removed thus leaving the original path of the image which can be copied to the clipboard.
	imagePath = toSystemSlashes(imagePath.substring(8));

	return imagePath;
}
