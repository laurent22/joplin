"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallMode = void 0;
const Logger_1 = require("@joplin/utils/Logger");
const shim_1 = require("../../shim");
const md5 = require('md5');
const compare_versions_1 = require("compare-versions");
const isCompatible_1 = require("./utils/isCompatible");
const logger = Logger_1.default.create('RepositoryApi');
var InstallMode;
(function (InstallMode) {
    InstallMode[InstallMode["Restricted"] = 0] = "Restricted";
    InstallMode[InstallMode["Default"] = 1] = "Default";
})(InstallMode || (exports.InstallMode = InstallMode = {}));
const findWorkingGitHubUrl = async (defaultContentUrl) => {
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
            await shim_1.default.fetch(`${mirrorUrl}/.gitignore`);
        }
        catch (error) {
            logger.info(`findWorkingMirror: Could not connect to ${mirrorUrl}:`, error);
            continue;
        }
        logger.info(`findWorkingMirror: Using: ${mirrorUrl}`);
        return mirrorUrl;
    }
    logger.info('findWorkingMirror: Could not find any working GitHub URL');
    return defaultContentUrl;
};
class RepositoryApi {
    constructor(baseUrl, tempDir, appInfo, installMode) {
        this.release_ = null;
        this.manifests_ = null;
        this.isUsingDefaultContentUrl_ = true;
        this.lastInitializedTime_ = 0;
        this.installMode_ = installMode;
        this.appType_ = appInfo.type;
        this.appVersion_ = appInfo.version;
        this.baseUrl_ = baseUrl;
        this.tempDir_ = tempDir;
    }
    static ofDefaultJoplinRepo(tempDirPath, appInfo, installMode) {
        return new RepositoryApi('https://github.com/joplin/plugins', tempDirPath, appInfo, installMode);
    }
    async initialize() {
        // https://github.com/joplin/plugins
        // https://api.github.com/repos/joplin/plugins/releases
        this.githubApiUrl_ = this.baseUrl_.replace(/^(https:\/\/)(github\.com\/)(.*)$/, '$1api.$2repos/$3');
        const defaultContentBaseUrl = this.isLocalRepo ? this.baseUrl_ : `${this.baseUrl_.replace(/github\.com/, 'raw.githubusercontent.com')}/master`;
        const canUseMirrors = this.installMode_ === InstallMode.Default && !this.isLocalRepo;
        this.contentBaseUrl_ = canUseMirrors ? await findWorkingGitHubUrl(defaultContentBaseUrl) : defaultContentBaseUrl;
        this.isUsingDefaultContentUrl_ = this.contentBaseUrl_ === defaultContentBaseUrl;
        await this.loadManifests();
        await this.loadRelease();
        this.lastInitializedTime_ = Date.now();
    }
    async reinitialize() {
        // Refresh at most once per minute
        if (Date.now() - this.lastInitializedTime_ > 5 * 60000) {
            await this.initialize();
        }
    }
    async loadManifests() {
        const manifestsText = await this.fetchText('manifests.json');
        try {
            const manifests = JSON.parse(manifestsText);
            if (!manifests)
                throw new Error('Invalid or missing JSON');
            this.manifests_ = Object.keys(manifests).map(id => {
                const m = manifests[id];
                // If we don't control the repository, we can't recommend
                // anything on it since it could have been modified.
                if (!this.isUsingDefaultContentUrl)
                    m._recommended = false;
                return m;
            });
        }
        catch (error) {
            throw new Error(`Could not parse JSON: ${error.message}`);
        }
    }
    get isUsingDefaultContentUrl() {
        return this.isUsingDefaultContentUrl_;
    }
    get githubApiUrl() {
        return this.githubApiUrl_;
    }
    get contentBaseUrl() {
        if (this.isLocalRepo) {
            return this.baseUrl_;
        }
        else {
            return this.contentBaseUrl_;
        }
    }
    async loadRelease() {
        this.release_ = null;
        if (this.isLocalRepo)
            return;
        try {
            const response = await shim_1.default.fetch(`${this.githubApiUrl}/releases`);
            const releases = await response.json();
            if (!releases.length)
                throw new Error('No release was found');
            this.release_ = releases[0];
        }
        catch (error) {
            logger.warn('Could not load release - files will be downloaded from the repository directly:', error);
        }
    }
    get isLocalRepo() {
        return this.baseUrl_.indexOf('http') !== 0;
    }
    assetFileUrl(pluginId) {
        // On web, downloading from a release is blocked by CORS.
        if (this.release_ && shim_1.default.mobilePlatform() !== 'web') {
            const asset = this.release_.assets.find(asset => {
                const s = asset.name.split('@');
                s.pop();
                const id = s.join('@');
                return id === pluginId;
            });
            if (asset)
                return asset.browser_download_url;
            logger.warn(`Could not get plugin from release: ${pluginId}`);
        }
        // If we couldn't get the plugin file from the release, get it directly
        // from the repository instead.
        return this.repoFileUrl(`plugins/${pluginId}/plugin.jpl`);
    }
    repoFileUrl(relativePath) {
        return `${this.contentBaseUrl}/${relativePath}`;
    }
    async fetchText(path) {
        if (this.isLocalRepo) {
            return shim_1.default.fsDriver().readFile(this.repoFileUrl(path), 'utf8');
        }
        else {
            return shim_1.default.fetchText(this.repoFileUrl(path));
        }
    }
    isBlockedByInstallMode(manifest) {
        return this.installMode_ === InstallMode.Restricted && manifest._recommended !== true;
    }
    async search(query) {
        query = query.toLowerCase().trim();
        const manifests = await this.manifests();
        const output = [];
        for (const manifest of manifests) {
            if (this.isBlockedByInstallMode(manifest)) {
                continue;
            }
            for (const field of ['name', 'description']) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                const v = manifest[field];
                if (!v)
                    continue;
                if (v.toLowerCase().indexOf(query) >= 0) {
                    output.push(manifest);
                    break;
                }
            }
        }
        output.sort((m1, m2) => {
            const m1Compatible = (0, isCompatible_1.default)(this.appVersion_, this.appType_, m1);
            const m2Compatible = (0, isCompatible_1.default)(this.appVersion_, this.appType_, m2);
            if (m1Compatible && !m2Compatible)
                return -1;
            if (!m1Compatible && m2Compatible)
                return 1;
            if (m1._recommended && !m2._recommended)
                return -1;
            if (!m1._recommended && m2._recommended)
                return +1;
            return m1.name.toLowerCase() < m2.name.toLowerCase() ? -1 : +1;
        });
        return output;
    }
    // Returns a temporary path, where the plugin has been downloaded to. Temp
    // file should be deleted by caller.
    async downloadPlugin(pluginId) {
        const manifests = await this.manifests();
        const manifest = manifests.find(m => m.id === pluginId);
        if (!manifest)
            throw new Error(`No manifest for plugin ID "${pluginId}"`);
        if (this.isBlockedByInstallMode(manifest))
            throw new Error(`Plugin is blocked by intstallation policy. ID "${pluginId}"`);
        const fileUrl = this.assetFileUrl(manifest.id); // this.repoFileUrl(`plugins/${manifest.id}/plugin.jpl`);
        const hash = md5(Date.now() + Math.random());
        const targetPath = `${this.tempDir_}/${hash}_${manifest.id}.jpl`;
        if (this.isLocalRepo) {
            await shim_1.default.fsDriver().copy(fileUrl, targetPath);
        }
        else {
            const response = await shim_1.default.fetchBlob(fileUrl, {
                path: targetPath,
            });
            if (!response.ok)
                throw new Error(`Could not download plugin "${pluginId}" from "${fileUrl}"`);
        }
        return targetPath;
    }
    async manifests() {
        if (!this.manifests_)
            throw new Error('Manifests have no been loaded!');
        return this.manifests_;
    }
    async canBeUpdatedPlugins(installedManifests) {
        const output = [];
        for (const manifest of installedManifests) {
            const canBe = await this.pluginCanBeUpdated(manifest.id, manifest.version);
            if (canBe)
                output.push(manifest.id);
        }
        return output;
    }
    async pluginCanBeUpdated(pluginId, installedVersion) {
        const manifest = (await this.manifests()).find(m => m.id === pluginId);
        if (!manifest)
            return false;
        const supportsCurrentAppVersion = (0, compare_versions_1.compareVersions)(installedVersion, manifest.version) < 0 && (0, isCompatible_1.default)(this.appVersion_, this.appType_, manifest);
        return supportsCurrentAppVersion && !this.isBlockedByInstallMode(manifest);
    }
}
exports.default = RepositoryApi;
