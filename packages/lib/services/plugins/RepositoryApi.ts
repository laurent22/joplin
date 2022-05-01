import Logger from '../../Logger';
import shim from '../../shim';
import { PluginManifest } from './utils/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import pluginCategories from './pluginCategories';
import Setting from '@joplin/lib/models/Setting';
const md5 = require('md5');
const compareVersions = require('compare-versions');

const logger = Logger.create('RepositoryApi');

interface ReleaseAsset {
	name: string;
	browser_download_url: string;
}

interface Release {
	upload_url: string;
	assets: ReleaseAsset[];
}

const findWorkingGitHubUrl = async (defaultContentUrl: string): Promise<string> => {
	// From: https://github.com/laurent22/joplin/issues/5161#issuecomment-921642721

	const mirrorUrls = [
		defaultContentUrl,
		'https://cdn.staticaly.com/gh/joplin/plugins/master',
		'https://ghproxy.com/https://raw.githubusercontent.com/joplin/plugins/master',
		'https://cdn.jsdelivr.net/gh/joplin/plugins@master',
		'https://raw.fastgit.org/joplin/plugins/master',
	];

	for (const mirrorUrl of mirrorUrls) {
		try {
			// We try to fetch .gitignore, which is smaller than the whole manifest
			await fetch(`${mirrorUrl}/.gitignore`);
		} catch (error) {
			logger.info(`findWorkingMirror: Could not connect to ${mirrorUrl}:`, error);
			continue;
		}

		logger.info(`findWorkingMirror: Using: ${mirrorUrl}`);

		return mirrorUrl;
	}

	logger.info('findWorkingMirror: Could not find any working GitHub URL');

	return defaultContentUrl;
};

export default class RepositoryApi {

	// As a base URL, this class can support either a remote repository or a
	// local one (a directory path), which is useful for testing.
	//
	// For now, if the baseUrl is an actual URL it's assumed it's a GitHub repo
	// URL, such as https://github.com/joplin/plugins
	//
	// Later on, other repo types could be supported.
	private baseUrl_: string;
	private tempDir_: string;
	private release_: Release = null;
	private manifests_: PluginManifest[] = null;
	private githubApiUrl_: string;
	private contentBaseUrl_: string;
	private isUsingDefaultContentUrl_: boolean = true;

	public constructor(baseUrl: string, tempDir: string) {
		this.baseUrl_ = baseUrl;
		this.tempDir_ = tempDir;
	}

	public async initialize() {
		// https://github.com/joplin/plugins
		// https://api.github.com/repos/joplin/plugins/releases
		this.githubApiUrl_ = this.baseUrl_.replace(/^(https:\/\/)(github\.com\/)(.*)$/, '$1api.$2repos/$3');
		const defaultContentBaseUrl = `${this.baseUrl_.replace(/github\.com/, 'raw.githubusercontent.com')}/master`;
		this.contentBaseUrl_ = await findWorkingGitHubUrl(defaultContentBaseUrl);

		this.isUsingDefaultContentUrl_ = this.contentBaseUrl_ === defaultContentBaseUrl;

		await this.loadManifests();
		await this.loadRelease();
		await this.loadStats();
	}

	private async loadManifests() {
		const manifestsText = await this.fetchText('manifests.json');
		try {
			const manifests = JSON.parse(manifestsText);
			if (!manifests) throw new Error('Invalid or missing JSON');

			const tempOptions = pluginCategories();
			this.manifests_ = Object.keys(manifests).map(id => {
				const m: PluginManifest = manifests[id];

				m._plugin_category = tempOptions[m.name];
				// If we don't control the repository, we can't recommend
				// anything on it since it could have been modified.
				if (!this.isUsingDefaultContentUrl) m._recommended = false;
				return m;
			});
			// await this.loadStats();
		} catch (error) {
			throw new Error(`Could not parse JSON: ${error.message}`);
		}
	}

	private async loadStats() {
		const statsText = await shim.fetch('https://raw.githubusercontent.com/joplin/plugins/master/stats.json');
		try {
			const stats = JSON.parse(await statsText.text());
			if (!stats) throw new Error('Invalid or missing JSON');
			let tempDownloadCount: number = 0;
			let created_date = '';
			this.manifests_.forEach(manifest => {
				stats[manifest.id] && Object.entries(stats[manifest.id]).forEach((stats: any[], index) => {
					tempDownloadCount += stats[1].downloadCount;
					if (index === 0) created_date = stats[1].createdAt;
				});
				const manifestObj = this.manifests_.find(obj => obj.id === manifest.id);
				manifestObj._totalDownloads = tempDownloadCount;
				manifestObj._created_date = created_date;
				tempDownloadCount = 0;
			});
		} catch (error) {
			throw new Error(`Could not parse JSON: ${error.message}`);
		}
	}

	public get isUsingDefaultContentUrl() {
		return this.isUsingDefaultContentUrl_;
	}

	private get githubApiUrl(): string {
		return this.githubApiUrl_;
	}

	public get contentBaseUrl(): string {
		if (this.isLocalRepo) {
			return this.baseUrl_;
		} else {
			return this.contentBaseUrl_;
		}
	}

	private async loadRelease() {
		this.release_ = null;

		if (this.isLocalRepo) return;

		try {
			const response = await fetch(`${this.githubApiUrl}/releases`);
			const releases = await response.json();
			if (!releases.length) throw new Error('No release was found');
			this.release_ = releases[0];
		} catch (error) {
			logger.warn('Could not load release - files will be downloaded from the repository directly:', error);
		}
	}

