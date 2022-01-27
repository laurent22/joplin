# Guide to writing a technical spec

This article borrows from the StackOverflow's article "[A practical guide to writing technical specs](https://stackoverflow.blog/2020/04/06/a-practical-guide-to-writing-technical-specs/)". It is strongly recommended to read this article introduction for more complete information on the topic!

The technical spec template they provide however is too detailed for our needs, so instead use the one in this document.

## What is a technical specification document?

> A technical specification document outlines how you’re going to address a technical problem by designing and building a solution for it.

## Why is writing a technical spec important?

### Benefits to engineers

> By writing a technical spec, engineers are forced to examine a problem before going straight into code, where they may overlook some aspect of the solution.

### Benefits to a project

> Investing in a technical spec ultimately results in a superior product.  Since the team is aligned and in agreement on what needs to be done through the spec, big projects can progress faster.

# Tehnical spec template

## Overview

Give a general overview of the issue. You should **always start from the user's perspective**: what specific problem does the user have? Provide as much context as possible and provide links to relevant forum threads or GitHub issues.

Then give a general idea on how you propose to solve it. Do NOT go into technical details at this point (no code, no filenames, etc.).

## Problem description

This is where you provide more details about the problem that needs to be solved. You can provide user stories, or quote from forum threads.

In this section, your goal is also to explain why this problem is actually worth solving.

## Solution

### User experience

Again, **always start from the user's perspective**:

- How will the user interface look?
- What actions will the user do to use your feature?
- Provide as much details as you can: where will the new UI elements, such as buttons, list, etc. go?
- How will you label the buttons or tooltip
- If you're adding a keyboard shortcut, what keys should the user press, etc.

All these details are very important because they give a clear picture of what you are going to do, and it helps reviewer assess the implementation.

It's also an easy way for everybody, even non-technical people, to get involved and help you refine your spec.

Also, if you can, provide UI mockups.

### Technical solution

Explain in general terms how you are going to a solve the issue at a technical level.

Please describe what will be the impact and risks associated with your change. For example if it's just adding a button to change text formatting, it's probably low impact. If it's modifying the sync algorithm it's high impact, because there's a potential for data loss.

Mention what services or parts of the application you'll need to modify and how.

In this section you may mention code and filenames, but try not to go into too much technical details. These tend to become obsolete very quickly, unlike the rest of the spec.

## Testing plan

How do you plan to test your changes?

Please provide test units if possible.

If it's for GSoC, test units are compulsory. We don't accept pull requests without.

In general try to think how you can unit test your code - sometimes it means refactoring some parts of it into a few functions, which can then be easily unit tested. Integration tests may be trickier so they are not always required.

Additionally, if the unit tests are not sufficient, please provide a manual testing plan, which should include detailed steps on:

- How to test that your feature is working. Include at least 5 tests. Try to think of the possible inputs - if it's a list, how does it work with 0 elements, or 1, or 10, or 100,000. If it's a text input, how does it work with an empty string, or a very large string, etc. Basically don't just put one test that check the best case scenario.

- How to verify that related parts of the applications are not broken. For example if you changed the note loading logic, check that the toolbar is still working as expected (and not modifying the previously loaded note for example), check that switching from one note to another still works. Look at the note list and verify that the note title is updated there too, etc.

A reviewer should be able to run the app with your changes, then do the above steps to verify that everything's working as expected.
