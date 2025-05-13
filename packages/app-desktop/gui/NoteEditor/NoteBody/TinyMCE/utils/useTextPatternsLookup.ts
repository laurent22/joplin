import { useRef } from 'react';

interface TextPatternOptions {
	enabled: boolean;
	enableMath: boolean;
}

const useTextPatternsLookup = ({ enabled, enableMath }: TextPatternOptions) => {
	const getTextPatterns = () => {
		if (!enabled) return [];

		return [
			// See https://www.tiny.cloud/docs/tinymce/latest/content-behavior-options/#text_patterns
			// for the default TinyMCE text patterns
			{ start: '==', end: '==', format: 'joplinHighlight' },
			// Only replace math if math rendering is enabled.
			enableMath && { start: '$', end: '$', cmd: 'joplinMath' },
			{ start: '`', end: '`', format: 'code' },
			{ start: '*', end: '*', format: 'italic' },
			{ start: '**', end: '**', format: 'bold' },
			{ start: '#', format: 'h1' },
			{ start: '##', format: 'h2' },
			{ start: '###', format: 'h3' },
			{ start: '####', format: 'h4' },
			{ start: '#####', format: 'h5' },
			{ start: '######', format: 'h6' },
			{ start: '1.', cmd: 'InsertOrderedList' },
			{ start: '*', cmd: 'InsertUnorderedList' },
			{ start: '-', cmd: 'InsertUnorderedList' },
		].filter(pattern => !!pattern);
	};

	// Store the lookup callback in a ref so that the editor doesn't need to be reloaded
	// to use the new patterns:
	const patternLookupRef = useRef(getTextPatterns);
	patternLookupRef.current = getTextPatterns;
	return patternLookupRef;
};

export default useTextPatternsLookup;
