# Note history

The note history preserves versions of the notes at regular interval. All the revisions are synced and shared across all devices.

## Revision format

To save space, only the diff of a note is saved: the title and body are saved as text diff, while the other properties are saved as an object diff (i.e. only the modified properties are saved).

Advantages: it saves space, and writes are fast.

Disadvantages: reading a note version back is slower since it needs to be rebuilt, starting from the oldest revision and applying diffs to it one at a time.

## Revision service

Every time an object is changed in Joplin, some metadata is added to the changed_items table. The revision service uses this to know what notes need a new revision. Specifically it will create a revision under these conditions:

1. The note hadn't had a revision for more than 10 minutes

2. The note was recently modified, but before that it hadn't had a revision for more than 7 days

Condition 1 saves the current state of the note (i.e. **after** the edit). Condition 2 saves the state has it was **before** the edit.

The reason for that is that we save revisions every 10 minutes, but if you make many changes within a few minutes and then stop modifying the note, the final revision will not contain the current content of the note. Basically at one point (let's say at t1) the service will see there's a revision from less than 10 minutes, and will not save a new one.

That's why when you change the note again more than 7 days later, we save that revision that wasn't saved at t1. The logic is a bit complicated but the goal is to preserve the last significant state of a note. If you make many changes to a note then stop editing it for several months, the last significant state was at the end of that series of edits, so we need to save that.

Additionally, notes that were created before the service existed never had revisions. So the 7 days logic ensure that they get one the first time they are modified.

## Revision deletion

Revisions are deleted once they are older than a given interval as set in `revisionService.oldNoteInterval` (90 days by default).

## Disabling the service

When disabled, no new revision is saved, but the existing one remain there, and will only be deleted after the interval specified in `revisionService.oldNoteInterval`.

## Revision settings are global

Since all the revisions are synced across all devices, it means these settings are kind of global. So for example, if on one device you set it to keep revisions for 30 days, and on another to 100 days, the revisions older than 30 days will be deleted, and then this deletion will be synced. So in practice it means revisions are kept for whatever is the minimum number of days as set on any of the devices. In that particular case, the 100 days setting will be essentially ignored, and only the 30 days one will apply.

## Why is there less than 10 minutes between some revisions?

It can happen if a note is changed on two different devices within less than 10 minutes. A revision will be created on each device, then when they are synced it will appear that there's less than 10 min between the revisions.