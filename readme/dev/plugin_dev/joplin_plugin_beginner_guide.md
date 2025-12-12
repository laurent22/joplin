# Joplin Plugin Development

**A complete step-by-step tutorial for creating, building, testing, and publishing a Joplin plugin**

---

## Introduction

This guide provides a clear, beginner-friendly introduction to developing plugins for the Joplin Desktop application. No prior experience with TypeScript or plugin development is required.

### What You'll Learn

- Set up a development environment
- Generate a plugin using the official Joplin Plugin Generator
- Understand the plugin file structure
- Write and build your first plugin 
- Test your plugin in Joplin
- Package and publish your plugin
- (Optional) Build plugins with HTML/JS/React user interfaces

---

## Step 1: Set Up Your Development Environment

Before creating a Joplin plugin, ensure the following tools are installed:

### 1. Node.js (LTS Version)
Required to execute JavaScript/TypeScript outside the browser. Installing Node.js automatically includes npm.

**Download from:** https://nodejs.org/

### 2. npm (Node Package Manager)
Used to install project dependencies and development tools. This is installed automatically with Node.js.

### 3. A Code Editor
Recommended editors:
- **Visual Studio Code** (best for TypeScript)
- Atom
- Sublime Text

### 4. Yeoman
The project scaffolding tool will be installed in the next step.

---

## Step 2: Install Yeoman and the Joplin Plugin Generator

Open your terminal and run:

```bash
npm install -g yo
npm install -g generator-joplin-plugin
```

This installs:
- Yeoman (`yo`)
- Official Joplin Plugin Generator

---

## Step 3: Generate a Plugin Template

Run the following command in your terminal:

```bash
yo joplin-plugin
```

Yeoman will prompt you for:
- Plugin name
- Description
- Author name
- Version (default is fine)
- GitHub URL (optional)

Once completed, a new folder is created with the following structure:

```
my-plugin/
│
├─ manifest.json
├─ package.json
├─ tsconfig.json
├─ webpack.config.js
├─ src/
│   └─ index.ts
└─ README.md
```

---

## Step 4: Understanding the Plugin Structure

### `manifest.json`
Defines plugin metadata including:
- Name
- Version
- Minimum Joplin version
- Entry point (usually `dist/index.js`)
- Description

This file determines how Joplin loads your plugin.

### `package.json`
Contains:
- Dependencies
- Build scripts
- Plugin metadata
- Version number

Key script:
```json
"scripts": {
  "build": "webpack --mode production"
}
```

### `tsconfig.json`
Configuration file for TypeScript compilation.

### `webpack.config.js`
Bundles the TypeScript code into the final plugin output inside `dist/`.

### `src/index.ts`
This is the main entry point of your plugin. All commands, dialogs, UI logic, panels, and features go here.

---

## Step 5: Writing Your First Plugin

Open `src/index.ts` and add the following code:

```typescript
import joplin from 'api';

joplin.plugins.register({
    onStart: async () => {

        // Register a new command
        await joplin.commands.register({
            name: 'sayHello',
            label: 'Say Hello',
            execute: async () => {

                // Display a pop-up message
                await joplin.views.dialogs.showMessageBox(
                    'Hello from your plugin!'
                );
            }
        });

        console.log('Plugin started');
    }
});
```

This simple plugin:
- Registers the plugin
- Adds a command named `sayHello`
- Shows a pop-up message when the command is executed

---

## Step 6: Build the Plugin

Run the following command in your terminal:

```bash
npm run build
```

This command:
- Compiles TypeScript
- Bundles the plugin using webpack
- Outputs the plugin code to `dist/index.js`

This is the file Joplin executes.

---

## Step 7: Test the Plugin in Joplin

1. **Open Joplin Desktop**

2. **Navigate to:**
   `Tools → Options → Plugins → Development Plugins`

3. **Click** `Load plugin from folder`

4. **Select** your plugin folder (the one containing `manifest.json`)

5. **Enable** the plugin

6. **Open the Command Palette:**
   - Windows/Linux: `Ctrl + Shift + P`
   - macOS: `Cmd + Shift + P`

7. **Type:** `Say Hello`

8. **Press Enter**

You should see a pop-up message.**Your first plugin is working!**

---

## Step 8: Packaging Plugins (.jpl)

There are two ways to test your plugin:
- **Loading from a folder** → best for development
- **Installing a .jpl file** → best for sharing/testing

### Step 8A: Create a Packaging Script

Add this to your `package.json` scripts:

```json
"dist": "npm run build && zip -r my-plugin.jpl manifest.json dist/"
```

Then run:

```bash
npm run dist
```

This creates: `my-plugin.jpl`

### Step 8B: Install the .jpl File

1. Open Joplin
2. Go to `Tools → Options → Plugins`
3. Click `Add Plugin`
4. Select your `.jpl` file
5. Restart Joplin

Now your plugin behaves exactly as if a user installed it.

---

## Step 9: Adding Features (Optional Enhancements)

Once you understand the basics, you can add:
- Commands
- Toolbar buttons
- Sidebar panels
- HTML/JS-powered panels
- Dialogs
- React UI
- Settings screens
- Editor integration
- Message passing between backend and UI

Each of these features uses well-documented parts of the Joplin API.

---

## Step 10: Publishing Your Plugin

When ready to share your plugin with the Joplin community:

### 1. Add the required npm keyword

In `package.json`:

```json
"keywords": ["joplin-plugin"]
```

### 2. Publish to npm

```bash
npm publish
```

### 3. Automatic indexing

Joplin automatically scans npm for plugins with the keyword `joplin-plugin`. Your plugin will appear in the Joplin Plugin Manager.

---

## Step 11: Building Plugins with Web UI (Optional)

If your plugin requires a custom interface, you can embed:
- HTML
- CSS
- JavaScript
- React

### Step 11A: Example File Structure

```
my-web-ui-plugin/
├─ manifest.json
├─ package.json
├─ tsconfig.json
├─ webpack.config.js
├─ src/
│   ├─ index.ts
│   └─ ui/
│       ├─ panel.html
│       ├─ script.js
│       └─ style.css
└─ README.md
```

### Step 11B: Load an HTML Panel

In `src/index.ts`:

```typescript
import joplin from 'api';
import fs from 'fs';
import path from 'path';

joplin.plugins.register({
    onStart: async () => {
        const panel = await joplin.views.panels.create('myPanel');

        const html = fs.readFileSync(
            path.resolve(__dirname, 'ui/panel.html'),
            'utf-8'
        );

        await joplin.views.panels.setHtml(panel, html);
    }
});
```

### Step 11C: Example Panel HTML

```html
<h2>My Web UI Plugin</h2>

<button id="helloBtn">Say Hello</button>

<script src="./script.js"></script>
<link rel="stylesheet" href="./style.css">
```

### Step 11D: Panel JavaScript

```javascript
document.getElementById('helloBtn').addEventListener('click', () => {
    alert('Hello from Web UI plugin!');
});
```

---
### Step 11E: React Option
React works the same way — bundle React build, then load into setHtml.

## Conclusion

By following these steps, you now know how to:
- Set up a plugin development environment
- Generate and understand a Joplin plugin template
- Write and test a working plugin
- Package and publish your plugin
- Create more advanced web-based interfaces

---

## Additional Resources

- **Joplin Plugin API Documentation:** https://joplinapp.org/api/references/plugin_api/
- **Joplin Forum:** https://discourse.joplinapp.org/
- **Plugin Examples:** Browse existing plugins on npm with the `joplin-plugin` keyword

