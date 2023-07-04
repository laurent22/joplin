import * as Mustache from 'mustache';
import * as fs from 'fs-extra';
import { extname } from 'path';
import config, { fullVersionString } from '../config';
import { filename } from '@joplin/lib/path-utils';
import { NotificationView } from '../utils/types';
import { User } from '../services/database/types';
import { makeUrl, SubPath, UrlType } from '../utils/routeUtils';
import MarkdownIt = require('markdown-it');
import { headerAnchor } from '@joplin/renderer';
import { _ } from '@joplin/lib/locale';
import { adminDashboardUrl, adminEmailsUrl, adminTasksUrl, adminUserDeletionsUrl, adminUsersUrl, changesUrl, homeUrl, itemsUrl } from '../utils/urlUtils';
import { MenuItem, setSelectedMenu } from '../utils/views/menu';

export interface RenderOptions {
	partials?: any;
	cssFiles?: string[];
	jsFiles?: string[];
}

export interface View {
	name: string;
	title: string;
	titleOverride?: boolean;
	path: string;
	layout?: string;
	navbar?: boolean;
	content?: any;
	partials?: string[];
	cssFiles?: string[];
	jsFiles?: string[];
	strings?: Record<string, string>; // List of translatable strings
	sidebarMenu?: MenuItem[];
}

interface GlobalParams {
	baseUrl?: string;
	joplinAppBaseUrl?: string;
	prefersDarkEnabled?: boolean;
	notifications?: NotificationView[];
	hasNotifications?: boolean;
	fullYear?: number;
	owner?: User;
	fullVersionString?: string;
	appName?: string;
	termsUrl?: string;
	privacyUrl?: string;
	showErrorStackTraces?: boolean;
	userDisplayName?: string;
	supportEmail?: string;
	isJoplinCloud?: boolean;
	impersonatorAdminSessionId?: string;
	csrfTag?: string;
	s?: Record<string, string>; // List of translatable strings
	isAdminPage?: boolean;
	adminMenu?: MenuItem[];
	navbarMenu?: MenuItem[];
	currentPath?: SubPath;
}

export function isView(o: any): boolean {
	if (typeof o !== 'object' || !o) return false;
	return 'path' in o && 'name' in o;
}

export default class MustacheService {

	private viewDir_: string;
	private baseAssetUrl_: string;
	private prefersDarkEnabled_ = true;
	private partials_: Record<string, string> = {};
	private fileContentCache_: Record<string, string> = {};

	public constructor(viewDir: string, baseAssetUrl: string) {
		this.viewDir_ = viewDir;
		this.baseAssetUrl_ = baseAssetUrl;
	}

	public async loadPartials() {

		const files = await fs.readdir(this.partialDir);
		for (const f of files) {
			const name = filename(f);
			const templateContent = await this.loadTemplateContent(`${this.partialDir}/${f}`);
			this.partials_[name] = templateContent;
		}
	}

	public get partialDir(): string {
		return `${this.viewDir_}/partials`;
	}

	public get prefersDarkEnabled(): boolean {
		return this.prefersDarkEnabled_;
	}

	public set prefersDarkEnabled(v: boolean) {
		this.prefersDarkEnabled_ = v;
	}

	private layoutPath(name: string): string {
		if (!name) name = 'default';
		return `${config().layoutDir}/${name}.mustache`;
	}

	private makeAdminMenu(selectedPath: SubPath): MenuItem[] {
		const output: MenuItem[] = [
			{
				title: _('General'),
				children: [
					{
						title: _('Dashboard'),
						url: adminDashboardUrl(),
					},
					{
						title: _('Users'),
						url: adminUsersUrl(),
					},
					{
						title: _('User deletions'),
						url: adminUserDeletionsUrl(),
					},
					{
						title: _('Tasks'),
						url: adminTasksUrl(),
					},
					{
						title: _('Emails'),
						url: adminEmailsUrl(),
					},
				],
			},
		];

		return setSelectedMenu(selectedPath, output);
	}

	private makeNavbar(selectedPath: SubPath, isAdmin: boolean): MenuItem[] {
		let output: MenuItem[] = [
			{
				title: _('Home'),
				url: homeUrl(),
			},
		];

		if (isAdmin) {
			output = output.concat([
				{
					title: _('Items'),
					url: itemsUrl(),
				},
				{
					title: _('Logs'),
					url: changesUrl(),
				},
				{
					title: _('Admin'),
					url: adminDashboardUrl(),
					icon: 'fas fa-hammer',
					selectedCondition: (selectedPath: SubPath) => {
						return selectedPath.schema.startsWith('admin/') || selectedPath.schema === 'admin';
					},
				},
			]);
		}

		return setSelectedMenu(selectedPath, output);
	}

