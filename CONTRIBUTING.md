# User support

The [Joplin Forum](https://discourse.joplinapp.org/) is the community driven place for user support, general discussion about Joplin, problems with installation, new features and software development questions. It is possible to login with your GitHub account.

# Reporting a bug

File bugs in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). Please follow these guidelines:

- Search existing issues first, make sure yours hasn't already been reported.
- Don't use the issue tracker for support questions.
- Consider [enabling debug mode](https://github.com/laurent22/joplin/blob/master/readme/debugging.md) so that you can provide as much details as possible when reporting the issue.
- Stay on topic, but describe the issue in detail so that others can reproduce it.
- **Provide a screenshot** if possible. A screenshot showing the problem is often more useful than a paragraph describing it.

# Feature requests

Please check that your request has not already been posted in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). If it has, **up-voting the issue** increases the chances it'll be noticed and implemented in the future. "+1" comments are not tracked.

As a general rule, suggestions to _improve Joplin_ should be posted first in the [Joplin Forum](https://discourse.joplinapp.org/) for discussion.

Avoid listing multiple requests in one report in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). One issue per request makes it easier to track and discuss it.

# Contribute to the project

## Contributing to Joplin's translation

Joplin is available in multiple languages thanks to the help of its users. You can help translate Joplin to your language or keep it up to date. Please read the documentation about [Localisation](https://github.com/laurent22/joplin#localisation).

## Contributing to Joplin's code

If you want to start contributing to the project's code, please follow these guidelines before creating a pull request: 

- Bug fixes are always welcome. Start by reviewing the list of [essential issues](https://github.com/laurent22/joplin/issues?q=is%3Aissue+is%3Aopen+label%3Aessential)
- Before adding a new feature, ask about it in the [Github Issue Tracker](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue) or the [Joplin Forum](https://discourse.joplinapp.org/), or check if existing discussions exist to make sure the new functionality is desired.
- **Changes that will consist in more than 50 lines of code should be discussed the [Joplin Forum](https://discourse.joplinapp.org/)**, so that you don't spend too much time implementing something that might not be accepted.

Building the apps is relatively easy - please [see the build instructions](https://github.com/laurent22/joplin/blob/master/BUILD.md) for more details.

## Coding style

There are only two rules, but not following them means the pull request will not be accepted (it can be accepted once the issues are fixed):

- **Please use tabs, NOT spaces.**
- **Please do not add or remove optional characters, such as spaces or colons.** Please setup your editor so that it only changes what you are working on and is not making automated changes elsewhere. The reason for this is that small white space changes make diff hard to read and can cause needless conflicts.
