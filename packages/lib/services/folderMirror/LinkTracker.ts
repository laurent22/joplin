import { dirname, join, relative } from 'path/posix';
import { ModelType } from '../../BaseModel';
import { NoteEntity } from '../database/types';
import ItemTree from './ItemTree';
import { FolderItem } from './types';
import debugLogger from './utils/debugLogger';

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

	// Example: <img src="../resources/foo.png"/>
	/<img[\s\S]*src=["'](\.\.?\/.*?)["'][\s\S]*>/gi,

	// Example: <a href="./a.md">
	/<a[\s\S]*href=["'](\.\.?\/.*?\.md)["'][\s\S]*>/gi,
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

const pathToLinkUrl = (targetPath: string, parentPath: string) => {
	const result = relative(parentPath, targetPath);
	if (result.startsWith('./') || result.startsWith('../')) {
		return result;
	}
	return `./${result}`;
};

const isIdLink = (link: string) => !!/:\/[a-zA-Z0-9]{32}/.exec(link);

type LinkSourceId = string;
type LinkTargetId = string;

type OnNoteUpdateCallback = (note: NoteEntity)=> Promise<void>;

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
	private unresolvedLinkToSourceId_: Map<string, Set<LinkSourceId>> = new Map();
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

	private normalizeLink(link: string, fromPath: string) {
		if (isIdLink(link)) return link;
		if (link.startsWith('./') || link.startsWith('../')) {
			return join(fromPath, link);
		}
		return link;
	}

	private resolveLinkToId(link: string, fromPath: string) {
		link = this.normalizeLink(link, fromPath);
		if (isIdLink(link)) {
			link = link.substring(':/'.length);
			if (this.tree.hasId(link)) {
				return link;
			}
		} else if (this.tree.hasPath(link)) {
			return this.tree.idAtPath(link);
		}
		return null;
	}

	public onItemUpdate(item: FolderItem) {
		if (item.type_ !== ModelType.Note) return;

		const note = (item as NoteEntity);
		const notePath = this.tree.pathFromId(note.id);
		const noteParentPath = dirname(notePath);
		const body = note.body;

		debugLogger.debug(`LinkTracker.onItemUpdate ${item.title}@${notePath}`);
		debugLogger.group();


		const links = this.linkType === LinkType.IdLink ? getIdLinks(body) : getPathLinks(body);
		debugLogger.debug('link count', links.length);

		for (const link of links) {
			const id = this.resolveLinkToId(link, noteParentPath);
			if (!id) {
				const normalizedLink = this.normalizeLink(link, noteParentPath);
				if (!this.unresolvedLinkToSourceId_.has(normalizedLink)) {
					this.unresolvedLinkToSourceId_.set(normalizedLink, new Set());
				}
				this.unresolvedLinkToSourceId_.get(normalizedLink).add(note.id);
				debugLogger.debug('marked link', link, 'to', normalizedLink, 'as unresolved');
			} else {
				if (!this.linkTargetIdToSource_.has(id)) {
					this.linkTargetIdToSource_.set(id, new Set());
				}
				this.linkTargetIdToSource_.get(id).add(note.id);
			}
		}

		for (const [link, sourceIds] of this.unresolvedLinkToSourceId_.entries()) {
			if (link === `:/${item.id}` || link === notePath) {
				debugLogger.debug('resolve', link);

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
		debugLogger.groupEnd();
	}

	public async onItemMove(item: FolderItem, fromPath: string, toPath: string) {
		// Updating links on item move is only necessary for path links
		if (this.linkType === LinkType.IdLink) return;

		const linkedItems = this.linkTargetIdToSource_.get(item.id);
		if (!linkedItems) {
			debugLogger.debug('LinkTracker.onItemMove/has no links', toPath);
			return;
		}

		debugLogger.debug('LinkTracker.onItemMove', fromPath, toPath);
		debugLogger.group();

		for (const itemId of linkedItems) {
			if (!this.tree.hasId(itemId)) {
				debugLogger.debug('skip item -- not in tree', itemId);
				continue;
			}

			const itemWithLink = this.tree.getAtId(itemId);
			if (itemWithLink.type_ === ModelType.Note) {
				debugLogger.debug('update linked item', this.tree.pathFromId(itemId));

				const note = itemWithLink as NoteEntity;
				const parentPath = dirname(this.tree.pathFromId(note.id));
				let body = note.body;
				for (const regex of pathLinkRegexes) {
					body = body.replace(regex, (match, oldUrl) => {
						const oldPath = this.normalizeLink(oldUrl, parentPath);
						if (oldPath !== fromPath) {
							debugLogger.debug('skip', match, 'because', oldPath, 'is not', fromPath);
							return match;
						}

						const newUrl = pathToLinkUrl(toPath, parentPath);
						const newLink = match.replace(oldUrl, newUrl);
						debugLogger.debug('update link', match, '->', newLink);
						return newLink;
					});
				}
				if (body !== note.body) {
					debugLogger.debug('Item body change in', itemWithLink.title, note.body, '->', body);
					await this.onNoteUpdate({
						...itemWithLink,
						body,
					});
				}
			}
		}

		debugLogger.groupEnd();
	}

	public convertLinkTypes(toType: LinkType, text: string, fromPath: string) {
		debugLogger.debug('convert link types to', toType, 'at', fromPath);
		debugLogger.group();

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

		for (const regex of otherLinkTypeRegexes) {
			text = text.replace(regex, (fullMatch, url) => {
				const targetId = this.resolveLinkToId(url, parentPath);

				// Can't resolve -- don't replace.
				if (!targetId) {
					debugLogger.debug('can\'t resolve:', url);
					return fullMatch;
				}

				let newUrl;
				if (toType === LinkType.IdLink) {
					newUrl = `:/${targetId}`;
				} else if (toType === LinkType.PathLink) {
					const targetPath = this.tree.pathFromId(targetId);
					newUrl = pathToLinkUrl(targetPath, parentPath);
				} else {
					const exhaustivenessCheck: never = toType;
					return exhaustivenessCheck;
				}
				debugLogger.debug('new', url, '->', newUrl);

				return fullMatch.replace(url, newUrl);
			});
			debugLogger.debug('scanned', text, 'with', regex);
		}

		debugLogger.groupEnd();
		return text;
	}
}
