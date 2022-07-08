/**
 * Describes an inline region's formatting. For example, an italicized region.
 */

import { Text as DocumentText, SelectionRange } from '@codemirror/state';

export default class RegionSpec {
	// Patterns to use when creating an instance of the tag.
	// E.g.
	//   templateStart=**
	//   templateStop=**
	//  would be used to create
	//   **content here**
	public templateStart: string;
	public templateStop: string;

	// Size of the buffer used to check for a match.
	// Particularly useful for [startExp], [stopExp].
	// Only used when the selection is empty.
	protected startBuffSize: number;
	protected stopBuffSize: number;

	// Regular expressions for matching possible starting/stopping
	// regions.
	protected startExp?: RegExp;
	protected stopExp?: RegExp;

	public constructor({
		templateStart, templateStop,
		startExp, stopExp,
		startBuffSize, stopBuffSize,
	}: {
			templateStart: string; templateStop: string;
			startExp?: RegExp; stopExp?: RegExp;
			startBuffSize?: number; stopBuffSize?: number;
	}) {
		this.templateStart = templateStart;
		this.templateStop = templateStop;
		this.startExp = startExp;
		this.stopExp = stopExp;
		this.startBuffSize = startBuffSize ?? this.templateStart.length;
		this.stopBuffSize = stopBuffSize ?? this.templateStop.length;
	}


	/**
	 * Returns the length of a match for this in [searchText], matching either
	 * [template] or [regex], starting at [startIndex] or ending at [endIndex].
	 * Note that the [regex], if provided, must have the global flag enabled.
	 */
	private matchLen({
		searchText, template, startIndex, endIndex, regex,
	}: {
		searchText: string; template: string;
		startIndex: number; endIndex: number; regex?: RegExp;
	}): number {
		let matchLength, matchIndex;

		// Returns true if [idx] is in the right place (the match is at
		// the end of the string or the beginning based on startIndex/endIndex).
		const indexSatisfies = (idx: number, len: number): boolean => {
			return (startIndex == -1 || idx == startIndex)
				&& (endIndex == -1 || idx == endIndex - len);
		};

		if (regex) {
			// Enforce 'g' flag.
			if (regex.flags.indexOf('g') == -1) {
				throw new Error('Regular expressions used by RegionSpec must have the global flag!');
			}

			// Search from the beginning.
			regex!.lastIndex = 0;

			let foundMatch = null;
			let match;
			while ((match = regex!.exec(searchText)) !== null) {
				if (indexSatisfies(match.index, match[0].length)) {
					foundMatch = match;
					break;
				}
			}

			if (!foundMatch) {
				return -1;
			}

			matchLength = foundMatch[0].length;
			matchIndex = foundMatch.index;
		} else {
			if (startIndex != -1) {
				matchIndex = searchText.indexOf(template);
			} else {
				matchIndex = searchText.lastIndexOf(template);
			}

			if (matchIndex == -1) {
				return -1;
			}

			matchLength = template.length;
		}
		// If the match isn't in the right place,
		if (!indexSatisfies(matchIndex, matchLength)) {
			return -1;
		}

		return matchLength;
	}

	/**
	 * @param doc The `Document` that contains `sel`
	 * @param sel the region to search for a match. If empty, searches for a match
	 * 	immediately  before `sel`.
	 * @return the length of the found match, or -1 if no match is found.
	 */
	public matchStart(doc: DocumentText, sel: SelectionRange): number {
		let searchText;
		if (sel.empty) {
			searchText = doc.sliceString(sel.from - this.startBuffSize, sel.from);
		} else {
			searchText = doc.sliceString(sel.from, sel.to);
		}

		return this.matchLen({
			searchText,
			template: this.templateStart,
			startIndex: 0,
			endIndex: -1,
			regex: this.startExp,
		});
	}

	/**
	 * @see matchStart
	 */
	public matchStop(doc: DocumentText, sel: SelectionRange): number {
		let searchText;
		if (sel.empty) {
			searchText = doc.sliceString(sel.to, sel.to + this.stopBuffSize);
		} else {
			searchText = doc.sliceString(sel.from, sel.to);
		}

		return this.matchLen({
			searchText,
			template: this.templateStop,
			startIndex: -1,
			endIndex: searchText.length,
			regex: this.stopExp,
		});
	}
}
