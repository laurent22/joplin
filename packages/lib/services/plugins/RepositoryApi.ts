import Logger from '../../Logger';
import shim from '../../shim';
import { PluginManifest } from './utils/types';
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

	public constructor(baseUrl: string, tempDir: string) {
		this.baseUrl_ = baseUrl;
		this.tempDir_ = tempDir;
	}

	public async initialize() {
		await this.loadManifests();
		await this.loadRelease();
	}

	private async loadManifests() {
		const manifestsText = await this.fetchText('manifests.json');
		try {
			const manifests = JSON.parse(manifestsText);
			if (!manifests) throw new Error('Invalid or missing JSON');
			this.manifests_ = Object.keys(manifests).map(id => {
				return manifests[id];
			});
		} catch (error) {
			throw new Error(`Could not parse JSON: ${error.message}`);
		}
	}

	private get githubApiUrl(): string {
		// https://github.com/joplin/plugins
		// https://api.github.com/repos/joplin/plugins/releases
		return this.baseUrl_.replace(/^(https:\/\/)(github\.com\/)(.*)$/, '$1api.$2repos/$3');
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

	private get contentBaseUrl(): string {
		if (this.isLocalRepo) {
			return this.baseUrl_;
		} else {
			return `${this.baseUrl_.replace(/github\.com/, 'raw.githubusercontent.com')}/master`;
		}
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
