# Process Manager UI for Electron Apps

* * *

2022-01-06: Forked from https://github.com/krisdages/electron-process-manager

* * *

## Fork using @electron/remote instead of builtin remote module
* Minimum electron version is `10`
* [@electron/remote](https://github.com/electron/remote) is a peerDependency. It needs to be initialized in the main process. Follow the instructions in the link.

## Original 1.0 Readme

This package provides a process manager UI for Electron applications.

It opens a window displaying a table of every processes run by the Electron application with information (type, URL for `webContents`, memory..).

[![npm version](https://badge.fury.io/js/electron-process-manager.svg)](https://badge.fury.io/js/electron-process-manager)

![screenshot](https://github.com/getstation/electron-process-manager/raw/master/.github/screenshots/window.png)

~~:warning: For `@electron>=3.0.0, <7.x`, use version `0.7.1` of this package.
For versions `>=7.x`, use latest.~~

It can be useful to debug performance of an app with several `webview`.

It's inspired from Chrome's task manager.

## Features

- [ ] Memory reporting
- [ ] Link memory data to web-contents (for electron >=1.7.1)
- [x] Kill a process from the UI
- [x] Open developer tools for a given process
- [x] CPU metrics
- [x] Sort by columns

⚠️ Unfortunately, memory info are no longer available in Electron>=4 (see [electron/electron#16179](https://github.com/electron/electron/issues/16179))

## Installation

```bash
$ npm install electron-process-manager
```

## Usage
```js
const { openProcessManager } = require('electron-process-manager');

openProcessManager();
```

## Options
`openProcessManager` function can take options in paramters

#### options.defaultSorting
**defaultSorting.how**: `'ascending' | 'descending'`

**defaultSorting.path**:

| Field name         | path                       |
|--------------------|----------------------------|
| Pid                | 'pid'                      |
| WebContents Domain | 'webContents.0.URLDomain'  |
| Process Type       | 'webContents.0.type'       |
| Private Memory     | 'memory.privateBytes'      |
| Shared Memory      | 'memory.sharedBytes'       |
| Working Set Size   | 'memory.workingSetSize'    |
| % CPU              | 'cpu.percentCPUUsage'      |
| Idle Wake Ups /s   | 'cpu.idleWakeupsPerSecond' |
| WebContents Id     | 'webContents.0.id'         |
| WebContents Type   | 'webContents.0.type'       |
| WebContents URL    | 'webContents.0.URL'        |

example:
```js
const { openProcessManager } = require('electron-process-manager');

openProcessManager({ how: 'descending', path: 'cpu.percentCPUUsage' });
```

## Future

- Add physical memory (noted as "Memory" in Chrome's task manager)
- Add networks metrics

Pull requests welcome :)

## License

MIT License
