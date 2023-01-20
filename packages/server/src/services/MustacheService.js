"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isView = void 0;
const Mustache = require("mustache");
const fs = require("fs-extra");
const path_1 = require("path");
const config_1 = require("../config");
const path_utils_1 = require("@joplin/lib/path-utils");
const routeUtils_1 = require("../utils/routeUtils");
const MarkdownIt = require("markdown-it");
const renderer_1 = require("@joplin/renderer");
const locale_1 = require("@joplin/lib/locale");
const urlUtils_1 = require("../utils/urlUtils");
const menu_1 = require("../utils/views/menu");
function isView(o) {
    if (typeof o !== 'object' || !o)
        return false;
    return 'path' in o && 'name' in o;
}
exports.isView = isView;
class MustacheService {
    constructor(viewDir, baseAssetUrl) {
        this.prefersDarkEnabled_ = true;
        this.partials_ = {};
        this.fileContentCache_ = {};
        this.viewDir_ = viewDir;
        this.baseAssetUrl_ = baseAssetUrl;
    }
    loadPartials() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield fs.readdir(this.partialDir);
            for (const f of files) {
                const name = (0, path_utils_1.filename)(f);
                const templateContent = yield this.loadTemplateContent(`${this.partialDir}/${f}`);
                this.partials_[name] = templateContent;
            }
        });
    }
    get partialDir() {
        return `${this.viewDir_}/partials`;
    }
    get prefersDarkEnabled() {
        return this.prefersDarkEnabled_;
    }
    set prefersDarkEnabled(v) {
        this.prefersDarkEnabled_ = v;
    }
    layoutPath(name) {
        if (!name)
            name = 'default';
        return `${(0, config_1.default)().layoutDir}/${name}.mustache`;
    }
    makeAdminMenu(selectedPath) {
        const output = [
            {
                title: (0, locale_1._)('General'),
                children: [
                    {
                        title: (0, locale_1._)('Dashboard'),
                        url: (0, urlUtils_1.adminDashboardUrl)(),
                    },
                    {
                        title: (0, locale_1._)('Users'),
                        url: (0, urlUtils_1.adminUsersUrl)(),
                    },
                    {
                        title: (0, locale_1._)('User deletions'),
                        url: (0, urlUtils_1.adminUserDeletionsUrl)(),
                    },
                    {
                        title: (0, locale_1._)('Tasks'),
                        url: (0, urlUtils_1.adminTasksUrl)(),
                    },
                    {
                        title: (0, locale_1._)('Emails'),
                        url: (0, urlUtils_1.adminEmailsUrl)(),
                    },
                ],
            },
        ];
        return (0, menu_1.setSelectedMenu)(selectedPath, output);
    }
    makeNavbar(selectedPath, isAdmin) {
        let output = [
            {
                title: (0, locale_1._)('Home'),
                url: (0, urlUtils_1.homeUrl)(),
            },
        ];
        if (isAdmin) {
            output = output.concat([
                {
                    title: (0, locale_1._)('Items'),
                    url: (0, urlUtils_1.itemsUrl)(),
                },
                {
                    title: (0, locale_1._)('Logs'),
                    url: (0, urlUtils_1.changesUrl)(),
                },
                {
                    title: (0, locale_1._)('Admin'),
                    url: (0, urlUtils_1.adminDashboardUrl)(),
                    icon: 'fas fa-hammer',
                    selectedCondition: (selectedPath) => {
                        return selectedPath.schema.startsWith('admin/') || selectedPath.schema === 'admin';
                    },
                },
            ]);
        }
        return (0, menu_1.setSelectedMenu)(selectedPath, output);
    }
    get defaultLayoutOptions() {
        return {
            baseUrl: (0, config_1.default)().baseUrl,
            joplinAppBaseUrl: (0, config_1.default)().joplinAppBaseUrl,
            prefersDarkEnabled: this.prefersDarkEnabled_,
            appVersion: (0, config_1.default)().appVersion,
            appName: (0, config_1.default)().appName,
            termsUrl: (0, config_1.default)().termsEnabled ? (0, routeUtils_1.makeUrl)(routeUtils_1.UrlType.Terms) : '',
            privacyUrl: (0, config_1.default)().termsEnabled ? (0, routeUtils_1.makeUrl)(routeUtils_1.UrlType.Privacy) : '',
            showErrorStackTraces: (0, config_1.default)().showErrorStackTraces,
            isJoplinCloud: (0, config_1.default)().isJoplinCloud,
        };
    }
    viewFilePath(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const pathsToTry = [
                `${this.viewDir_}/${name}.mustache`,
                `${this.viewDir_}/${name}.md`,
            ];
            for (const p of pathsToTry) {
                if (yield fs.pathExists(p))
                    return p;
            }
            throw new Error(`Cannot find view file: ${name}`);
        });
    }
    loadTemplateContent(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.fileContentCache_[path])
                return this.fileContentCache_[path];
            try {
                const output = yield fs.readFile(path, 'utf8');
                this.fileContentCache_[path] = output;
                return output;
            }
            catch (error) {
                // Shouldn't have to do this but node.fs error messages are useless
                // so throw a new error to get a proper stack trace.
                throw new Error(`Cannot load view ${path}: ${error.message}`);
            }
        });
    }
    resolvesFilePaths(type, paths) {
        const output = [];
        for (const path of paths) {
            output.push(`${this.baseAssetUrl_}/${type}/${path}.${type}`);
        }
        return output;
    }
    userDisplayName(owner) {
        if (!owner)
            return '';
        if (owner.full_name)
            return owner.full_name;
        if (owner.email)
            return owner.email;
        return '';
    }
    renderFileContent(filePath, view, globalParams = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const ext = (0, path_1.extname)(filePath);
            if (ext === '.mustache') {
                return Mustache.render(yield this.loadTemplateContent(filePath), Object.assign(Object.assign({}, view.content), { global: globalParams }), this.partials_);
            }
            else if (ext === '.md') {
                const markdownIt = new MarkdownIt({
                    linkify: true,
                });
                markdownIt.use(renderer_1.headerAnchor);
                // Need to wrap in a `content` element so that default styles are
                // applied to it.
                // https://github.com/jgthms/bulma/issues/3232#issuecomment-909176563
                return `<div class="content">${markdownIt.render(yield this.loadTemplateContent(filePath))}</div>`;
            }
            throw new Error(`Unsupported view extension: ${ext}`);
        });
    }
    formatPageName(name) {
        return name.replace(/[/\\]/g, '-');
    }
    renderView(view, globalParams = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const cssFiles = this.resolvesFilePaths('css', view.cssFiles || []);
            const jsFiles = this.resolvesFilePaths('js', view.jsFiles || []);
            const filePath = yield this.viewFilePath(view.path);
            const isAdminPage = view.path.startsWith('/admin/');
            globalParams = Object.assign(Object.assign(Object.assign({}, this.defaultLayoutOptions), globalParams), { adminMenu: globalParams ? this.makeAdminMenu(globalParams.currentPath) : null, navbarMenu: this.makeNavbar(globalParams === null || globalParams === void 0 ? void 0 : globalParams.currentPath, (globalParams === null || globalParams === void 0 ? void 0 : globalParams.owner) ? !!globalParams.owner.is_admin : false), userDisplayName: this.userDisplayName(globalParams ? globalParams.owner : null), isAdminPage, s: {
                    home: (0, locale_1._)('Home'),
                    users: (0, locale_1._)('Users'),
                    items: (0, locale_1._)('Items'),
                    log: (0, locale_1._)('Log'),
                    tasks: (0, locale_1._)('Tasks'),
                    help: (0, locale_1._)('Help'),
                    logout: (0, locale_1._)('Logout'),
                    admin: (0, locale_1._)('Admin'),
                } });
            const contentHtml = yield this.renderFileContent(filePath, view, globalParams);
            const layoutView = Object.assign({ global: globalParams, pageName: this.formatPageName(view.name), pageTitle: view.titleOverride ? view.title : `${(0, config_1.default)().appName} - ${view.title}`, contentHtml: contentHtml, cssFiles: cssFiles, jsFiles: jsFiles, navbar: view.navbar, sidebarMenu: view.sidebarMenu }, view.content);
            return Mustache.render(yield this.loadTemplateContent(this.layoutPath(view.layout)), layoutView, this.partials_);
        });
    }
}
exports.default = MustacheService;
//# sourceMappingURL=MustacheService.js.map