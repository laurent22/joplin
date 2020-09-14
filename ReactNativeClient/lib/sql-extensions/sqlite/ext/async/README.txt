NOTE (2012-11-29):

The functionality implemented by this extension has been superseded
by WAL-mode.  This module is no longer supported or maintained.  The
code is retained for historical reference only.

------------------------------------------------------------------------------

Normally, when SQLite writes to a database file, it waits until the write
operation is finished before returning control to the calling application.
Since writing to the file-system is usually very slow compared with CPU
bound operations, this can be a performance bottleneck. This directory
contains an extension that causes SQLite to perform all write requests
using a separate thread running in the background. Although this does not
reduce the overall system resources (CPU, disk bandwidth etc.) at all, it
allows SQLite to return control to the caller quickly even when writing to
the database, eliminating the bottleneck.

  1. Functionality

    1.1 How it Works
    1.2 Limitations
    1.3 Locking and Concurrency

  2. Compilation and Usage

  3. Porting



1. FUNCTIONALITY

  With asynchronous I/O, write requests are handled by a separate thread
  running in the background.  This means that the thread that initiates
  a database write does not have to wait for (sometimes slow) disk I/O
  to occur.  The write seems to happen very quickly, though in reality
  it is happening at its usual slow pace in the background.

  Asynchronous I/O appears to give better responsiveness, but at a price.
  You lose the Durable property.  With the default I/O backend of SQLite,
  once a write completes, you know that the information you wrote is
  safely on disk.  With the asynchronous I/O, this is not the case.  If
  your program crashes or if a power loss occurs after the database
  write but before the asynchronous write thread has completed, then the
  database change might never make it to disk and the next user of the
  database might not see your change.

  You lose Durability with asynchronous I/O, but you still retain the
  other parts of ACID:  Atomic,  Consistent, and Isolated.  Many
  appliations get along fine without the Durablity.

  1.1 How it Works

    Asynchronous I/O works by creating a special SQLite "vfs" structure
    and registering it with sqlite3_vfs_register(). When files opened via 
    this vfs are written to (using the vfs xWrite() method), the data is not 
    written directly to disk, but is placed in the "write-queue" to be
    handled by the background thread.

    When files opened with the asynchronous vfs are read from 
    (using the vfs xRead() method), the data is read from the file on 
    disk and the write-queue, so that from the point of view of
    the vfs reader the xWrite() appears to have already completed.

    The special vfs is registered (and unregistered) by calls to the 
    API functions sqlite3async_initialize() and sqlite3async_shutdown().
    See section "Compilation and Usage" below for details.

  1.2 Limitations

    In order to gain experience with the main ideas surrounding asynchronous 
    IO, this implementation is deliberately kept simple. Additional 
    capabilities may be added in the future.

    For example, as currently implemented, if writes are happening at a 
    steady stream that exceeds the I/O capability of the background writer
    thread, the queue of pending write operations will grow without bound.
    If this goes on for long enough, the host system could run out of memory. 
    A more sophisticated module could to keep track of the quantity of 
    pending writes and stop accepting new write requests when the queue of 
    pending writes grows too large.

  1.3 Locking and Concurrency

    Multiple connections from within a single process that use this
    implementation of asynchronous IO may access a single database
    file concurrently. From the point of view of the user, if all
    connections are from within a single process, there is no difference
    between the concurrency offered by "normal" SQLite and SQLite
    using the asynchronous backend.

    If file-locking is enabled (it is enabled by default), then connections
    from multiple processes may also read and write the database file.
    However concurrency is reduced as follows:

      * When a connection using asynchronous IO begins a database
        transaction, the database is locked immediately. However the
        lock is not released until after all relevant operations
        in the write-queue have been flushed to disk. This means
        (for example) that the database may remain locked for some 
        time after a "COMMIT" or "ROLLBACK" is issued.

      * If an application using asynchronous IO executes transactions
        in quick succession, other database users may be effectively
        locked out of the database. This is because when a BEGIN
        is executed, a database lock is established immediately. But
        when the corresponding COMMIT or ROLLBACK occurs, the lock
        is not released until the relevant part of the write-queue 
        has been flushed through. As a result, if a COMMIT is followed
        by a BEGIN before the write-queue is flushed through, the database 
        is never unlocked,preventing other processes from accessing 
        the database.

    File-locking may be disabled at runtime using the sqlite3async_control()
    API (see below). This may improve performance when an NFS or other 
    network file-system, as the synchronous round-trips to the server be 
    required to establish file locks are avoided. However, if multiple 
    connections attempt to access the same database file when file-locking
    is disabled, application crashes and database corruption is a likely
    outcome.


2. COMPILATION AND USAGE

  The asynchronous IO extension consists of a single file of C code
  (sqlite3async.c), and a header file (sqlite3async.h) that defines the 
  C API used by applications to activate and control the modules 
  functionality.

  To use the asynchronous IO extension, compile sqlite3async.c as
  part of the application that uses SQLite. Then use the API defined
  in sqlite3async.h to initialize and configure the module.

  The asynchronous IO VFS API is described in detail in comments in 
  sqlite3async.h. Using the API usually consists of the following steps:

    1. Register the asynchronous IO VFS with SQLite by calling the
       sqlite3async_initialize() function.

    2. Create a background thread to perform write operations and call
       sqlite3async_run().

    3. Use the normal SQLite API to read and write to databases via 
       the asynchronous IO VFS.

  Refer to sqlite3async.h for details.


3. PORTING

  Currently the asynchronous IO extension is compatible with win32 systems
  and systems that support the pthreads interface, including Mac OSX, Linux, 
  and other varieties of Unix. 

  To port the asynchronous IO extension to another platform, the user must
  implement mutex and condition variable primitives for the new platform.
  Currently there is no externally available interface to allow this, but
  modifying the code within sqlite3async.c to include the new platforms
  concurrency primitives is relatively easy. Search within sqlite3async.c
  for the comment string "PORTING FUNCTIONS" for details. Then implement
  new versions of each of the following:

    static void async_mutex_enter(int eMutex);
    static void async_mutex_leave(int eMutex);
    static void async_cond_wait(int eCond, int eMutex);
    static void async_cond_signal(int eCond);
    static void async_sched_yield(void);

  The functionality required of each of the above functions is described
  in comments in sqlite3async.c.
