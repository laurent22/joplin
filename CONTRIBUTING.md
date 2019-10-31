# User support

The [Joplin Forum](https://discourse.joplinapp.org/) is the community driven place for user support, general discussion about Joplin, problems with installation, new features and software development questions. It is possible to login with your GitHub account. Don't use the issue tracker for support questions.

# Reporting a bug

File bugs in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). Please follow these guidelines:

- Search existing issues first, make sure yours hasn't already been reported.
- Consider [enabling debug mode](https://joplinapp.org/debugging/) so that you can provide as much details as possible when reporting the issue.
- Stay on topic, but describe the issue in detail so that others can reproduce it.
- **Provide a screenshot** if possible. A screenshot showing the problem is often more useful than a paragraph describing it.
- For web clipper bugs, **please provide the URL causing the issue**. Sometimes the clipper works in one page but not in another so it is important to know what URL has a problem.

# Feature requests

Please check that your request has not already been posted in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). If it has, **up-voting the issue** increases the chances it'll be noticed and implemented in the future. "+1" comments are not tracked.

As a general rule, suggestions to *improve Joplin* should be posted first in the [Joplin Forum](https://discourse.joplinapp.org/) for discussion.

Avoid listing multiple requests in one report in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). One issue per request makes it easier to track and discuss it.

Finally, when submitting a pull request, don't forget to [test your code](#unit-tests).

# Contribute to the project

## Contributing to Joplin's translation

Joplin is available in multiple languages thanks to the help of its users. You can help translate Joplin to your language or keep it up to date. Please read the documentation about [Localisation](https://joplinapp.org/#localisation).

## Contributing to Joplin's code

If you want to start contributing to the project's code, please follow these guidelines before creating a pull request: 

- Bug fixes are always welcome. Start by reviewing the [list of bugs](https://github.com/laurent22/joplin/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
- A good way to easily start contributing is to pick and work on a [good first issue](https://github.com/laurent22/joplin/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). We try to make these issues as clear as possible and provide basic info on how the code should be changed, and if something is unclear feel free to ask for more information on the issue.
- Before adding a new feature, ask about it in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue) or the [Joplin Forum](https://discourse.joplinapp.org/), or check if existing discussions exist to make sure the new functionality is desired.
- **Changes that will consist in more than 50 lines of code should be discussed the [Joplin Forum](https://discourse.joplinapp.org/)**, so that you don't spend too much time implementing something that might not be accepted.

Building the apps is relatively easy - please [see the build instructions](https://github.com/laurent22/joplin/blob/master/BUILD.md) for more details.

## Coding style

Coding style is enforced by a pre-commit hook that runs eslint. This hook is installed whenever running `npm install` on any of the application directory. If for some reason the pre-commit hook didn't get installed, you can manually install it by running `npm install` at the root of the repository.

## Unit tests

When submitting a pull request for a new feature or bug fix, please add unit tests for your code. Unit testing GUI changes is not always possible so it is not required, but any change in a file under /lib for example should be unit tested.

The tests are under CliClient/tests. To get them running, you first need to build the CLI app:

    cd CliClient
    npm i

To run the test units, you must have an instance of the cli app running. In a first window navigate into `CliClient` and run:

```sh
./run.sh
```

> If you get an error like `Error: Cannot find module '../locales/index.js'`, this means you must (a) rebuild translations or (b) take > them from one of the other apps. To do option b, you can run the following command to copy them from the `ReactNativeClient` directory:> 
>
> ```sh
> cd .. # Return to the root of the project
> rsync -aP ./ReactNativeClient/locales/ ./CliClient/build/locales/
> ```

Then run the tests in a second window. To run all the test units:

    ./run_test.sh

To run just one particular file:

    ./run_test.sh markdownUtils # Don't add the .js extension
