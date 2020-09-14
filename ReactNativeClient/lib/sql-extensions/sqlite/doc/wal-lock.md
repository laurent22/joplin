# Wal-Mode Blocking Locks

On some Unix-like systems, SQLite may be configured to use POSIX blocking locks
by:

  * building the library with SQLITE\_ENABLE\_SETLK\_TIMEOUT defined, and 
  * configuring a timeout in ms using the sqlite3\_busy\_timeout() API.

Blocking locks may be advantageous as (a) waiting database clients do not
need to continuously poll the database lock, and (b) using blocking locks
facilitates transfer of OS priority between processes when a high priority
process is blocked by a lower priority one.

Only read/write clients use blocking locks. Clients that have read-only access
to the \*-shm file nevery use blocking locks.

Threads or processes that access a single database at a time never deadlock as
a result of blocking database locks. But it is of course possible for threads
that lock multiple databases simultaneously to do so. In most cases the OS will
detect the deadlock and return an error.

## Wal Recovery

Wal database "recovery" is a process required when the number of connected
database clients changes from zero to one. In this case, a client is 
considered to connect to the database when it first reads data from it.
Before recovery commences, an exclusive WRITER lock is taken. 

Without blocking locks, if two clients attempt recovery simultaneously, one
fails to obtain the WRITER lock and either invokes the busy-handler callback or
returns SQLITE\_BUSY to the user. With blocking locks configured, the second
client blocks on the WRITER lock.

## Database Readers

Usually, read-only are not blocked by any other database clients, so they 
have no need of blocking locks.

If a read-only transaction is being opened on a snapshot, the CHECKPOINTER
lock is required briefly as part of opening the transaction (to check that a
checkpointer is not currently overwriting the snapshot being opened). A
blocking lock is used to obtain the CHECKPOINTER lock in this case. A snapshot
opener may therefore block on and transfer priority to a checkpointer in some
cases.

## Database Writers

A database writer must obtain the exclusive WRITER lock. It uses a blocking
lock to do so if any of the following are true:

  * the transaction is an implicit one consisting of a single DML or DDL
    statement, or
  * the transaction is opened using BEGIN IMMEDIATE or BEGIN EXCLUSIVE, or
  * the first SQL statement executed following the BEGIN command is a DML or
    DDL statement (not a read-only statement like a SELECT).

In other words, in all cases except when an open read-transaction is upgraded
to a write-transaction. In that case a non-blocking lock is used.

## Database Checkpointers

Database checkpointers takes the following locks, in order:

  * The exclusive CHECKPOINTER lock.
  * The exclusive WRITER lock (FULL, RESTART and TRUNCATE only).
  * Exclusive lock on read-mark slots 1-N. These are immediately released after being taken.
  * Exclusive lock on read-mark 0.
  * Exclusive lock on read-mark slots 1-N again. These are immediately released
    after being taken (RESTART and TRUNCATE only).

All of the above use blocking locks.

## Summary

With blocking locks configured, the only cases in which clients should see an
SQLITE\_BUSY error are:

  * if the OS does not grant a blocking lock before the configured timeout
    expires, and
  * when an open read-transaction is upgraded to a write-transaction.

In all other cases the blocking locks implementation should prevent clients
from having to handle SQLITE\_BUSY errors and facilitate appropriate transfer
of priorities between competing clients.

Clients that lock multiple databases simultaneously must be wary of deadlock.


