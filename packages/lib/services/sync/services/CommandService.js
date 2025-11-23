"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = void 0;
const eventManager_1 = require("../eventManager");
const BaseService_1 = require("./BaseService");
const shim_1 = require("../shim");
const WhenClause_1 = require("./WhenClause");
exports.utils = {
    store: {
        dispatch: () => { },
        getState: () => { },
    },
};
class CommandService extends BaseService_1.default {
    constructor() {
        super(...arguments);
        this.commands_ = {};
    }
    static instance() {
        if (this.instance_)
            return this.instance_;
        this.instance_ = new CommandService();
        return this.instance_;
    }
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
    initialize(store, devMode, stateToWhenClauseContext) {
        exports.utils.store = store;
        this.store_ = store;
        this.devMode_ = devMode;
        this.stateToWhenClauseContext_ = stateToWhenClauseContext;
    }
    on(eventName, callback) {
        eventManager_1.default.on(eventName, callback);
    }
    off(eventName, callback) {
        eventManager_1.default.off(eventName, callback);
    }
    searchCommands(query, returnAllWhenEmpty, excludeWithoutLabel = true) {
        query = query.toLowerCase();
        const output = [];
        const whenClauseContext = this.currentWhenClauseContext();
        for (const commandName of this.commandNames()) {
            const label = this.label(commandName, true);
            if (!label && excludeWithoutLabel)
                continue;
            if (!this.isEnabled(commandName, whenClauseContext))
                continue;
            const title = label ? `${label} (${commandName})` : commandName;
            if ((returnAllWhenEmpty && !query) || title.toLowerCase().includes(query)) {
                output.push({
                    commandName: commandName,
                    title: title,
                });
            }
        }
        output.sort((a, b) => {
            return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
        });
        return output;
    }
    commandNames(publicOnly = false) {
        if (publicOnly) {
            const output = [];
            for (const name in this.commands_) {
                if (!this.isPublic(name))
                    continue;
                output.push(name);
            }
            return output;
        }
        else {
            return Object.keys(this.commands_);
        }
    }
    commandByName(name, options = null) {
        options = Object.assign({ mustExist: true, runtimeMustBeRegistered: false }, options);
        const command = this.commands_[name];
        if (!command) {
            if (options.mustExist)
                throw new Error(`Command not found: ${name}. Make sure the declaration has been registered.`);
            return null;
        }
        if (options.runtimeMustBeRegistered && !command.runtime)
            throw new Error(`Runtime is not registered for command ${name}`);
        return command;
    }
    registerDeclaration(declaration) {
        declaration = Object.assign({}, declaration);
        if (!declaration.label)
            declaration.label = '';
        if (!declaration.iconName)
            declaration.iconName = 'fas fa-cog';
        this.commands_[declaration.name] = {
            declaration: declaration,
        };
    }
    unregisterDeclaration(name) {
        delete this.commands_[name];
    }
    registerRuntime(commandName, runtime, allowMultiple = false) {
        if (typeof commandName !== 'string')
            throw new Error(`Command name must be a string. Got: ${JSON.stringify(commandName)}`);
        const command = this.commandByName(commandName);
        runtime = Object.assign({}, runtime);
        if (!runtime.enabledCondition)
            runtime.enabledCondition = 'true';
        if (!allowMultiple) {
            command.runtime = runtime;
        }
        else {
            if (!Array.isArray(command.runtime)) {
                command.runtime = command.runtime ? [command.runtime] : [];
            }
            command.runtime.push(runtime);
        }
        return {
            // Like .deregisterRuntime, but deletes only the current runtime if there are multiple runtimes
            // for the same command.
            deregister: () => {
                const command = this.commandByName(commandName);
                if (Array.isArray(command.runtime)) {
                    command.runtime = command.runtime.filter(r => {
                        return r !== runtime;
                    });
                    if (command.runtime.length === 0) {
                        delete command.runtime;
                    }
                }
                else if (command.runtime) {
                    delete command.runtime;
                }
            },
        };
    }
    registerCommands(commands) {
        for (const command of commands) {
            CommandService.instance().registerRuntime(command.declaration.name, command.runtime());
        }
    }
    unregisterCommands(commands) {
        for (const command of commands) {
            CommandService.instance().unregisterRuntime(command.declaration.name);
        }
    }
    componentRegisterCommands(component, commands, allowMultiple) {
        const runtimeHandles = [];
        for (const command of commands) {
            runtimeHandles.push(CommandService.instance().registerRuntime(command.declaration.name, command.runtime(component), allowMultiple));
        }
        return {
            deregister: () => {
                for (const handle of runtimeHandles) {
                    handle.deregister();
                }
            },
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    componentUnregisterCommands(commands) {
        for (const command of commands) {
            CommandService.instance().unregisterRuntime(command.declaration.name);
        }
    }
    unregisterRuntime(commandName) {
        const command = this.commandByName(commandName, { mustExist: false });
        if (!command || !command.runtime)
            return;
        delete command.runtime;
    }
    createContext() {
        return {
            state: this.store_.getState(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            dispatch: (action) => {
                this.store_.dispatch(action);
            },
        };
    }
    getRuntime(command) {
        var _a, _b;
        if (!Array.isArray(command.runtime))
            return command.runtime;
        if (!command.runtime.length)
            return null;
        let bestRuntime = null;
        let bestRuntimeScore = -1;
        for (const runtime of command.runtime) {
            const score = (_b = (_a = runtime.getPriority) === null || _a === void 0 ? void 0 : _a.call(runtime, this.store_.getState())) !== null && _b !== void 0 ? _b : 0;
            if (score >= bestRuntimeScore) {
                bestRuntime = runtime;
                bestRuntimeScore = score;
            }
        }
        return bestRuntime;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async execute(commandName, ...args) {
        const command = this.commandByName(commandName);
        // Some commands such as "showModalMessage" can be executed many
        // times per seconds, so we should only display this message in
        // debug mode.
        if (commandName !== 'showModalMessage')
            this.logger().debug('CommandService::execute:', commandName, args);
        const runtime = this.getRuntime(command);
        if (!runtime)
            throw new Error(`Cannot execute a command without a runtime: ${commandName}`);
        return runtime.execute(this.createContext(), ...args);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    scheduleExecute(commandName, args) {
        shim_1.default.setTimeout(() => {
            void this.execute(commandName, args);
        }, 10);
    }
    currentWhenClauseContext() {
        return this.stateToWhenClauseContext_(this.store_.getState());
    }
    isPublic(commandName) {
        return !!this.label(commandName);
    }
    // When looping on commands and checking their enabled state, the whenClauseContext
    // should be specified (created using currentWhenClauseContext) to avoid having
    // to re-create it on each call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    isEnabled(commandName, whenClauseContext = null) {
        const command = this.commandByName(commandName);
        if (!command)
            return false;
        const runtime = this.getRuntime(command);
        if (!runtime)
            return false;
        if (!whenClauseContext)
            whenClauseContext = this.currentWhenClauseContext();
        const exp = new WhenClause_1.default(runtime.enabledCondition, this.devMode_);
        return exp.evaluate(whenClauseContext);
    }
    // The title is dynamic and derived from the state, which is why the state is passed
    // as an argument. Title can be used for example to display the alarm date on the
    // "set alarm" toolbar button.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    title(commandName, state = null) {
        const command = this.commandByName(commandName);
        if (!command)
            return null;
        const runtime = this.getRuntime(command);
        if (!runtime)
            return null;
        state = state || this.store_.getState();
        if (runtime.mapStateToTitle) {
            return runtime.mapStateToTitle(state);
        }
        else {
            return '';
        }
    }
    iconName(commandName) {
        const command = this.commandByName(commandName);
        if (!command)
            throw new Error(`No such command: ${commandName}`);
        return command.declaration.iconName;
    }
    label(commandName, fullLabel = false) {
        const command = this.commandByName(commandName);
        if (!command)
            throw new Error(`Command: ${commandName} is not declared`);
        const output = [];
        const parentLabel = (d) => {
            if (!d.parentLabel)
                return '';
            if (typeof d.parentLabel === 'function')
                return d.parentLabel();
            return d.parentLabel;
        };
        if (fullLabel && parentLabel(command.declaration))
            output.push(parentLabel(command.declaration));
        output.push(typeof command.declaration.label === 'function' ? command.declaration.label() : command.declaration.label);
        return output.join(': ');
    }
    description(commandName) {
        const command = this.commandByName(commandName);
        if (command.declaration.description)
            return command.declaration.description;
        return this.label(commandName, true);
    }
    exists(commandName) {
        const command = this.commandByName(commandName, { mustExist: false });
        return !!command;
    }
}
exports.default = CommandService;
