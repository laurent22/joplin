# User support

For general discussion about Joplin, user support, software development questions, and to discuss new features, please go to the [Joplin Forum](https://discourse.joplin.cozic.net/). It is possible to login with your GitHub account.

# Reporting a bug

Please check first that it [has not already been reported](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is%3Aissue). Also consider [enabling debug mode](https://github.com/laurent22/joplin/blob/master/readme/debugging.md) before reporting the issue so that you can provide as much details as possible to help fix it.

If possible, **please provide a screenshot**. A screenshot showing the problem is often more useful than a paragraph describing it as it can make it immediately clear what the issue is.

# Feature requests

Again, please check that it has not already been requested. If it has, simply **up-vote the issue** - the ones with the most up-votes are likely to be implemented. "+1" comments are not tracked.

# Creating a pull request

- If you want to add a new feature, consider asking about it before implementing it or checking existing discussions to make sure it is within the scope of the project. As a rule of thumb **if your change is likely to involve more than 50 lines of code, you should discuss it in the forum**, just so that you don't spend too much time implementing something that might not be accepted.

- Bug fixes are always welcome.

Building the apps is relatively easy - please [see the build instructions](https://github.com/laurent22/joplin/blob/master/BUILD.md) for more details.

# Coding style

There are only two rules, but not following them means the pull request will not be accepted (it can be accepted once the issues are fixed):

- **Please use tabs, NOT spaces.**
- **Please do not add or remove optional characters, such as spaces or colons.** Please setup your editor so that it only changes what you are working on and is not making automated changes elsewhere. The reason for this is that small white space changes make diff hard to read and can cause needless conflicts.
