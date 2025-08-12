import { syntaxTree } from '@codemirror/language';
import { EditorState, StateField } from '@codemirror/state';
import { EditorView, showTooltip, Tooltip } from '@codemirror/view';
import referenceLinkStateField from './referenceLinksStateField';
import getUrlAtPosition from './utils/getUrlAtPosition';
import openLink from './utils/openLink';
import ctrlClickLinksExtension from './ctrlClickLinksExtension';


type OnOpenLink = (url: string, view: EditorView)=> void;

// Returns tooltips for the links under the cursor(s).
const getLinkTooltips = (onOpenLink: OnOpenLink, state: EditorState) => {
	const tree = syntaxTree(state);
	return state.selection.ranges.map((range): Tooltip|null => {
		if (!range.empty) return null;
		const url = getUrlAtPosition(range.anchor, tree, state);
		if (!url) return null;

		return {
			pos: range.head,
			arrow: true,
			create: (view) => {
				const dom = document.createElement('div');
				dom.classList.add('cm-md-link-tooltip');

				const link = document.createElement('button');
				link.role = 'link';
				link.textContent = `🔗 ${url.url}${url.label ? `: ${url.label}` : ''}`;
				link.title = state.phrase('Follow link: $1', url.url);
				link.onclick = () => {
					onOpenLink(url.url, view);
				};

				dom.appendChild(link);

				return { dom };
			},
		};
	}).filter(tooltip => !!tooltip) as Tooltip[];
};

const followLinkTooltip = (onOpenExternalLink: OnOpenLink) => {
	const onOpenLink = (link: string, view: EditorView) => {
		openLink(link, view, onOpenExternalLink);
	};

	const followLinkTooltipField = StateField.define<readonly Tooltip[]>({
		create: state => getLinkTooltips(onOpenLink, state),
		update: (tooltips, transaction) => {
			if (!transaction.docChanged && !transaction.selection) {
				return tooltips;
			}

			return getLinkTooltips(onOpenLink, transaction.state);
		},
		provide: field => {
			const tooltipsFromState = (state: EditorState) => state.field(field);
			return showTooltip.computeN([field], tooltipsFromState);
		},
	});

	return [
		referenceLinkStateField,
		EditorView.theme({
			'& .cm-md-link-tooltip > button': {
				backgroundColor: 'transparent',
				border: 'transparent',
				fontSize: 'inherit',

				whiteSpace: 'pre',
				maxWidth: '95vw',
				textOverflow: 'ellipsis',
				overflowX: 'hidden',

				textDecoration: 'underline',
				cursor: 'pointer',
				color: 'var(--joplin-url-color)',
			},
		}),
		followLinkTooltipField,
		ctrlClickLinksExtension(onOpenExternalLink),
	];
};

export default followLinkTooltip;
