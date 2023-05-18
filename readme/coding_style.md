# Coding style

Coding style is mostly enforced by a pre-commit hook that runs `eslint`. This hook is installed whenever running `yarn install` on any of the application directory. If for some reason the pre-commit hook didn't get installed, you can manually install it by running `yarn install` at the root of the repository.

## Enforcing rules using eslint

Whenever possible, coding style should be enforced using an eslint rule. To do so, add the relevant rule or plugin to `eslintrc.js`. To manually run the linter, run `yarn run linter ./` from the root of the project.

When adding a rule, you will often find that many files will no longer pass the linter. In that case, you have two options:

- Fix the files one by one. If there aren't too many files, and the changes are simple (they are unlikely to introduce regressions), this is the preferred solution.

- Or use `yarn run linter-interactive ./` to disable existing errors. The interactive tool will process all the files and you can then choose to disable any existing error that it finds (by adding a `eslint-disable-next-line` comment above it). This allows keeping the existing, working codebase as it is, and enforcing that new code follows the rule. When using this method, add the comment "Old code before rule was applied" so that we can easily find back all the lines that have been automatically disabled.

## Use TypeScript for new files

### Creating a new `.ts` file

Because the TypeScript compiler generates `.js` files, be sure to add these new `.js` files to `.eslintignore` and `.gitignore`.

To do this,
1. If the TypeScript compiler has already generated a `.js` file for the new `.ts` file, delete it.
2. Run `yarn run updateIgnored` in the root directory of the project (or `yarn run postinstall`)

### Convert existing `.js` files to TypeScript before modifying

Even if you are **modifying** a file that was originally in JavaScript you should ideally convert it first to TypeScript before modifying it.

If this is a large file however please ask first if it needs to be converted. Some very old and large JS files are tricky to convert properly due to poorly defined types, so in some cases it's better to leave that for another day (or another PR).

### Prefer `import` to `require`

In TypeScript files prefer `import` to `require` so that we can benefit from type-checking. If it does not work, you may have to add the type using `yarn add @types/NAME_OF_PACKAGE`. If you are trying to import an old package, it may not have TypeScript types and in this case using `require()` is acceptable.

### Avoid inline types

In general please define types separately as it improves readability and it means the type can be re-used.

**BAD:**
```ts
const config: { [key: string]: Knex.Config } = {
	// ...
}	
```

**Good:**
```ts
type Config = Record<string, Knex.Config>;

const config: Config = {
	// ...
}	
```

