import * as Mustache from 'mustache';
import * as fs from 'fs-extra';
import config from '../config';
import { filename } from '@joplin/lib/path-utils';
import { NotificationView } from '../utils/types';
import { User } from '../db';
import { makeUrl, UrlType } from '../utils/routeUtils';

export interface RenderOptions {
	partials?: any;
	cssFiles?: string[];
	jsFiles?: string[];
}

export interface View {
	name: string;
	title: string;
	path: string;
	layout?: string;
	navbar?: boolean;
	content?: any;
	partials?: string[];
	cssFiles?: string[];
	jsFiles?: string[];
}

interface GlobalParams {
	baseUrl?: string;
	prefersDarkEnabled?: boolean;
	notifications?: NotificationView[];
	hasNotifications?: boolean;
	owner?: User;
	appVersion?: string;
	appName?: string;
	termsUrl?: string;
	privacyUrl?: string;
	showErrorStackTraces?: boolean;
	userDisplayName?: string;
	supportEmail?: string;
}

export function isView(o: any): boolean {
	if (typeof o !== 'object' || !o) return false;
	return 'path' in o && 'name' in o;
}

export default class MustacheService {

	private viewDir_: string;
	private baseAssetUrl_: string;
	private prefersDarkEnabled_: boolean = true;
	private partials_: Record<string, string> = {};

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

	private get defaultLayoutOptions(): GlobalParams {
		return {
			baseUrl: config().baseUrl,
			prefersDarkEnabled: this.prefersDarkEnabled_,
			appVersion: config().appVersion,
			appName: config().appName,
			termsUrl: config().termsEnabled ? makeUrl(UrlType.Terms) : '',
			privacyUrl: config().termsEnabled ? makeUrl(UrlType.Privacy) : '',
			showErrorStackTraces: config().showErrorStackTraces,
		};
	}

	private async loadTemplateContent(path: string): Promise<string> {
		return fs.readFile(path, 'utf8');
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

	public async renderView(view: View, globalParams: GlobalParams = null): Promise<string> {
		const cssFiles = this.resolvesFilePaths('css', view.cssFiles || []);
		const jsFiles = this.resolvesFilePaths('js', view.jsFiles || []);
		const filePath = `${this.viewDir_}/${view.path}.mustache`;

		globalParams = {
			...this.defaultLayoutOptions,
			...globalParams,
			userDisplayName: this.userDisplayName(globalParams ? globalParams.owner : null),
		};

		const contentHtml = Mustache.render(
			await this.loadTemplateContent(filePath),
			{
				...view.content,
				global: globalParams,
			},
			this.partials_
		);

		const layoutView: any = {
			global: globalParams,
			pageName: view.name,
			pageTitle: `${config().appName} - ${view.title}`,
			contentHtml: contentHtml,
			cssFiles: cssFiles,
			jsFiles: jsFiles,
			navbar: view.navbar,
			...view.content,
		};

		return Mustache.render(await this.loadTemplateContent(this.layoutPath(view.layout)), layoutView, this.partials_);
	}

}
