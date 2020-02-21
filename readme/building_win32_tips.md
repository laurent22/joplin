* * *

**IMPORTANT: The build system has been changed since this document was written, thus it contains outdated information. It is kept for now as it may still contain some tips on how to get things working.**

* * *

## Building Joplin on Windows

Building on Windows involved a few more steps for me, so I thought I'd leave some tips here in case they are helpful for others.

Use an "admin" command prompt when running the following. A quick way to open an admin command prompt is to press Windows-X, and then click on Command Prompt-Admin from the menu.

If you don't already have Node,

* Install Node from [here](https://nodejs.org/en/); one typically chooses the version labeled "LTS".

If you don't already have Yarn,

* Install Yarn from [here](https://yarnpkg.com/lang/en/docs/install/#windows-stable); I clicked Download Installer and ran the .msi to install.

Run the following from an admin prompt,

* Run `npm --vs2015 install --global windows-build-tools`

* I got a message saying that the installation succeeded, except that it "failed to install python 2.7". If you receive this error, you can install python 2.7 from [here](https://www.python.org/downloads/release/python-2715/)

* (the --vs2015 flag is needed because we want to have toolkit "v140", the default version is "v141", which comes with Visual Studio 2017. another way to install the v140 toolkit is to install ["build tools for visual studio"](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2017), click Install/modify under Build Tools in the upper left corner, then on the next screen, check the box for "VS 2015 tools" in the tree of options on the right, then click Install.)

* Run `npm install --global node-gyp`

* Run `cd c:\path\to\joplin`

* Run `cd ElectronClient`

* Run `xcopy /C /I /H /R /Y /S ..\..\ReactNativeClient\lib lib`

* if you got the error message about python 2.7, like I did, I had to set these environment variables, to point the build scripts to python. `set path=%path%;C:\python27` and `set PYTHON=C:\python27\python.exe`

* Run `npm install`

* Run `yarn dist`

* (I see this error in the cleanup phase, but it doesn't seem to affect building Joplin itself.) `Error: ENOENT: no such file or directory, copyfile 'C:\Users\...\AppData\Local\electron-builder\cache\nsis\nsis-3.0.3.0\elevate.exe' -> 'C:\...\joplin\joplin\ElectronClient\app\dist\win-unpacked\resources\elevate.exe'
	at doCopyFile (C:\...\joplin\ElectronClient\app\node_modules\builder-util\src\fs.ts:204:19)`

* Done: you can now run `ElectronClient\app\dist\win-unpacked\Joplin.exe`

## Running + debugging Joplin

Run the following from any cmd.exe prompt, doesn't need to be admin,

* Run `cd c:\path\to\joplin`

* Run `cd ElectronClient`

* Create a profile directory for testing, for example `mkdir c:\path\to\test_profile_dir`

* Run `.\node_modules\.bin\electron.cmd . --env dev --open-dev-tools --log-level debug --profile c:\path\to\test_profile_dir`

* Joplin will open with a chromium debug panel visible, console logging will appear there, and you can even set breakpoints/step through code.

* It can also be useful to look at `test_profile_dir\logs.txt` and see log statements.

* (Note: it doesn't work to use symlinks like `mklink /d` so that every "lib" directory points to the same location. this causes an error dialog when running electron saying that sprintf-js could not be loaded).

## Running tests

Run the following from any cmd.exe prompt, doesn't need to be admin,

* Run `cd c:\path\to\joplin`

* Run `cd CliClient`

* Run `npm install`

* (important) run `mkdir tests-build\data`

* Run `xcopy /C /I /H /R /Y /S .\tests .\tests-build` (we're following the actions in `run_test.sh`)

* Run `xcopy /C /I /H /R /Y /S ..\ReactNativeClient\lib tests-build\lib`

* Run `xcopy /C /I /H /R /Y /S ..\ReactNativeClient\locales tests-build\locales`

You should now be able to run any of the tests, such as `npm test tests-build/ArrayUtils.js`

This also works, which can be useful for attaching a debugger: `node ./node_modules/jasmine/bin/jasmine.js tests-build/ArrayUtils.js`

## Running tests in VSCode

* It's not the most elegant, but I put this together for running a test in vscode with breakpoint and debugging,

* Run the steps above for "Running tests"

* Create the file tests-build/.vscode/launch.json

* Place the following contents into launch.json,

		{
			"version": "0.2.0",
			"configurations": [
				{
					"type": "node",
					"request": "launch",
					"name": "joplin jasmine test",
					"cwd": "${workspaceFolder}",
					"runtimeExecutable": "node",
					"runtimeArgs": ["--inspect-brk", 
						"../node_modules/jasmine/bin/jasmine.js", 
						"../tests-build/ArrayUtils.js"],
					"protocol": "inspector",
					"port": 9229,
					"smartStep": true,
					"skipFiles": [
						"${workspaceRoot}/../node_modules/**/*.js",
						"<node_internals>/**"
					],
				}
			]
		}

* (the smartStep and skipFiles make it much cleaner to step into an `await` call.)

* If you're debugging a test other than ArrayUtils.js, edit launch.json and replace the reference to ArrayUtils.js with another script 

* Open VSCode, File->Open Folder, and open the `tests-build` folder. (you have to use *Open Folder* for this to work).

* Set a breakpoint in the test's code. Debug->Start Debugging (F5) will run the test and hit the breakpoints.