## Filenames

 * `camelCase.ts`: Files that export multiple things.
   * Example: [`checkForUpdates.ts`](https://github.com/laurent22/joplin/blob/dev/packages/app-desktop/checkForUpdates.ts)
 * `PascalCase.ts`: [Only if the file contains a single class, which is the default export.](https://github.com/laurent22/joplin/pull/6607#discussion_r906847156)
 * `types.ts` or `fooTypes.ts`: [Shared type definitions](https://github.com/laurent22/joplin/pull/6607#discussion_r906847156)
   * Example : [`types.ts`](https://github.com/laurent22/joplin/blob/dev/packages/server/src/utils/types.ts)


## Use the same case for imported and exported members

If you create a file that exports a single function called `processData()`, the file should be named `processData.ts`. When importing, it should be imported as `processData`, too. Basically, be consistent with naming, even though JS allows things to be named differently.

**BAD:**
```ts
// ProcessDATA.ts
export default const processData = () => {
	// ...
};

// foo.ts
import doDataProcessing from './ProcessDATA';

doDataProcessing();
...
```

**Good:**
```ts
// processData.ts
export default const processData = () => {
	// ...
};

// foo.ts
import processData from './processData';

processData();
...
```

## Only import what you need

Only import what you need so that we can potentially benefit from [tree shaking](https://webpack.js.org/guides/tree-shaking/) if we ever implement it.

**BAD:**
```ts
import * as fs from 'fs-extra';
// ...
fs.writeFile('example.md', 'example');
```

**Good:**
```ts
import { writeFile } from 'fs-extra';
// ...
writeFile('example.md', 'example');
```

## Use `camelCase` for `const`ants in new code

**BAD:**
```ts
// Bad! Don't use in new code!
const GRAVITY_ACCEL = 9.8;
```

**Good:**
```ts
const gravityAccel = 9.8;
```

## Declare variables just before their usage

**BAD:**
```ts
// Bad!
let foo, bar;

const doThings = () => {
	// do things unrelated to foo, bar
};

// Do things involving foo and bar
foo = Math.random();
bar = foo + Math.random() / 100;
foo += Math.sin(bar + Math.tan(foo));
...
```

**Good:**
```ts
...
const doThings = () => {
	// do things unrelated to foo, bar
};

// Do things involving foo and bar
let foo = Math.random();
let bar = foo + Math.random() / 100;
foo += Math.sin(bar + Math.tan(foo));
...
```

Don't allow this to lead to duplicate code, however. If constants are used multiple times, it's okay to declare them at the top of a file or in a separate, imported file.


## Prefer `const` to `let` (where possible)


## Prefer `() => {}` to `function() { ... }`

Doing this avoids having to deal with the `this` keyword. Not having it makes it easier to refactor class components into React Hooks, because any use of `this` (used in classes) will be correctly detected as invalid by TypeScript.

**BAD:**
```ts
// Bad!
function foo() {
	...
}
```

**Good:**
```ts
const foo = () => {
	...
};
```

### See also
 * [Frontend Armory — When should I use arrow functions with React?](https://frontarm.com/james-k-nelson/when-to-use-arrow-functions/)



## Avoid default and optional parameters

As much as possible, avoid default parameters in **function definitions** and optional fields in **interface definitions**. When all parameters are required, it is much easier to refactor the code because the compiler will automatically catch any missing parameters.

## Escape variables

[XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) is one of the most common vulnerabilities in today's code. These vulnerabilities are often difficult to spot because they are not errors, they often won't fail any test units and the program will work just fine with 99% of input. Yet that remaining 1% can be exploited and used to steal user information, crash the app, etc.

If you search for ["XSS" in the Joplin git log](https://github.com/laurent22/joplin/search?q=xss&type=commits) you'll find several security vulnerabilities that have been fixed over the year, and that happened in various places that are hard to predict. So we need to be careful with this and make sure we correctly escape user content.

We should do so even if we think we control the input or that it will always have a certain format. That may change in the future, or that could be exploited via another bug.

Finally, escaping data is often required to prevent markup code from breaking. For example quotes or angled brackets have to be escaped in HTML or else the markup is likely to break.

How you escape the data depends on where you are going to insert it so there's no single function that's going to cover all cases.

### To insert into a JS script

Use `JSON.stringify()`. For example:

```ts
const jsCode = `const data = ${JSON.stringify(dynamicallyGeneratedData)};`
```

### To insert into an HTML string

You need to convert special characters to HTML entities, which we usually do using the `html-entities` package. For example:

```ts
// We generally use this rather verbose pattern, but there
// are also helper functions that you may be able to use
// depending on the package.
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const html = `<a href="${htmlentities(attributes)}">${htmlentities(content)}</a>`;
```

### To insert into a URL

It depends on what you're trying to do. To insert a query parameter, use `encodeURIComponent`

```ts
const url = `https://example.com/?page=${encodeURIComponent(page)}`;
```

If you want to encode a full URL, use `encodeURI`:

```ts
encodeURI('https://domain.com/path to a document.pdf');
// 'https://domain.com/path%20to%20a%20document.pdf'
```

### To insert into Markdown code

Use the provided escape functions in `lib/markdownUtils`:

- `escapeTableCell()` for tables
- `escapeInlineCode()` for inline code
- `escapeTitleText()`and `escapeLinkUrl()` for links:

```ts
const markdown = `[${markdownUtils.escapeTitleText(linkTitle)}](${markdownUtils.escapeLinkUrl(linkUrl)})`;
```

### Escape as late as possible

Ideally the application should only deal with raw, unencoded data, so it means data should be decoded and encoded at the application boundaries. Doing so means we avoid accidentally double-escaping data, or having to encode/decode within the app, which is error prone.

In practice it means as soon as we get user input, we should decode it to the application-specific format (for example by calling `JSON.parse` on the input). And likewise we should only escape the data when it needs to be printed or exported.

**BAD**

```ts
let parameters = `id=${encodeURIComponent(id)}&time=${encodeURIComponent(Date.now())}`;

// Clumsy string concatenation because we're dealing with already escaped data.
// and we have to remember to encode every time:
parameters += `&other=${encodeURIComponent(otherParam)}`; 

const url = `https://example.com?${parameters}`
```

**GOOD**

```ts
// Keep the data as an object
const parameters = {
	id: id,
	timestamp: Date.now(),
};

// Then we can easily add to it without string concatenation:
parameters.other = otherParam;

// We escape only when it is needed:
const url = `https://example.com?${new URLSearchParams(parameters).toString()}`
```

### Make wrong code look wrong

To name variables that are already escaped we used the technique described in "[Make wrong code look wrong](https://www.joelonsoftware.com/2005/05/11/making-wrong-code-look-wrong/)". We add a suffix to indicate the content of the variable and to make it clear it has already been escaped. It means that the code will look wrong if a variable is inserted in a string and it does not have a suffix. For example:

**BAD:**

```ts
const userContent = queryParameters.page;

// ...
// later:
// ...

const html = `<div>${userContent}</div>`

// The above code looks wrong because it appears we're
// inserting user input as is in the document, and
// indeed we are. Wrong code looks wrong.
```

**GOOD:**

```ts
// Here we escape the data immediately - and we add an
// "html" prefix to specify that we have escaped the data
// and that the variable content is actual HTML.
const userContentHtml = htmlentities(queryParameters.page);

// ...
// later:
// ...

const html = `<div>${userContentHtml}</div>`

// This is correct and because we've added the "html" suffix
// we know that this variable can be safely added to an HTML
// string.
```

# React

## Use function components for new code

New code should use [React Hooks](https://reactjs.org/docs/hooks-intro.html) and `function` components, rather than objects that extend `Component`.

**Bad:**
```tsx
// Don't do this in new code!
class Example extends React.Component {
	public constructor(props: { text: string }) {
		super(props);
	}

	public render() {
		return (
			<div>${text}</div>
		);
	}
}
```

**Good:**
```tsx
const Example = (props: { text: string }) => {
	return (
		<div>${text}</div>
	);
};
```
## Use react [custom hooks](https://reactjs.org/docs/hooks-custom.html) to simplify long code

If `eslint` gives an error about `useFoo` being called outside of a component, be sure [the custom hook is titled appropriately](https://stackoverflow.com/a/55862839).

# Database

## Use snake_case

We use `snake_case` for table names and column names.

## Everything is NOT NULL

All columns should be defined as `NOT NULL`, possibly with a default value (but see below). This helps keeping queries more simple as we don't have to do check for both `NULL` and `0` or empty string.

## Use defaults sparingly

Don't automatically give a default valuet to a column - in many cases it's better to require the user to explicitly set the value, otherwise it will be set to a default they might not know about or want. Exceptions can be less important columns, things like timestamp, or columns that are going to be set by the system.

## Use an integer for enum-like values

If a column can be set to a fixed number of values, please set the type to integer. In code, you would then have a TypeScript enum that defines what each values is for. For example:

```typescript
export enum Action {
	Create = 1,
	Update = 2,
	Delete = 3,
}
```

We don't use built-in database enums because they make migrations difficult. They provide added readability when accessing the database directly, but it is not worth the extra trouble.

## Prefer using `tinyint(1)` to `bool`
Booleans are not a distinct types in many common DBMS, including SQLite (which we use) and MySQL, so prefer using a `tinyint(1)` instead.

# Web requests and API

## Use `snake_case`

We use `snake_case` for end points and query parameters.

# See also
## **Other** projects' style guides

We aren't using these guides, but they may still be helpful!
 * [TypeScript Deep Dive — Style Guide](https://basarat.gitbook.io/typescript/styleguide)
 * [Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html)
	* See also [`ts.dev`'s style guide](https://ts.dev/style/#function-expressions), which is based on the Google style guide.
 * [Javascript standardstyle](https://standardjs.com/rules.html)
	* Possibly useful for adding to `.eslintrc.js`: lists `eslint` configuration flags for each of their suggestions

## Posts/resources related to Joplin's style

 * Forum Post: [Troubleshooting FAQ and collecting topic for contributing to Joplin codebase](https://discourse.joplinapp.org/t/troubleshooting-faq-and-collecting-topic-for-contributing-to-joplin-codebase/6501)
 * Forum Post: [How to style your code](https://discourse.joplinapp.org/t/how-to-style-your-code/6502)
 * GSoC: [GSoC 2022 pull request guidelines](gsoc2022/pull_request_guidelines.md)
 * GitHub: [`.eslintrc.js`](https://github.com/laurent22/joplin/blob/dev/.eslintrc.js)
