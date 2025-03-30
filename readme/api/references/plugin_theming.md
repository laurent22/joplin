# Plugin theming

## CSS

Plugins add custom content to the UI using [webview panels](https://joplinapp.org/api/references/plugin_api/classes/joplinviewspanels.html). The HTML content of a a panel is styled with CSS.

To keep the look and feel of a plugin consistent with the rest of the Joplin UI, you are automatically provided with variables derived from the current theme.

Variables follow the naming convention `--joplin-{property}` and are used in your plugin's stylesheet as shown here.

```css
/* webview.css */
.container {
	color: var(--joplin-color);
	font-family: var(--joplin-font-family);
}
```

## Icons

On desktop, your plugin view will have access to icons used by the app. It is however not recommended to use them because they may change in future versions. And it will also make your plugin incompatible with the mobile app (which does not expose any icon library).

Instead a recommended approach is to add Font Awesome in your plugin project, and to import only the icons you'll need. To do so using React, follow these instructions:

**Install Font Awesome:**

```shell
npm install --save @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/free-regular-svg-icons @fortawesome/react-fontawesome
```

**Import and load the icons:**

From one of your top TypeScript files:

```typescript
import { library } from '@fortawesome/fontawesome-svg-core';

// Import the specific icons you want to use
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { faCheckCircle } from '@fortawesome/free-regular-svg-icons';

// Add the icons to the library
library.add(faTimes, faCheckCircle);
```

**Use Font Awesome React Components:**

```JSX
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const App = () => {
    return (
        <div>
            <FontAwesomeIcon icon="times" />
            <FontAwesomeIcon icon={['far', 'check-circle']} />
        </div>
    );
}

export default App;
```

If you are not using React, just ask ChatGPT on how to do the above using you preferred JS framework.