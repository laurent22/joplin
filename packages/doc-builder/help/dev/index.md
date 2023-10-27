# User support

The [Joplin Forum](https://discourse.joplinapp.org/) is the community driven place for user support, general discussion about Joplin, problems with installation, new features and software development questions. It is possible to login with your GitHub account. Don't use the issue tracker for support questions.

# Reporting a bug

File bugs in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). Please follow these guidelines:

- Search existing issues first, make sure yours hasn't already been reported.
- Please follow the template.
- Consider [enabling debug mode](https://joplinapp.org/debugging/) so that you can provide as much details as possible when reporting the issue.
- Stay on topic, but describe the issue in detail so that others can **reproduce** it.
- **Provide a screenshot** if possible. A screenshot showing the problem is often more useful than a paragraph describing it.
- For web clipper bugs, **please provide the URL causing the issue**. Sometimes the clipper works in one page but not in another so it is important to know what URL has a problem.

# Feature requests

Feature requests **must be opened and discussed on the [forum](https://discourse.joplinapp.org/c/features)**. After they have been accepted, they can be added to the GitHub tracker.

Please check that your request has not already been posted on the forum or the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). If it has, **up-voting the issue or topic** increases the chances it'll be noticed and implemented in the future. "+1" comments are not tracked.

Avoid listing multiple requests in one topic. One topic per request makes it easier to track and discuss it.

Finally, when submitting a pull request, don't forget to [test your code](#automated-tests).

# Contributing to Joplin's translation

Joplin is available in multiple languages thanks to the help of its users. You can help translate Joplin to your language or keep it up to date. Please read the documentation about [Localisation](https://joplinapp.org/help/#localisation).

# Contributing to Joplin's code

If you want to start contributing to the project's code, please follow these guidelines before creating a pull request: 

- The top post of the pull request should contain a full, self-contained explanation of the feature: what it does, how it does it, with examples of usage and screenshots. Also explain why you want to add this - what problem does it solve. Do not simply add a text `Implement feature #4345` or link to forum posts, because the information there will most likely be outdated or confusing (multiple discussions and opinions). The pull request needs to be self-contained.
- Bug fixes are always welcome. Start by reviewing the [list of bugs](https://github.com/laurent22/joplin/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
- A good way to easily start contributing is to pick and work on a [good first issue](https://github.com/laurent22/joplin/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). We try to make these issues as clear as possible and provide basic info on how the code should be changed, and if something is unclear feel free to ask for more information on the issue.
- Before adding a new feature, ask about it in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue) or the [Joplin Forum](https://discourse.joplinapp.org/), or check if existing discussions exist to make sure the new functionality is desired.
- **Changes that will consist of more than 50 lines of code should be discussed on the [Joplin Forum](https://discourse.joplinapp.org/)**, so that you don't spend too much time implementing something that might not be accepted.
- All the applications share the same backend (database, synchronisation, settings, models, business logic, etc.) so if you change something in the backend in one app, make sure it still works in the other apps. Usually it does, but keep this in mind.
- Pull requests that make many changes using an automated tool, like for spell fixing, styling, etc. will not be accepted. An exception would be if the changes have been discussed in the forum and someone has agreed to review **and test** the pull request.
- Pull requests that address multiple issues will most likely stall and eventually be closed. This is because we might be fine with one of the changes but not with others and untangling that kind of pull request is too much hassle both for maintainers and the person who submitted it. So most of the time someone gives up and the PR gets closed. So please keep the pull request focused on one issue.
- **Do not mark your reviewer's comments as "resolved"**. If you do that, the comments will be hidden and the reviewer will not know what are the pending issues in the pull request. Only the reviewer should resolve the comments.

Building the apps is relatively easy - please [see the build instructions](https://github.com/laurent22/joplin/blob/dev/BUILD.md) for more details.

## Signing the Individual Contributor License Agreement

All contributors to the project must sign our [Individual Contributor License Agreement](https://github.com/laurent22/joplin/blob/dev/readme/cla.md).

## Coding style

Please see [readme/coding_style.md](readme/coding_style.md).

## GUI style

For changes made to the Desktop and mobile clients that affect the user interface, refer to `packages/lib/theme.ts` for all styling information. The goal is to create a consistent user interface to allow for easy navigation of Joplin's various features and improve the overall user experience.

## Automated tests

When submitting a pull request for a new feature or a bug fix, please add automated tests. We use [Jest](https://jestjs.io/) as a testing framework so you will need to be familiar with it or go through their documentation.

### Running the tests

To run all the test units, run from the root:

```sh
yarn test
```

Or you can go inside a package folder, and run the tests from there. For example to run all the library tests, go in `packages/lib` and run `yarn test`

To run just one particular file:

```sh
# Run all the tests in markdownUtils.test.ts
yarn test markdownUtils
```

To run only a particular test in a file:

```sh
# Run only the test described as "should handle conflict"
# inside markdownUtils.test.ts:
yarn test markdownUtils --filter="should handle conflict"
```

### Adding a new test file

To add a test, simply create a new file with an extension `.test.ts` in the same directory. For example if you are working on the file `example.ts`, create a file `example.test.ts` for the unit tests. If this file already exist, simply add your tests directly to it.

### Setting the testing environment

Many utility functions are available under the package `@joplin/lib/testing/test-utils`. Have a look for example at [Note.test.ts](https://github.com/laurent22/joplin/blob/dev/packages/lib/models/Note.test.ts) to see how to setup test units with database support and synchroniser support. Note that this is not needed for all tests - if you just have a simple functions to test you won't need that extra setup.

### Testing React Hooks

To test React Hooks please use the package `@testing-library/react-hooks`. See [useLayoutItemSizes.test.ts](https://github.com/laurent22/joplin/blob/dev/packages/app-desktop/gui/ResizableLayout/utils/useLayoutItemSizes.test.ts) for an example.

### If it is not possible to add tests

More often than not, it is actually possible to add tests - just go back to your code and see if it can be refactored and certain functionalities moved to simple functions (with no dependencies). Once you have a simple function, you can easily add unit tests for it.

Additionally, if the unit tests are not sufficient, please provide a **manual testing plan**, which should include detailed steps on:

- How to test that your feature is working. Include at least 5 tests. Try to think of the possible inputs - if it's a list, how does it work with 0 elements, or 1, or 10, or 100,000. If it's a text input, how does it work with an empty string, or a very large string, etc. Basically don't just put one test that check the best case scenario.

- How to verify that related parts of the applications are not broken. For example if you changed the note loading logic, check that the toolbar is still working as expected (and not modifying the previously loaded note for example), check that switching from one note to another still works. Look at the note list and verify that the note title is updated there too, etc.

A reviewer should be able to run the app with your changes, then do the above steps to verify that everything's working as expected.

## About abandoned pull requests

It happens that a pull request is started but not finished and despite our attempts to contact the contributor, we don't hear from them again.

In that case we will not merge the pull request, even if only small changes are missing. Our policy is simply to close the pull request. Why? Because an unfinished pull request essentially means giving us work and moving on. We would rather not encourage this behaviour.

Also, please note that since we have spent time reviewing the pull request and proposing solutions, we reserve the right to re-use that knowledge to create a new pull request, potentially based on your changes.

We'd much prefer that you complete the pull request though, so we'll be sure to ping you a few times before that!