	private get defaultLayoutOptions(): GlobalParams {
		return {
			baseUrl: config().baseUrl,
			joplinAppBaseUrl: config().joplinAppBaseUrl,
			prefersDarkEnabled: this.prefersDarkEnabled_,
			fullVersionString: fullVersionString(config()),
			appName: config().appName,
			termsUrl: config().termsEnabled ? makeUrl(UrlType.Terms) : '',
			privacyUrl: config().termsEnabled ? makeUrl(UrlType.Privacy) : '',
			showErrorStackTraces: config().showErrorStackTraces,
			isJoplinCloud: config().isJoplinCloud,
			fullYear: (new Date()).getFullYear(),
		};
	}

	private async viewFilePath(name: string): Promise<string> {
		const pathsToTry = [
			`${this.viewDir_}/${name}.mustache`,
			`${this.viewDir_}/${name}.md`,
		];

		for (const p of pathsToTry) {
			if (await fs.pathExists(p)) return p;
		}

		throw new Error(`Cannot find view file: ${name}`);
	}

	private async loadTemplateContent(path: string): Promise<string> {
		if (this.fileContentCache_[path]) return this.fileContentCache_[path];

		try {
			const output = await fs.readFile(path, 'utf8');
			this.fileContentCache_[path] = output;
			return output;
		} catch (error) {
			// Shouldn't have to do this but node.fs error messages are useless
			// so throw a new error to get a proper stack trace.
			throw new Error(`Cannot load view ${path}: ${error.message}`);
		}
	}

	private resolvesFilePaths(type: string, paths: string[]): string[] {
		const output: string[] = [];
		for (const path of paths) {
			output.push(`${this.baseAssetUrl_}/${type}/${path}.${type}`);
		}
		return output;
	}

	private userDisplayName(owner: User): string {
		if (!owner) return '';
		if (owner.full_name) return owner.full_name;
		if (owner.email) return owner.email;
		return '';
	}

	private async renderFileContent(filePath: string, view: View, globalParams: GlobalParams = null): Promise<string> {
		const ext = extname(filePath);

		if (ext === '.mustache') {
			return Mustache.render(
				await this.loadTemplateContent(filePath),
				{
					...view.content,
					global: globalParams,
				},
				this.partials_
			);
		} else if (ext === '.md') {
			const markdownIt = new MarkdownIt({
				linkify: true,
			});

			markdownIt.use(headerAnchor);

			// Need to wrap in a `content` element so that default styles are
			// applied to it.
			// https://github.com/jgthms/bulma/issues/3232#issuecomment-909176563
			return `<div class="content">${markdownIt.render(await this.loadTemplateContent(filePath))}</div>`;
		}

		throw new Error(`Unsupported view extension: ${ext}`);
	}

	private formatPageName(name: string): string {
		return name.replace(/[/\\]/g, '-');
	}

	public async renderView(view: View, globalParams: GlobalParams = null): Promise<string> {
		const cssFiles = this.resolvesFilePaths('css', view.cssFiles || []);
		const jsFiles = this.resolvesFilePaths('js', view.jsFiles || []);
		const filePath = await this.viewFilePath(view.path);
		const isAdminPage = view.path.startsWith('/admin/');

		globalParams = {
			...this.defaultLayoutOptions,
			...globalParams,
			adminMenu: globalParams ? this.makeAdminMenu(globalParams.currentPath) : null,
			navbarMenu: this.makeNavbar(globalParams?.currentPath, globalParams?.owner ? !!globalParams.owner.is_admin : false),
			userDisplayName: this.userDisplayName(globalParams ? globalParams.owner : null),
			isAdminPage,
			s: {
				home: _('Home'),
				users: _('Users'),
				items: _('Items'),
				log: _('Log'),
				tasks: _('Tasks'),
				help: _('Help'),
				logout: _('Logout'),
				admin: _('Admin'),
			},
		};

		const contentHtml = await this.renderFileContent(filePath, view, globalParams);

		const layoutView: any = {
			global: globalParams,
			pageName: this.formatPageName(view.name),
			pageTitle: view.titleOverride ? view.title : `${config().appName} - ${view.title}`,
			contentHtml: contentHtml,
			cssFiles: cssFiles,
			jsFiles: jsFiles,
			navbar: view.navbar,
			sidebarMenu: view.sidebarMenu,
			...view.content,
		};

		return Mustache.render(await this.loadTemplateContent(this.layoutPath(view.layout)), layoutView, this.partials_);
	}

}
