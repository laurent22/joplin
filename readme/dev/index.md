# Contributing to Joplin

## User Support

The [Joplin Forum](https://discourse.joplinapp.org/) is the community-driven hub for user support, general discussion about Joplin, installation issues, feature requests, and software development questions. You can log in using your GitHub account. **Please avoid using the GitHub issue tracker for support questions.**

## Reporting a Bug

To report a bug, please use the [GitHub Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). Follow these guidelines when submitting an issue:

- **Search existing issues**: Before opening a new issue, check if it has already been reported.
- **Follow the template**: Ensure you provide the necessary details to help others understand the problem.
- **Enable debug mode**: Consider [enabling debug mode](https://joplinapp.org/help/apps/debugging/) for more information when reporting the issue.
- **Stay on topic**: Describe the issue clearly and concisely to help others **reproduce** it.
- **Provide a screenshot**: A screenshot can often be more helpful than a written description.
- **For web clipper issues**: Include the **URL** causing the problem, as it may work on some pages but not others.

## Feature Requests

Feature requests must be discussed on the [Joplin Forum](https://discourse.joplinapp.org/c/features). Once accepted, they can be added to the GitHub tracker.

- **Check for existing requests**: Ensure your request has not already been posted on the forum or the [GitHub Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue).
- **Upvote existing requests**: If you find a similar request, upvoting it increases the chances it will be noticed and implemented.
- **Avoid multiple requests in one topic**: One request per topic helps us track and discuss it more efficiently.

When submitting a pull request, remember to [test your code](#automated-tests).

## Contributing to Joplin's Translation

Joplin is available in multiple languages, thanks to the contributions of its users. If you want to help translate Joplin or keep existing translations up-to-date, please refer to the [Localisation](https://joplinapp.org/help/dev/localisation) documentation.

## Contributing to Joplin's Code

To start contributing to Joplin's codebase, follow these guidelines before submitting a pull request:

- **Detailed pull request description**: The PR description should include a full, self-contained explanation of the feature. Describe what the feature does, how it works, and include examples and screenshots. Avoid vague descriptions like "Implement feature #4345."
- **Bug fixes are encouraged**: Start by reviewing the [list of open bugs](https://github.com/laurent22/joplin/issues?q=is%3Aissue+is%3Aopen+label%3Abug).
- **Start with good first issues**: If you're new, consider working on a [good first issue](https://github.com/laurent22/joplin/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). These issues are meant to be beginner-friendly and include the necessary details to guide you.
- **Discuss large features before starting**: Before adding a new feature, open a discussion on the [GitHub Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue) or the [Joplin Forum](https://discourse.joplinapp.org/).
- **Large changes require discussion**: Changes larger than 50 lines of code should be discussed on the [Joplin Forum](https://discourse.joplinapp.org/), so you don't spend time on a feature that may not be accepted.
- **Ensure compatibility with other apps**: All Joplin apps share the same backend, so ensure any backend changes work across all platforms.
- **Avoid bulk changes**: Pull requests with many changes, such as automated fixes (e.g., spell-checking), will not be accepted unless previously discussed on the forum.
- **Focus on a single issue**: PRs addressing multiple issues are likely to stall. Focus on one issue per PR for easier review.
- **Do not resolve review comments prematurely**: Let the reviewer mark comments as resolved to keep track of pending issues.

For detailed instructions, please refer to the [build instructions](https://github.com/laurent22/joplin/blob/dev/readme/dev/BUILD.md).

### Signing the Individual Contributor License Agreement

All contributors must sign the [Individual Contributor License Agreement](https://raw.githubusercontent.com/laurent22/joplin/dev/readme/cla.md).

### Coding Style

Please refer to the [coding style document](https://github.com/laurent22/joplin/blob/dev/readme/dev/coding_style.md).

### GUI Style

For UI changes to the desktop and mobile clients, refer to `packages/lib/theme.ts` for styling guidelines. The goal is to maintain a consistent UI across all platforms for a seamless user experience.

### Automated Tests

When submitting a pull request for a new feature or bug fix, please include automated tests. We use [Jest](https://jestjs.io/) for testing, so familiarize yourself with its documentation.

#### Running Tests

To run all unit tests, execute the following command from the root directory:

```sh
yarn test
```

Or you can go inside a package folder, and run the tests from there. For example to run all the library tests, go in `packages/lib` and run `yarn test`

To run just one particular file:

```sh
## Run all the tests in markdownUtils.test.ts
yarn test markdownUtils
```

To run only a particular test in a file:

```sh
## Run only the test described as "should handle conflict"
## inside markdownUtils.test.ts:
yarn test markdownUtils --filter="should handle conflict"
```

#### Adding a new test file

To add a test, simply create a new file with an extension `.test.ts` in the same directory. For example if you are working on the file `example.ts`, create a file `example.test.ts` for the unit tests. If this file already exist, simply add your tests directly to it.

#### Setting the testing environment

Many utility functions are available under the package `@joplin/lib/testing/test-utils`. Have a look for example at [Note.test.ts](https://github.com/laurent22/joplin/blob/dev/packages/lib/models/Note.test.ts) to see how to setup test units with database support and synchroniser support. Note that this is not needed for all tests - if you just have a simple functions to test you won't need that extra setup.

#### Testing React Hooks

To test React Hooks please use the package `@testing-library/react-hooks`. See [useLayoutItemSizes.test.ts](https://github.com/laurent22/joplin/blob/dev/packages/app-desktop/gui/ResizableLayout/utils/useLayoutItemSizes.test.ts) for an example.

#### If it is not possible to add tests

More often than not, it is actually possible to add tests - just go back to your code and see if it can be refactored and certain functionalities moved to simple functions (with no dependencies). Once you have a simple function, you can easily add unit tests for it.

Additionally, if the unit tests are not sufficient, please provide a **manual testing plan**, which should include detailed steps on:

- How to test that your feature is working. Include at least 5 tests. Try to think of the possible inputs - if it's a list, how does it work with 0 elements, or 1, or 10, or 100,000. If it's a text input, how does it work with an empty string, or a very large string, etc. Basically don't just put one test that check the best case scenario.

- How to verify that related parts of the applications are not broken. For example if you changed the note loading logic, check that the toolbar is still working as expected (and not modifying the previously loaded note for example), check that switching from one note to another still works. Look at the note list and verify that the note title is updated there too, etc.

A reviewer should be able to run the app with your changes, then do the above steps to verify that everything's working as expected.

### About abandoned pull requests

It happens that a pull request is started but not finished and despite our attempts to contact the contributor, we don't hear from them again.

In that case we will not merge the pull request, even if only small changes are missing. Our policy is simply to close the pull request. Why? Because an unfinished pull request essentially means giving us work and moving on. We would rather not encourage this behaviour.

Also, please note that since we have spent time reviewing the pull request and proposing solutions, we reserve the right to re-use that knowledge to create a new pull request, potentially based on your changes.

We'd much prefer that you complete the pull request though, so we'll be sure to ping you a few times before that!
