"use strict";
// Based on https://github.com/grimen/node-env-file with various improvements to
// remove global state and conversion to TypeScript.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEnvFile = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const parseEnvFile = (env_file, options = {}) => {
    options = Object.assign({ logger: console, overwrite: false, raise: true, verbose: false, allowDuplicateKeys: false }, options);
    if (typeof env_file !== 'string') {
        if (options.raise) {
            throw new TypeError(`Environment file argument is not a valid \`String\`: ${env_file}`);
        }
        else {
            if (options.verbose && options.logger) {
                options.logger.error('[ENV]: ERROR Environment file argument is not a valid `String`:', env_file);
            }
            return {};
        }
    }
    try {
        env_file = (0, path_1.resolve)(env_file);
    }
    catch (error) {
        if (options.raise) {
            throw new TypeError(`Environment file path could not be resolved: ${error}`);
        }
        else {
            if (options.verbose && options.logger) {
                options.logger.error('[ENV]: ERROR Environment file path could not be resolved:', env_file);
            }
            return {};
        }
    }
    const data = {};
    data[env_file] = {};
    if (options.verbose && options.logger) {
        options.logger.info('[ENV]: Loading environment:', env_file);
    }
    if ((0, fs_extra_1.existsSync)(env_file)) {
        let lines = [];
        try {
            lines = ((0, fs_extra_1.readFileSync)(env_file, 'utf8') || '')
                .split(/\r?\n|\r/)
                .filter((line) => {
                return /\s*=\s*/i.test(line);
            })
                .map((line) => {
                return line.replace('exports ', '');
            });
        }
        catch (error) {
            if (options.raise) {
                error.message = `Environment file could not be read: ${env_file}: ${error.message}`;
                throw error;
            }
            else {
                if (options.verbose && options.logger) {
                    options.logger.error('[ENV]: ERROR Environment file could not be read:', env_file);
                }
                return {};
            }
        }
        const lineComments = [];
        const lineVariables = [];
        let is_comment = false;
        for (const line of lines) {
            is_comment = /^\s*#/i.test(line); // ignore comment lines (starting with #).
            if (is_comment) {
                lineComments.push(line);
                if (options.verbose && options.logger) {
                    options.logger.info('[ENV]: Ignored line:', line);
                }
            }
            else {
                lineVariables.push(line);
                const key_value = line.match(/^([^=]+)\s*=\s*(.*)$/);
                const env_key = key_value[1];
                // remove ' and " characters if right side of = is quoted
                const env_value = key_value[2].match(/^(['"]?)([^\n]*)\1$/m)[2];
                if ((env_key in data[env_file]) && !options.allowDuplicateKeys)
                    throw new Error(`Found duplicate key: ${env_key}`);
                if (options.overwrite) {
                    data[env_file][env_key] = env_value;
                    if (options.verbose && options.logger && data[env_file][env_key] !== env_value) {
                        options.logger.info('[ENV]: Overwritten ', data[env_file][env_key], ' => ', env_value);
                    }
                }
                else {
                    data[env_file][env_key] = process.env[env_key] || env_value;
                }
                if (options.verbose && options.logger) {
                    options.logger.info('[ENV]:', data[env_file]);
                }
            }
        }
    }
    else {
        if (options.raise) {
            throw new TypeError(`Environment file doesn't exist: ${env_file}`);
        }
        else {
            if (options.verbose && options.logger) {
                options.logger.error('[ENV]: ERROR Environment file path could not be resolved:', env_file);
            }
            return {};
        }
    }
    return data[env_file];
};
exports.parseEnvFile = parseEnvFile;
//# sourceMappingURL=env.js.map