	private get isLocalRepo(): boolean {
		return this.baseUrl_.indexOf('http') !== 0;
	}

	private assetFileUrl(pluginId: string): string {
		if (this.release_) {
			const asset = this.release_.assets.find(asset => {
				const s = asset.name.split('@');
				s.pop();
				const id = s.join('@');
				return id === pluginId;
			});

			if (asset) return asset.browser_download_url;

			logger.warn(`Could not get plugin from release: ${pluginId}`);
		}

		// If we couldn't get the plugin file from the release, get it directly
		// from the repository instead.
		return this.repoFileUrl(`plugins/${pluginId}/plugin.jpl`);
	}

	private repoFileUrl(relativePath: string): string {
		return `${this.contentBaseUrl}/${relativePath}`;
	}

	private async fetchText(path: string): Promise<string> {
		if (this.isLocalRepo) {
			return shim.fsDriver().readFile(this.repoFileUrl(path), 'utf8');
		} else {
			return shim.fetchText(this.repoFileUrl(path));
		}
	}

	public async search(query: string): Promise<PluginManifest[]> {
		query = query.toLowerCase().trim();

		const manifests = await this.manifests();
		const output: PluginManifest[] = [];

		for (const manifest of manifests) {
			for (const field of ['name', 'description']) {
				const v = (manifest as any)[field];
				if (!v) continue;

				if (v.toLowerCase().indexOf(query) >= 0) {
					output.push(manifest);
					break;
				}
			}
		}

		return output;
	}

	public async sortByCategory(category?: string, searchQuery?: string): Promise<PluginManifest[]> {
		const manifests = await this.manifests();
		let output: PluginManifest[] = [];
		const output2: PluginManifest[] = [];
		const pluginStates = Setting.value('plugins.states');
		category = category.toLowerCase();


		const categoryFilterList = ['appearance', 'developer tools', 'productivity', 'themes', 'integrations', 'viewer', 'search', 'tags', 'editor', 'files', 'personal knowledge management'];

		if (categoryFilterList.includes(category)) {
			output = manifests.filter((m) => m._plugin_category === category);
		} else {
			switch (category) {
			case 'most downloaded':
				output = manifests.sort((m1, m2) => m2._totalDownloads - m1._totalDownloads).slice(0, 50);
				break;
			case 'recommended':
				output = manifests.filter(manifest => manifest._recommended);
				break;
			case 'newest':
				// + before new keyword forces date to be number https://github.com/microsoft/TypeScript/issues/5710
				output = manifests.sort((m1, m2) => +new Date(m2._created_date) - +new Date(m1._created_date)).slice(0,50);
				break;
			case 'built-in':
				output = manifests.filter(manifest => manifest._built_in);
				break;
			case 'all':
				output = manifests;
				break;
			case 'outdated':
				output = manifests.filter(manifest => !PluginService.instance().isCompatible(manifest.app_min_version));
				break;
			case 'enabled':
				output = manifests.filter(manifest => pluginStates[manifest.id] && pluginStates[manifest.id].enabled);
				break;
			case 'disabled':
				output = manifests.filter(manifest => pluginStates[manifest.id] && !(pluginStates[manifest.id].enabled));
				break;
			case 'installed':
			default:
				output = manifests.filter(manifest => (pluginStates[manifest.id]) !== undefined);
				break;
			}
		}

		if (searchQuery) {
			searchQuery = searchQuery.toLowerCase().trim();
			if (!category) output = manifests;

			for (const manifest of output) {
				for (const field of ['name', 'description']) {
					const v = (manifest as any)[field];
					if (!v) continue;

					if (v.toLowerCase().indexOf(searchQuery) >= 0) {
						output2.push(manifest);
						break;
					}
				}
			}
			return output2;
		}
		return output;
	}

	// Returns a temporary path, where the plugin has been downloaded to. Temp
	// file should be deleted by caller.
	public async downloadPlugin(pluginId: string): Promise<string> {
		const manifests = await this.manifests();
		const manifest = manifests.find(m => m.id === pluginId);
		if (!manifest) throw new Error(`No manifest for plugin ID "${pluginId}"`);

		const fileUrl = this.assetFileUrl(manifest.id); // this.repoFileUrl(`plugins/${manifest.id}/plugin.jpl`);
		const hash = md5(Date.now() + Math.random());
		const targetPath = `${this.tempDir_}/${hash}_${manifest.id}.jpl`;

		if (this.isLocalRepo) {
			await shim.fsDriver().copy(fileUrl, targetPath);
		} else {
			const response = await shim.fetchBlob(fileUrl, {
				path: targetPath,
			});

			if (!response.ok) throw new Error(`Could not download plugin "${pluginId}" from "${fileUrl}"`);
		}

		return targetPath;
	}

	public async manifests(): Promise<PluginManifest[]> {
		if (!this.manifests_) throw new Error('Manifests have no been loaded!');
		return this.manifests_;
	}

	public async canBeUpdatedPlugins(installedManifests: PluginManifest[]): Promise<string[]> {
		const output = [];

		for (const manifest of installedManifests) {
			const canBe = await this.pluginCanBeUpdated(manifest.id, manifest.version);
			if (canBe) output.push(manifest.id);
		}

		return output;
	}

	public async pluginCanBeUpdated(pluginId: string, installedVersion: string): Promise<boolean> {
		const manifest = (await this.manifests()).find(m => m.id === pluginId);
		if (!manifest) return false;
		return compareVersions(installedVersion, manifest.version) < 0;
	}

}
