import apache2 from '../licenseText/apache2';
import wordsMatch from './equalIgnoringSpacing';

const matchApache2 = (text: string) => {
	const termsEndString = 'END OF TERMS AND CONDITIONS';
	const termsEndStringIndex = text.indexOf(termsEndString);

	if (termsEndStringIndex === -1) {
		return null;
	}

	const termsEndIndex = termsEndStringIndex + termsEndString.length;
	const textWithoutAppendices = text.substring(0, termsEndIndex);

	if (!wordsMatch(apache2, textWithoutAppendices)) {
		return null;
	}

	const textAppendix = text.substring(termsEndIndex, text.length);

	return {
		appendix: textAppendix,
	};
};

export default matchApache2;
