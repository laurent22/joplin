# Google Summer of Code 2022

Joplin has a young but well proven history. All contributors, Joplin users and developers are welcome to participate in the hopefully third year Summer of Code program with Joplin. This year the main themes will be:

- **Mobile and tablet development** - we want to improve the mobile/tablet application on iOS and Android.
- **Plugin and external apps** - leverage the Joplin API to create plugins and external apps.
- And you are welcome to suggest your own ideas.

Mentors, administrators and contributors: read [Summer of Code](https://developers.google.com/open-source/gsoc) occasionally. Also read the [Summer of Code FAQ](https://developers.google.com/open-source/gsoc/faq).

**Please read this page carefully as most likely it will have all the answers to the questions you might have, such as how to build the app, how to contribute and what are the rules for submitting a pull request.**

All participants will need a Google account in order to join the program. So, save time and create one now. In addition, all participants need to join the  [Joplin Forum](https://discourse.joplinapp.org).

## How to contribute

We suggest you read carefully these important documents and bookmark the links as you will need to refer to them throughout GSoC:

- [How to submit a pull request for GSoC](https://joplinapp.org/help/dev/gsoc/gsoc2022/pull_request_guidelines/)
- [How to build the apps](https://github.com/laurent22/joplin/blob/dev/help/dev/BUILD.md)
- [How to contribute](https://github.com/laurent22/joplin/blob/dev/readme/dev/index.md)

## Programming Language

- Any new application or plugin should be done using TypeScript.
- For web publishing, please use WebPack.
- For UI, we use React/Redux. Make sure you use React Hooks when creating new components.
- For styling, we use SASS.

In general, all applications share the same back-end written in TypeScript or JavaScript (Node.js), with Redux for state management. The back-end runs locally.

The desktop GUI, as listed on the [Joplin's website](https://joplinapp.org/help/install) is done using Electron and React.

The mobile app is done using React Native.

Submissions and ideas for projects in any other language should specifically mention the choice.

## Instructions for contributors

Contributors wishing to participate in Summer of Code must realize, that this is an important professional opportunity. You will be required to produce applicable and readable code for Joplin in 3 months. Your mentors, will dedicate a portion of their time to mentoring you. Therefore, we seek candidates who are committed to helping Joplin and its community long-term and are willing to both do quality work, and be proactive in communicating with your mentor(s).

You don't have to be a proven developer - in fact, this whole program is meant to facilitate joining Joplin and other Open Source communities. However, experience in coding and/or experience with the above mentioned programming languages and the applications is welcome.

You should start learning the components that you plan on working on before the start date. Support can be found in the forum and on our dedicated discourse channel. You should plan to communicate with your team several times per week, and formally report progress and plans weekly. You are free to choose the format, it can be a sophisticated online document or simple continuous blog on GitHub.

Contributors who neglect active communication will be failed!

## How to create your first pull request

Before you can be accepted as a contributor we expect you to write some code and link that work on your proposal. As a first pull request, we suggest one of the following:

- Fix a [high priority](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is:open+is:issue+label:bug+label:high) or [medium priority](https://github.com/laurent22/joplin/issues?utf8=%E2%9C%93&q=is:open+is:issue+label:bug+label:medium) bug. This is something we highly value and is a good way to get a deep understanding of certain parts of the codebase.

- Alternatively you may browse the [GitHub Issues](https://github.com/laurent22/joplin/issues) to find something that can be worked on. Note that this is a difficult way to get a pull request in, so make sure the issue you choose has a very clear technical spec. If we need to discuss how it should work or what it should do in the pull request, it means there was no consensus for this feature, and we are likely to close the pull request.

- Please **do not submit a pull request just to fix some typo**.

Before submitting a pull request, please make sure you read the [pull request guidelines for GSoC 2022](https://joplinapp.org/help/dev/gsoc/gsoc2022/pull_request_guidelines/).

## General instructions

First of all, please read the above referenced resources and the [GSoC FAQ](https://developers.google.com/open-source/gsoc/faq). Pay special attention to the **Eligibility** section of the FAQ.

## Recommended steps

1. Join the [Joplin Forum](https://discourse.joplinapp.org), introduce yourself in a structured manner, share your GitHub username, and meet your fellow developers in the [GSoC category](https://discourse.joplinapp.org/c/gsoc). The subject of the topic shall contain your username, e.g. _Introducing \<username>_.
2. Read Contributor proposal guidelines and the [GSoC Contributor/Student Guide](https://google.github.io/gsocguides/student/)
3. Take a look at the [list of ideas](https://joplinapp.org/gsoc2022/ideas/). You can have you own idea added by posting it in the [Features category](https://discourse.joplinapp.org/c/features)
4. Come up with project that you're interested in and discuss it in [Features category](https://discourse.joplinapp.org/c/features)
5. Write a first draft and get someone to review it
6. Remember: you must link to work such as commits in your proposal. A private place will be created within the forum for that purposes.
7. Read [How to write a kickass proposal for GSoC](http://teom.org/blog/kde/how-to-write-a-kick-ass-proposal-for-google-summer-of-code/)
8. Submit proposal using [Google's web interface](https://summerofcode.withgoogle.com/) ahead of the deadline
9. Submit proof of enrolment well ahead of the deadline

Coming up with an interesting idea is probably the most difficult part. It should be something interesting for Joplin, for Open Source in general and for you. And it must be something that you can realistically achieve in the time available to you.

A good start is finding out what the most pressing issues are in the projects in which you are interested. Join the forum and subscribe to GitHub repository for that project or go into its discourse channel: meet developers and your potential mentor, as well as start learning the code-base. We recommend strongly getting involved in advance of the beginning of GSoC, and we will look favourably on applications from contributors who have already started to act like Open Source developers.

## Contributor proposal guidelines

A project proposal is what you will be judged upon. Write a clear proposal on what you plan to do, the scope of your project, and why we should choose you to do it. Proposals are the basis of the GSoC projects and therefore one of the most important things to do well. The proposal is not only the basis of our decision of which contributor to choose, it has also an effect on Google's decision as to how many contributor slots are assigned to Joplin.

Below is the application template:

> **Introduction**
>
> Every software project should solve a problem. Before offering the solution (your Google Summer of Code project), you should first define the problem. What’s the current state of things? What’s the issue you wish to solve and why? Then you should conclude with a sentence or two about your solution. Include links to discussions, features, or bugs that describe the problem further if necessary.
>
> **Project goals**
>
> Be short and to the point, and perhaps format it as a list. Propose a clear list of deliverables, explaining exactly what you promise to do and what you do not plan to do. “Future developments” can be mentioned, but your promise for the Google Summer of Code term is what counts.
>
> **Implementation**
>
> Be detailed. Describe what you plan to do as a solution for the problem you defined above. Include technical details, showing that you understand the technology. Illustrate key technical elements of your proposed solution in reasonable detail. Include writing unit tests throughout the coding period, as well as code documentation. These critical elements cannot be left to the last few weeks of the program. If user documentation will be required, or apidox, etc. these should be written during each week, not at the end.
>
> **Timeline**
>
> Show that you understand the problem, have a solution, have also broken it down into manageable parts, and that you have a realistic plan on how to accomplish your goal. Here you set expectations, so don’t make promises you can’t keep. A modest, realistic and detailed timeline is better than promising the impossible.
>
> If you have other commitments during GSoC, such as a job, vacation, exams, internship, seminars, or papers to write, disclose them here. GSoC should be treated like a full-time job, and we will expect approximately 40 hours of work per week. *If you have conflicts, explain how you will work around them.* If you are found to have conflicts which you did not disclose, you may be failed.
>
> Open and clear communication is of utmost importance. **Include your plans for communication in your proposal; daily if possible.** You will need to initiate weekly formal communication such as a blog post on to be agreed placed. Lack of communication will result in you being failed.
>
> **About me**
>
> Provide your contact information (IRC nick, email, IM, phone) and write a few sentences about you and why you think you are the best for this job. **Prior contributions to Joplin are required; list your commits.** Name people (other developers, students, professors) who can act as a reference for you. Mention your field of study if necessary. Now is the time to join the relevant irc/telegram channels, mail lists and blog feeds. We want you to be a part of our community, not just contribute your code.
>
> *Tell us if you are submitting proposals to other organizations, and whether or not you would choose Joplin if given the choice.*
>
> *Other things to think about:*
>
> - Are you comfortable working independently under a supervisor or mentor who is several thousand miles away, and perhaps 12 time zones away? How will you work with your mentor to track your work? Have you worked in this style before?
>
> - If your native language is not English, are you comfortable working closely with a supervisor whose native language is English? What is your native language, as that may help us find a mentor who has the same native language?
>
> - After you have written your proposal, you should get it reviewed. Do not rely on the Joplin mentors to do it for you via the web interface, although we will try to comment on every proposal. It is wise to ask a colleague or a developer to critique your proposal. Clarity and completeness are important.

## Hints

**Submit your proposal early**: early submissions get more attention from developers because that they have more time to read them. The more people see your proposal, the more it will be discussed.

**Do not leave it all to the last minute**: while it is Google that is operating the webserver, it would be wise to expect a last-minute overload on the server. So, be sure you send your application and proof of enrolment before the final rush. Also, applications submitted very late will get the least attention from mentors, so you may get a lower vote because of that. Submitting a draft early will give time for feedback from prospective mentors.

**Keep it simple**: Be concise and precise. Provide a clear, descriptive title. "My Project" is the worst possible title!

**Know what you are talking about**: Do not submit proposals that cannot be accomplished over a summer or that are not related to Joplin. If your idea is unusual, be sure to explain why you have chosen Joplin to be your mentoring organization.
There could be exceptional reason to accept proposal what cannot be finished over the summer if either it is clearly recognisable that there will be commitment beyond the summer period or the project can be well separated in sub-project. If you want to go that way, your proposal must be very easy readable to allow us to evaluate the changes of a project going through several coding programs.

**Aim wide**: submit more than one proposal. You are allowed to submit to another organisation as well. If you do submit more than one proposal, tell us that and which proposal you would choose, if both were selected. Former students would advise you to do one or two kick-ass proposals rather than trying to do three.

## Accepted Contributors

Your primary responsibility is finishing your project under the guidance of your mentors. To do that, you must submit code regularly and stay in frequent and effective communication with your mentors and team. To pass the evaluations, you must do both the communication **and** the coding plus documentation.

All contributors will create a report page by tool up to their choice. Keep this up-to-date, as this is one of our primary evaluation tools.

## Instructions for mentors

### Ideas

If you're a Joplin developer or motivated user and you wish to participate in Summer of Code, make a proposal in the [Features category of the Joplin Forum](https://discourse.joplinapp.org/c/features), based what your Joplin project needs.

If you wish to mentor, please read the [GSoC Mentor Guide](https://google.github.io/gsocguides/mentor/org-application) and the [Summer of Code FAQ](https://developers.google.com/open-source/gsoc/faq#general). Also, please contact the [staff](https://discourse.joplinapp.org/g/staff) and get the go-ahead from them before editing the ideas page, adding your idea.

Your idea proposal should be a brief description of what the project is, what the desired goals would be, what the contributor should know and an email address for contact. Contributors are not required to follow your idea to the letter, so regard your proposal as inspiration for them.

### Mentoring

Anyone developer can be a mentor if you meet the GSoC eligibility requirements. We will potentially assign a contributor to you who has never worked on such a large project and will need some help. Make sure you're up for the task. Mentoring takes time, and lots and lots of communication.

Before subscribing yourself as a mentor, please make sure that  the [staff](https://discourse.joplinapp.org/g/staff) is aware of that. Ask them to send the Summer of Code Administrators an email confirming your involvement in the team. This is just a formality to make sure you are a real person we can trust; the administrators cannot know all active developers by their Google account ID. Then drop us a message in the forum.

Prospective mentors should read the [mentoring guide](http://www.booki.cc/gsoc-mentoring). Also, Federico Mena-Quintero has written some helpful information based on his experiences in previous years. [His HOWTO](https://people.gnome.org/~federico/docs/summer-of-code-mentoring-howto/index.html) has some useful suggestions for anyone planning to mentor this year.

You will subscribe to the relevant tags in the forum to discuss ideas. You will need to read the proposals as they come in, and vote on the proposals. Daily communication is required with your contributor during the Community Bonding period, and multiple times per week during the coding period.

Finally, know that we will never assign you to a project you do not want to work on. We will not assign you more projects than you can/want to take on either. And you will have a backup mentor, just in case something unforeseen takes place.

## Ideas

Please see below for a list of project ideas:

https://joplinapp.org/help/dev/gsoc/gsoc2022/ideas/
