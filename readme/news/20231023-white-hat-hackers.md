---
tweet: Working in the shadows with white-hat hackers
forum_url: https://discourse.joplinapp.org/t/33283
---

# Working in the shadows with white-hat hackers

The majority of Joplin's development is carried out in the public domain. This includes the discussion of issues on GitHub, as well as the submission of pull requests and related discussions. The transparency of these processes allows for collaborative problem-solving and shared insights.

However, there is one aspect that operates behind closed doors, and for good reason: addressing cybersecurity vulnerabilities. It is imperative that these issues remain undisclosed until they have been resolved. Once a solution is implemented, it is usually accompanied by discreet commits and a message in the changelog to signify the progress made.

Typically, the process begins with an email from a security researcher. They provide valuable insights, such as a specially crafted note that triggers a bug, or an API call, along with an explanation of how the application's security can be circumvented. We examine the vulnerability, create a fix, and create automated test units to prevent any accidental reintroduction of the vulnerability in future code updates. An example of such a commit is: [9e90d9016daf79b5414646a93fd369aedb035071](https://github.com/laurent22/joplin/commit/9e90d9016daf79b5414646a93fd369aedb035071)

We then share our fix with the researcher for validation. Additionally, we often apply the fix to previous versions of Joplin, depending on the severity of the vulnerability.

The contribution of security researchers in this regard is immeasurable. They employ their ingenuity to identify inventive methods of bypassing existing security measures and often discover subtle flaws in the code that might otherwise go unnoticed.

We would like to express our sincere gratitude to the security researchers who have assisted us throughout the years in identifying and rectifying security vulnerabilities!

- [@Alise](https://github.com/a1ise)
- @hexodotsh
- [@ly1g3](https://github.com/ly1g3)
- [@maple3142](https://twitter.com/maple3142)
- Ademar Nowasky Junior
- [Benjamin Harris](mailto:ben@mayhem.sg)
- [Javier Olmedo](https://github.com/JavierOlmedo)
- [Jubair Rehman Yousafzai](https://twitter.com/newfolderj)
- lin@UCCU Hacker
- [personalizedrefrigerator](https://github.com/personalizedrefrigerator)
- [Phil Holbrook](https://twitter.com/fhlipZero)
- [RyotaK](https://ryotak.net/)
- [Yaniv Nizry](https://twitter.com/YNizry)