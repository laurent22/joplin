import { dirname, join } from 'path/posix';
import { ModelType } from '../../BaseModel';
import { NoteEntity } from '../database/types';
import ItemTree from './ItemTree';
import { FolderItem } from './types';

export enum LinkType {
	PathLink = 'pathLink',
	IdLink = 'idLink',
}

// TODO: Some of these are taken from urlUtils.js
const idLinkRegexes = [
	// Example: [foo](:/12345678901234567890123456789012)
	/\]\((:\/[a-zA-Z0-9]{32})(?:\s+".*?")?\)/gi,

	// Example: [foo]: :/12345678901234567890123456789012
	/\]:\s*(:\/[a-zA-Z0-9]{32})/gi,

	// Example: <img src=":/12345678901234567890123456789012"/>
	/<img[\s\S]*?src=["'](:\/[a-zA-Z0-9]{32})["'][\s\S]*?>/gi,

	// Example: <a href=":/12345678901234567890123456789012">
	/<a[\s\S]*?href=["'](:\/[a-zA-Z0-9]{32})["'][\s\S]*?>/gi,
];
const getIdLinks = (text: string) => {
	const linkIds: string[] = [];
	for (const regex of idLinkRegexes) {
		while (true) {
			const match = regex.exec(text);
			if (!match) break;

			linkIds.push(match[1]);
		}
	}

	return linkIds;
};


const pathLinkRegexes = [
	// Example: [foo](./foo.md)
	/\]\((\.\.?\/.*?\.md)(?:\s+".*?")?\)/gi,

	// // Example: [foo]: ./bar.md
	/[\n]\[[^\]]*\]:\s*(\.\.?\/.*?\.md)/gi,

	// // Example: <img src=":/12345678901234567890123456789012"/>
	// /<img[\s\S]*src=["']\.\/(\.\/.*)["'][\s\S]*>/gi,

	// // Example: <a href=":/12345678901234567890123456789012">
	// /<a[\s\S]*href=["']:\/([a-zA-Z0-9]{32})["'][\s\S]*>/gi,
];
const getPathLinks = (text: string) => {

	const linkPaths: string[] = [];
	for (const regex of pathLinkRegexes) {
		while (true) {
			const match = regex.exec(text);
			if (!match) break;

			linkPaths.push(match[1]);
		}
	}

	return linkPaths;
};

const isIdLink = (link: string) => !!/:\/[a-zA-Z0-9]{32}/.exec(link);

type LinkSourceId = string;
type LinkTargetId = string;

type OnNoteUpdateCallback = (note: NoteEntity)=>Promise<void>;

export default class LinkTracker {
	// We can have both resolved and unresolved links.
	//
	// Unresolved links are broken edges in the note graph and can happen because a link
	// points outside of a synced folder, or the target item hasn't been processed yet.
	//
	// It's important to resolve links as soon as possible to properly handle link updates
	// when items are renamed.
	//
	// Link sources are always IDs
	private linkTargetIdToSource_: Map<LinkTargetId, Set<LinkSourceId>> = new Map();
	private unresolvedLinkToSourceId_: Map<LinkSourceId, Set<string>> = new Map();
	private tree: ItemTree;

	public constructor(private linkType: LinkType, private onNoteUpdate: OnNoteUpdateCallback) {
	}

	public setTree(tree: ItemTree) {
		this.tree = tree;
	}

	public reset() {
		this.linkTargetIdToSource_.clear();
		this.unresolvedLinkToSourceId_.clear();
	}

	private resolveLinkToId(link: string, fromPath: string) {
		if (isIdLink(link)) {
			link = link.substring(':/'.length);
			if (this.tree.hasId(link)) {
				return link;
			}
			return null;
		} else {
			const fullPath = join(fromPath, link);
			if (this.tree.hasPath(fullPath)) {
				return this.tree.idAtPath(fullPath);
			}
			console.log('tree lacks', fullPath, this.tree);
			return null;
		}
	}

