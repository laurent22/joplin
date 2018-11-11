# User support

For general discussion about Joplin, user support, software development questions, and to discuss new features, please go to the [Joplin Forum](https://discourse.joplin.cozic.net/). It is possible to login with your GitHub account.

# Reporting a bug

Please check first that it [has not already been reported](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). Also consider [enabling debug mode](https://github.com/laurent22/joplin/blob/master/readme/debugging.md) before reporting the issue so that you can provide as much details as possible to help fix it.

If possible, **please provide a screenshot**. A screenshot showing the problem is often more useful than a paragraph describing it as it can make it immediately clear what the issue is.

# Feature requests

Again, please check that it has not already been requested. If it has, simply **up-vote the issue** - the ones with the most up-votes are likely to be implemented. "+1" comments are not tracked.

# Adding new features

If you want to add a new feature, consider asking about it before implementing it or checking existing discussions to make sure it is within the scope of the project. Of course you are free to create the pull request directly but it is not guaranteed it is going to be accepted.

Building the apps is relatively easy - please [see the build instructions](https://github.com/laurent22/joplin/blob/master/BUILD.md) for more details.

Pull requests that automatically change many files tend to be rejected (for example changes that automatically update the code styling, or to add new lines to many files, or to automatically convert images to a different format) so if you have such a pull request in mind, please discuss it first in the forum.

# Coding style

There are only two rules, but not following them means the pull request will not be accepted (it can be accepted once the issues are fixed):

- **Please use tabs, NOT spaces.**
- **Please do not add or remove optional characters, such as spaces or colons.** Please setup your editor so that it only changes what you are working on and is not making automated changes elsewhere. The reason for this is that small white space changes make diff hard to read and can cause needless conflicts.
