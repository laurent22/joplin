#!/usr/bin/env node

"use strict";

const spawn = require("child_process").spawn;
const os = require("os");
const fs = require("fs-extra");

const joplinPath = __dirname + "/node_modules/.bin/joplin";
const profileDir = os.homedir() + "/.config/demo-joplin";
const dbFilename = "database.sqlite";

fs.ensureDirSync(profileDir);
if (!fs.pathExistsSync(profileDir + "/" + dbFilename)) {
	fs.copySync(__dirname + "/" + dbFilename, profileDir + "/" + dbFilename);
}

const opt = {
	cwd: __dirname,
	env: (function() {
		process.env.NODE_PATH = ".";
		return process.env;
	})(),
	stdio: [process.stdin, process.stdout, process.stderr],
};

const app = spawn(joplinPath, ["--is-demo", "--profile", profileDir], opt);

app.on("close", code => {
	process.exit(code);
});
