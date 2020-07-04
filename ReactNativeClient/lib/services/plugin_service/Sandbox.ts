import WebviewController from './WebviewController';
import { SandboxContext } from './utils/types';
import Plugin from './Plugin';
import CommandService from '../CommandService';
const Api = require('lib/services/rest/Api');
const eventManager = require('lib/eventManager');
const Note = require('lib/models/Note');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

class SandboxJoplinApi {

	private api_:any = new Api();

	private serializeApiBody(body:any) {
		if (typeof body !== 'string') return JSON.stringify(body);
		return body;
	}

	get(path:string, query:any = null) {
		return this.api_.route('GET', path, query);
	}

	post(path:string, query:any = null, body:any = null, files:any[] = null) {
		return this.api_.route('POST', path, query, this.serializeApiBody(body), files);
	}

	put(path:string, query:any = null, body:any = null, files:any[] = null) {
		return this.api_.route('PUT', path, query, this.serializeApiBody(body), files);
	}

	delete(path:string, query:any = null) {
		return this.api_.route('DELETE', path, query);
	}

}

class SandboxJoplinPlugins {

	private context:SandboxContext;

	constructor(context:SandboxContext) {
		this.context = context;
	}

	register(script:any) {
		this.context .runtime = script;
	}

}

class SandboxJoplinWorkspaces {

	// TODO: unregister events when plugin is closed or disabled

	private store:any;

	constructor(store:any) {
		this.store = store;
	}

	onNoteSelectionChange(callback:Function) {
		eventManager.appStateOn('selectedNoteIds', callback);
	}

	onNoteContentChange(callback:Function) {
		eventManager.on('noteContentChange', callback);
	}

	async selectedNote() {
		const noteIds = this.store.getState().selectedNoteIds;
		if (noteIds.length !== 1) return null;
		return Note.load(noteIds[0]);
	}

}

class SandboxJoplinFilters {

	on(name:string, callback:Function) {
		eventManager.filterOn(name, callback);
	}

	off(name:string, callback:Function) {
		eventManager.filterOff(name, callback);
	}

}

class SandboxJoplinCommands {

	execute(commandName:string, args:any) {
		CommandService.instance().execute(commandName, args);
	}

}

class SandboxJoplinViews {

	private store:any;
	private plugin:Plugin;

	constructor(plugin:Plugin, store:any) {
		this.store = store;
		this.plugin = plugin;
	}

	createWebviewPanel() {
		const controller = new WebviewController(this.plugin.id, this.store, this.plugin.baseDir);
		this.plugin.addViewController(controller);
		return controller;
	}

}

class SandboxJoplinUtils {

	escapeHtml(text:string):string {
		return htmlentities(text);
	}

}

class SandboxJoplin {

	api_:SandboxJoplinApi = null;
	plugins_:SandboxJoplinPlugins = null;
	workspaces_:SandboxJoplinWorkspaces = null;
	filters_:SandboxJoplinFilters = null;
	commands_:SandboxJoplinCommands = null;
	views_:SandboxJoplinViews = null;
	utils_:SandboxJoplinUtils = null;

	constructor(plugin:Plugin, store:any, context:SandboxContext) {
		this.api_ = new SandboxJoplinApi();
		this.plugins_ = new SandboxJoplinPlugins(context);
		this.workspaces_ = new SandboxJoplinWorkspaces(store);
		this.filters_ = new SandboxJoplinFilters();
		this.commands_ = new SandboxJoplinCommands();
		this.views_ = new SandboxJoplinViews(plugin, store);
		this.utils_ = new SandboxJoplinUtils();
	}

	get api():SandboxJoplinApi {
		return this.api_;
	}

	get plugins():SandboxJoplinPlugins {
		return this.plugins_;
	}

	get workspace():SandboxJoplinWorkspaces {
		return this.workspaces_;
	}

	get filters():SandboxJoplinFilters {
		return this.filters_;
	}

	get commands():SandboxJoplinCommands {
		return this.commands_;
	}

	get views():SandboxJoplinViews {
		return this.views_;
	}

	get utils():SandboxJoplinUtils {
		return this.utils_;
	}

}

export default class Sandbox {

	private context:SandboxContext;
	private joplin_:SandboxJoplin;

	constructor(plugin:Plugin, store:any, context:SandboxContext) {
		this.context = context;
		this.joplin_ = new SandboxJoplin(plugin, store, this.context);
	}

	get joplin():SandboxJoplin {
		return this.joplin_;
	}

	get console():any {
		return console;
	}

	setTimeout(fn:Function, interval:number) {
		return setTimeout(() => {
			fn();
		}, interval);
	}

	setInterval(fn:Function, interval:number) {
		return setInterval(() => {
			fn();
		}, interval);
	}

}
