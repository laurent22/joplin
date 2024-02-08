import { htmlDocIsImageOnly } from '@joplin/renderer/htmlUtils';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('shouldPasteResources');

// We should only process the images if there is no plain text or HTML text in
// the clipboard. This is because certain applications, such as Word, are going
// to add multiple versions of the copied data to the clipboard - one with the
// text formatted as HTML, and one with the text as an image. In that case, we
// need to ignore the image and only process the HTML.
//
// Additional source of troubles is that when copying an image from Chrome, the
// clipboard will contain two elements: The actual image (type=image), and an
// HTML fragment with a link to the image. Most of the time getting the image
// from the HTML will work... except if some authentication is required to
// access the image. In that case we'll end up with dead link in the RTE. For
// that reason, when there's only an image in the HTML document, we process
// instead the clipboard resources, which will contain the actual image.
//
// We have a lot of log statements so that if someone reports a bug we can ask
// them to check the console and give us the messages they have.
export default (pastedText: string, pastedHtml: string, resourceMds: string[]) => {
	logger.info('Pasted text:', pastedText);
	logger.info('Pasted HTML:', pastedHtml);
	logger.info('Resources:', resourceMds);

	if (pastedText) {
		logger.info('Not pasting resources only because the clipboard contains plain text');
		return false;
	}

	if (pastedHtml) {
		if (!htmlDocIsImageOnly(pastedHtml)) {
			logger.info('Not pasting resources because the clipboard contains HTML, which contains more than just one image');
			return false;
		} else {
			logger.info('Not pasting HTML because it only contains one image.');
		}

		if (!resourceMds.length) {
			logger.info('Not pasting resources because there isn\'t any');
			return false;
		}
	}

	logger.info('Pasting resources');

	return true;
};
