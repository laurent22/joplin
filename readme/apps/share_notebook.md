# Sharing a notebook with Joplin Cloud

Using Joplin Cloud you can share notebooks between users and collaborate on them - i.e. any participant can view or modify notes in the shared notebook.

## How does it work?

When connected to Joplin Cloud, a new "Share notebook" menu item is available when right-clicking on a notebook.

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/share_notebook/Sidebar.png" width="50%"/>

Click on it, and it will display a new dialog where you can add any number of recipients. From this dialog you can also remove a recipient or unshare the whole notebook, in which case it will be removed from everybody's note collection, except yours.

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/share_notebook/Dialog.png" width="50%"/>

Once this is done, the recipient(s) will receive a notification in Joplin the next time they synchronise their data:

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/share_notebook/Notification.png" width="75%"/>

Then, finally, once the invitation is accepted, Joplin will download all the shared notebooks and notes. A shared notebook is denoted by the usual Share icon. Now the invited user can read or modify the shared notes, add attachments, etc. and the changes will be visible to everyone with access to the notebook.

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/share_notebook/SidebarShared.png" width="50%"/>

## FAQ

### What's the availability of the notebook sharing feature?

The notebook sharing feature is available on Joplin Cloud.

On desktop, you can share notebooks and of course view or modify any notebook that has been shared with you.

On mobile and CLI, you cannot currently share notebooks, but you can view or modify any notebook that has been shared with you.

### If I share a notebook with someone, what access do they have?

Currently they have full access to the data, including reading, writing, and deleting of notebooks or notes.

### What is actually shared?

All the sub-notebooks, notes and resources within the shared notebook are shared.

### Does it work with End-To-End-Encryption?

Yes it does. Both sharer and recipient need to have E2EE enabled for it to work.

### What can it be used for?

Some ideas:

* Plan a trip with friends or within a small organisation. For example, the notes could contain the maps, hotel and flight reservations, etc. or any document or note relevant to the trip. And all participants would have access to them.

* Work on a project with colleagues. Everybody can access various work-related documents, add to them, modify them, etc. That could serve as a knowledge base for a project.

* Another possible use, which has been requested many times, is to support multiple profiles. You could create a main profile that have access to all notes, and in there create a Work and Personal notebook. Then you would create a separate account for work. You can then share your Work notebook with that other account. That way the work account will only have access to the Work notebooks. You can use this technique in various ways to split your notebooks between multiple accounts and ensure strict separation between datasets.
