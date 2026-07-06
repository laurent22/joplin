// This will run inside the CodeMirror Markdown editor in Joplin.
// The description: it finds the synonym option in the menu after right-clicking the word, captures the sentence, and loads the popup.

// References: Box Radius, Box Shadow and Z-index: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-radius
//            Colors: For the border, I used the same as Joplin by examining theirs inside Developer Tools and Element: --joplin-divider-color: #555555
//           For the orange, I used their warning color: --joplin-color-warn2: #ffcb81
//           For the rest, I tried to be slightly different than their black: --joplin-background-color3: #2E3138, and their white: --joplin-color: #dddddd, by making my own research.
// 		  I got my black from: https://www.color-hex.com/color-palette/5272
// 		  I got my white from: https://www.color-hex.com/color-palette/914
//

interface ContentScriptContext {
	postMessage: (message: unknown)=> Promise<unknown>;
}

interface CodeMirrorCursor {
	line: number;
	ch: number;
}

interface CodeMirrorEditor {
	getSelection: ()=> string;
	getCursor: (from?: string)=> CodeMirrorCursor;
	getValue: ()=> string;
}

interface CodeMirrorStatic {
	commands: Record<string, (cm: CodeMirrorEditor)=> void>;
}

export default function(context: ContentScriptContext) {
	return {
		plugin: function(CodeMirror: CodeMirrorStatic) {
			function splitIntoSentences(text: string) {
				return text.match(/[^.!?]+[.!?]?/g) || [];
			}

			function extractContext(
				fullText: string,
				cursorIndex: number,
				selectedWord: string,
			) {
				const sentences = splitIntoSentences(fullText);
				let charCount = 0;
				let targetSentenceIndex = 0;

				// Finds the sentence that contains the cursor
				for (let i = 0; i < sentences.length; i++) {
					charCount += sentences[i].length;
					if (charCount >= cursorIndex) {
						targetSentenceIndex = i;
						break;
					}
				}

				const targetSentence = (sentences[targetSentenceIndex] || '').trim();
				const wordsInSentence = targetSentence
					.split(/\s+/)
					.filter(
						(w: string) => w.toLowerCase() !== selectedWord.toLowerCase(),
					);

				// *It considers short sentences as ones with 5 words or lower. CAN BE CHANGED
				if (wordsInSentence.length < 5 && targetSentenceIndex > 0) {
					// If the sentence is too short or unfinished, it saves the previous sentence as well
					const prevSentence = (
						sentences[targetSentenceIndex - 1] || ''
					).trim();
					return `${prevSentence} ${targetSentence}`;
				}

				return targetSentence;
			}

			function removeExistingPopup() {
				// This clears out any other potential synonym finder in Joplin
				const existing = document.getElementById('synonym-popup');
				if (existing) existing.remove();
			}

			function showLoadingPopup() {
				// Shows the loading popup
				removeExistingPopup();

				if (!document.getElementById('synonym-spin-style')) {
					const style = document.createElement('style');
					style.id = 'synonym-spin-style';
					style.textContent = `
						@keyframes synonymSpin {
							to { transform: rotate(360deg); }
						}
					`;
					document.head.appendChild(style);
				}

				const popup = document.createElement('div');
				popup.id = 'synonym-popup';
				// Centers the popup to the middle of the screen. Comments need to be written above this string btw or else it creates errors!
				// References for the CSS Text string are found at the top
				popup.style.cssText = `
					position: fixed;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					background: #2b2b2b;
					color: #e0e0e0;
					border: 1px solid #555555;
					border-radius: 6px;
					padding: 14px 18px;
					font-size: 14px;
					font-family: sans-serif;
					box-shadow: 0 4px 16px rgba(0,0,0,0.5);
					z-index: 99999;
					min-width: 220px;
					display: flex;
					align-items: center;
					gap: 10px;
				`;

				const spinner = document.createElement('div'); // Adds the temporary loading symbol (the spinner)
				spinner.style.cssText = `
					width: 16px;
					height: 16px;
					border: 2px solid #555555;
					border-top: 2px solid #ffcb81;
					border-radius: 50%;
					animation: synonymSpin 0.8s linear infinite;
					flex-shrink: 0;
				`;

				const label = document.createElement('span');
				label.textContent = 'Finding suitable synonyms...';

				popup.appendChild(spinner);
				popup.appendChild(label);
				document.body.appendChild(popup);

				setTimeout(() => {
					// This closes the popup if the user clicks somewhere outside the box
					document.addEventListener('mousedown', function handler(e) {
						if (!popup.contains(e.target as Node)) {
							removeExistingPopup();
							document.removeEventListener('mousedown', handler);
						}
					});
				}, 100);
			}

			CodeMirror.commands.triggerSynonymFinder = function(cm: CodeMirrorEditor) {
				// For the context menu
				const selectedText = cm.getSelection().trim();

				// *Made it so the user can only select ONE word for it to find a synonym!!
				if (!selectedText || selectedText.includes(' ')) {
					console.warn('Synonym Finder: Please select a single word.');
					return;
				}

				const cursor = cm.getCursor('from');
				const fullText = cm.getValue(); // Captures the cursor position to extract the sentence
				const lines = fullText.split('\n');
				let charIndex = 0;
				for (let i = 0; i < cursor.line; i++) {
					charIndex += lines[i].length + 1;
				}
				charIndex += cursor.ch;

				const sentenceContext = extractContext(
					fullText,
					charIndex,
					selectedText,
				);
				showLoadingPopup();

				void context.postMessage({
					// This sends the word and the sentence context back to index.ts
					type: 'synonymRequest',
					word: selectedText,
					context: sentenceContext,
				});
			};
		},
		codeMirrorOptions: {},
	};

	// ADD CONTINUATION AFTER BACKEND IS DONE HERE
}
