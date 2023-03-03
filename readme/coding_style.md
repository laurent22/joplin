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

# React

## Use function components for new code

New code should use [React Hooks](https://reactjs.org/docs/hooks-intro.html) and `function` components, rather than objects that extend `Component`.

**Bad:**
```tsx
// Don't do this in new code!
class Example extends React.Component {
	constructor(props: { text: string }) {
		super(props);
	}

	render() {
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