	public onItemUpdate(item: FolderItem) {
		if (item.type_ !== ModelType.Note) return;

		const note = (item as NoteEntity);
		const notePath = this.tree.pathFromId(note.id);
		const body = note.body;

		const links = this.linkType === LinkType.IdLink ? getIdLinks(body) : getPathLinks(body);
		for (const link of links) {
			const id = this.resolveLinkToId(link, notePath);
			if (!id) {
				if (!this.unresolvedLinkToSourceId_.has(link)) {
					this.unresolvedLinkToSourceId_.set(link, new Set());
				}
				this.unresolvedLinkToSourceId_.get(link).add(note.id);
			} else {
				if (!this.linkTargetIdToSource_.has(id)) {
					this.linkTargetIdToSource_.set(id, new Set());
				}
				this.linkTargetIdToSource_.get(id).add(note.id);
			}
		}

		for (const [link, sourceIds] of this.unresolvedLinkToSourceId_.entries()) {
			if (link === `:/${item.id}` || link === notePath) {
				this.unresolvedLinkToSourceId_.delete(link);
				const targetId = note.id;
				if (!this.linkTargetIdToSource_.has(targetId)) {
					this.linkTargetIdToSource_.set(targetId, new Set());
				}
				for (const id of sourceIds) {
					this.linkTargetIdToSource_.get(targetId).add(id);
				}
			}
		}
	}

	public async onItemMove(item: FolderItem, fromPath: string, toPath: string) {
		// Updating links on item move is only necessary for path links
		if (this.linkType === LinkType.IdLink) return;

		const linkedItems = this.linkTargetIdToSource_.get(item.id);
		if (!linkedItems) return;

		for (const itemId of linkedItems) {
			if (!this.tree.hasId(itemId)) continue;
		
			const itemWithLink = this.tree.getAtId(itemId);
			if (itemWithLink.type_ === ModelType.Note) {
				const note = itemWithLink as NoteEntity;
				let body = note.body;
				for (const regex of pathLinkRegexes) {
					body = body.replace(regex, (match) => {
						return match.replace(fromPath, toPath);
					});
				}
				await this.onNoteUpdate({
					...itemWithLink,
					body,
				});
			}
		}
	}

	public convertLinkTypes(toType: LinkType, text: string, fromPath: string) {
		console.log('convert link types to', toType);
		let otherLinkTypeRegexes;
		if (toType === LinkType.IdLink) {
			otherLinkTypeRegexes = pathLinkRegexes;
		} else if (toType === LinkType.PathLink) {
			otherLinkTypeRegexes = idLinkRegexes;
		} else {
			const exhaustivenessCheck: never = toType;
			return exhaustivenessCheck;
		}

		// Path from fromPath to the root of the folder tree
		const parentPath = dirname(fromPath);
		const pathToRoot = parentPath.replace(/([^/]+)(\/|$)/, '../');
		console.log('to root', pathToRoot, 'from parent', parentPath);

		for (const regex of otherLinkTypeRegexes) {
			text = text.replace(regex, (fullMatch, url) => {
				const targetId = this.resolveLinkToId(url, parentPath);

				// Can't resolve -- don't replace.
				if (!targetId) {
					console.log('no', url);
					return fullMatch;
				}

				let newUrl;
				if (toType === LinkType.IdLink) {
					newUrl = `:/${targetId}`;
				} else if (toType === LinkType.PathLink) {
					const targetPath = this.tree.pathFromId(targetId);
					newUrl = `./${join(pathToRoot, targetPath)}`;
				} else {
					const exhaustivenessCheck: never = toType;
					return exhaustivenessCheck;
				}
				console.log('new', url, '->', newUrl);

				return fullMatch.replace(url, newUrl);
			});
			console.log('scanned', text, 'with', regex);
		}

		return text;
	}
}
