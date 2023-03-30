# Desktop application



For general information relevant to all the applications, see also [Joplin home page](https://joplinapp.org).

# An illustrated Guide to Using Joplin.  
•	Why note taking at all?  
o	It makes it easier to find small bits of information that don’t warrant a full document: the VIN number and tire air pressure for your car; Veterinary data for pets, the phone number and ordering website for a good pizza place, all the way up to major projects of any type.
•	Why Joplin over other note managers?  

o	OneNote – Too many limitations, and too many of the wrong capabilities. Learning curve is high.

o	EverNote – Too buggy.

o	Google Keep. Too slow, no offline/desktop app. No way to nest notes. 

o	Also, these above leave you beholden to a corporate data format which may or may not be in your best interest.
o	Joplin features are straightforward: the features it has, are pretty bulletproof.  If a feature is included, it works and consistently.

Joplin the name: 
It comes from Scott, not Janice.  Scott Joplin is a favorite composer and pianist of the primary developer for the app.

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/DemoDesktop.png" style="width: 100%">

![Editor Layout](https://user-images.githubusercontent.com/17282079/227723731-a3a9dde7-a0ca-406c-b081-5da30643f86b.jpg)

# A note about the markdown editor for the unfamiliar:

If you have ever worked on a wiki, you know what it looks like and how it works.  Plain text formatting marks are translated into more advanced formatting for display. For instance, adding highlighting, bulleted lists, italics, tables etc.  The markdown editor shows you the raw text it is translating and also gives you formatting buttons at the top.

For those people who may remember the old WordPerfect “Reveal codes” button, which allowed you to directly change the text formatting behind the display, markdown works much the same way.

Tip: You can teach yourself markdown by using the format buttons at the top and seeing both how markdown sets it up, and how it renders as RTF.

![Joplin2](https://user-images.githubusercontent.com/17282079/227723781-71215c28-c0be-42d6-9728-26a4e4821c7b.jpg)

Using an external editor:

In the menu “Note” is “Toggle the external Editor” which will pull the text in your current note into an external word processor.  

![External Editor](https://user-images.githubusercontent.com/17282079/227723880-3d667ec9-6dc5-4152-a71d-cf3ff080b027.jpg)

If nothing happens when you do this, it’s because an external editor is not set up in your Joplin. 

This is found under Tools, Options, General.
For instance Wordpad, by entering the path to it:
%ProgramFiles%\Windows NT\Accessories\wordpad.exe

And clicking “Apply” and “Back” at the bottom of the page.

![External Editor 2](https://user-images.githubusercontent.com/17282079/227723989-3215d0dd-c4bb-42c3-b569-c14f58395d54.png)

# Other editing considerations:

Speech recognition/dictation is not available through Joplin but Windows 10/11 has speech recognition natively for most external editors. 
It needs to be programmed.  Search for "Speech" in the Windows search bar and begin setup.

Android Joplin also uses Google Voice Keyboard.
"Hey! clicking on links doesn't work!" - Try pressing ctrl while clicking. Or open the markdown editor and click on the RTF.

# Organizing.

Folders:

Any notebook can have any number of sub-folders, as opposed to OneNote where subfolders are limited to three.
Folders and subfolders can be moved to re-arrange them in ways that fit your organizational style.  You can change the sort order from the button at the top of the page list. 
Clicking the up or down arrow changes the sort order from ascending to descending and back.

![Sort Notes](https://user-images.githubusercontent.com/17282079/227724059-d98f38b9-cf80-4e59-aa10-ee4c199842d2.jpg)

# Exporting and Importing
They can also be exported at any level by right clicking the folder, you will have the option to export the selected folder and all subfolders and notes beneath it.

![Jex](https://user-images.githubusercontent.com/17282079/227724119-c587f019-c30d-45dc-b96a-e7ffb9083311.jpg)

JEX is the native Joplin backup and restore.  It is pretty bulletproof.  Subfolders can be exported, moved to another profile or another copy of Joplin simply by moving/copying the JEX file, sharing it or emailing it, and importing the result.
Other export/import options exist, for those who are building websites, HTML file, or directory is useful.

# Tags:
Notes can be tagged by going to Tags at the bottom of the note page.

![Tags](https://user-images.githubusercontent.com/17282079/227724175-1f9629a6-7510-441e-9950-d2d9317c5dc0.jpg)

Tags are useful for marking notes across folder and subfolder structures. Multiple tags can be placed os a single note, whereas notes can have only one folder location. It is possible to search for tags using “Tag:{tag name}

# Searching:
https://discourse.joplinapp.org/t/search-syntax-documentation/9110
Some helpful search syntax:
`type:todo iscompleted:0` 
all uncompleted tasks (this is the same as clicking on the “+” sign at the top of the folder list under “All Notebooks.” (unfinished ToDo’s are listed first).

`created:202001 -created:202003` will return notes created on or after January and before March 2020.

`updated:1997 -updated:2020` will return all notes updated between the years 1997 and 2019.

`created:day-2` searches for all notes created in the past two days.

`updated:year-0` searches all notes updated in the current year.

# End (so far):
It is hoped that this gives the Windows user a quick overview of Joplin functions and features.  This document is open source please propose edits and additions.

