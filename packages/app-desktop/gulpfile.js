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
const gulp = require('gulp');
const utils = require('@joplin/tools/gulp/utils');
const compileSass = require('@joplin/tools/compileSass');
const compilePackageInfo = require('@joplin/tools/compilePackageInfo');
const buildAll_1 = require("@joplin/default-plugins/commands/buildAll");
const tasks = {
    compileScripts: {
        fn: require('./tools/compileScripts'),
    },
    compilePackageInfo: {
        fn: () => __awaiter(void 0, void 0, void 0, function* () {
            yield compilePackageInfo(`${__dirname}/package.json`, `${__dirname}/packageInfo.js`);
        }),
    },
    copyPluginAssets: {
        fn: require('./tools/copyPluginAssets.js'),
    },
    copyApplicationAssets: {
        fn: require('./tools/copyApplicationAssets.js'),
    },
    electronRebuild: {
        fn: require('./tools/electronRebuild.js'),
    },
    electronBuilder: {
        fn: require('./tools/electronBuilder.js'),
    },
    buildDefaultPlugins: {
        fn: () => __awaiter(void 0, void 0, void 0, function* () {
            const outputDir = `${__dirname}/build/defaultPlugins/`;
            yield (0, buildAll_1.default)(outputDir);
        }),
    },
    tsc: require('@joplin/tools/gulp/tasks/tsc'),
    updateIgnoredTypeScriptBuild: require('@joplin/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
    buildCommandIndex: require('@joplin/tools/gulp/tasks/buildCommandIndex'),
    compileSass: {
        fn: () => __awaiter(void 0, void 0, void 0, function* () {
            yield compileSass(`${__dirname}/style.scss`, `${__dirname}/style.min.css`);
        }),
    },
};
utils.registerGulpTasks(gulp, tasks);
const buildBeforeStartParallel = [
    'compileScripts',
    'compilePackageInfo',
    'copyPluginAssets',
    'copyApplicationAssets',
    'updateIgnoredTypeScriptBuild',
    'buildCommandIndex',
    'compileSass',
];
gulp.task('before-start', gulp.parallel(...buildBeforeStartParallel));
const buildAllParallel = [
    ...buildBeforeStartParallel,
    'buildDefaultPlugins',
];
gulp.task('build', gulp.parallel(buildAllParallel));
//# sourceMappingURL=gulpfile.js.map