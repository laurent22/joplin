---
tweet: Faster synchronisation in upcoming Joplin version!
forum_url: https://discourse.joplinapp.org/t/34623
---

# Faster synchronisation in upcoming Joplin version!

The next version of Joplin Cloud (and Joplin Server) will include a change that will make synchronisation, in particular when synchronising a new device for the first time, significantly faster. This is achieved by bundling more data with the calls that retrieve notes and other data, thus reducing the number of unnecessary requests.

This change will be applied soon to Joplin Cloud (and Server), and the Joplin mobile, desktop and CLI applications will be able to use it from version 2.14.

In my tests with about 26,000 items, synchronisation was more than twice as fast on Joplin Cloud (22.5 minutes vs 9.5 minutes):

## Before

Created local items: 21814. Fetched items: 26591/26591. Completed: 23/12/2023 10:38 (**1346s**)

**real 22m35.810s**<br/>
user 3m19.182s<br/>
sys 1m24.207s

## Optimised

Created local items: 21822. Fetched items: 26600/26600. Completed: 23/12/2023 11:48 (**571s**)

**real 9m38.932s**<br/>
user 1m10.119s<br/>
sys 0m38.013s