import { join } from 'path/posix';
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
	/\[.*\]\((:\/[a-zA-Z0-9]{32})(?:\s+".*")?\)/gi,

	// Example: [foo]: :/12345678901234567890123456789012
	/\[.*\]:\s*(:\/[a-zA-Z0-9]{32})/gi,

	// Example: <img src=":/12345678901234567890123456789012"/>
	/<img[\s\S]*src=["'](:\/[a-zA-Z0-9]{32})["'][\s\S]*>/gi,

	// Example: <a href=":/12345678901234567890123456789012">
	/<a[\s\S]*href=["'](:\/[a-zA-Z0-9]{32})["'][\s\S]*>/gi,
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
	/\[.*\]\((\.\.?\/.*\.md)(?:\s+".*")?\)/gi,

	// // Example: [foo]: ./bar.md
	/\[.*\]:\s*(\.\.?\/.*\.md))/gi,

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

export default class LinkTracker {
	// private linkSourceIdToLinks_: Map<string, ItemLink> = new Map();

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

	public constructor(private tree: ItemTree, private linkType: LinkType) {}

	private resolveLinkToId(link: string, fromPath: string) {
		if (isIdLink(link)) {
			if (this.tree.hasId(link)) {
				return link;
			}
			return null;
		} else {
			const fullPath = join(fromPath, link);
			if (this.tree.hasPath(fullPath)) {
				return this.tree.idAtPath(fullPath);
			}
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

	public onItemMove(_item: FolderItem) {

	}

	public convertLinkTypes(text: string, fromPath: string) {
		let regexList;
		if (this.linkType === LinkType.IdLink) {
			regexList = idLinkRegexes;
		} else if (this.linkType === LinkType.PathLink) {
			regexList = pathLinkRegexes;
		} else {
			const exhaustivenessCheck: never = this.linkType;
			return exhaustivenessCheck;
		}

		// Path from fromPath to the root of the folder tree
		const pathToRoot = fromPath.replace(/([^/]+)\//, '../');

		for (const regex of regexList) {
			text = text.replace(regex, (match) => {
				const url = match[1];
				const targetId = this.resolveLinkToId(url, fromPath);

				// Can't resolve -- don't replace.
				if (!targetId) {
					return match[0];
				}

				let newUrl;
				if (this.linkType === LinkType.IdLink) {
					newUrl = targetId;
				} else if (this.linkType === LinkType.PathLink) {
					const targetPath = this.tree.pathFromId(targetId);
					newUrl = join(pathToRoot, targetPath);
				} else {
					const exhaustivenessCheck: never = this.linkType;
					return exhaustivenessCheck;
				}
				return match[0].replace(url, newUrl);
			});
		}

		return text;
	}
}
