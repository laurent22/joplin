
#ifndef __SQLITEASYNC_H_
#define __SQLITEASYNC_H_ 1

/*
** Make sure we can call this stuff from C++.
*/
#ifdef __cplusplus
extern "C" {
#endif

#define SQLITEASYNC_VFSNAME "sqlite3async"

/*
** THREAD SAFETY NOTES:
**
** Of the four API functions in this file, the following are not threadsafe:
**
**   sqlite3async_initialize()
**   sqlite3async_shutdown()
**
** Care must be taken that neither of these functions is called while 
** another thread may be calling either any sqlite3async_XXX() function
** or an sqlite3_XXX() API function related to a database handle that
** is using the asynchronous IO VFS.
**
** These functions:
**
**   sqlite3async_run()
**   sqlite3async_control()
**
** are threadsafe. It is quite safe to call either of these functions even
** if another thread may also be calling one of them or an sqlite3_XXX()
** function related to a database handle that uses the asynchronous IO VFS.
*/

/*
** Initialize the asynchronous IO VFS and register it with SQLite using
** sqlite3_vfs_register(). If the asynchronous VFS is already initialized
** and registered, this function is a no-op. The asynchronous IO VFS
** is registered as "sqlite3async".
**
** The asynchronous IO VFS does not make operating system IO requests 
** directly. Instead, it uses an existing VFS implementation for all
** required file-system operations. If the first parameter to this function
** is NULL, then the current default VFS is used for IO. If it is not
** NULL, then it must be the name of an existing VFS. In other words, the
** first argument to this function is passed to sqlite3_vfs_find() to
** locate the VFS to use for all real IO operations. This VFS is known
** as the "parent VFS".
**
** If the second parameter to this function is non-zero, then the 
** asynchronous IO VFS is registered as the default VFS for all SQLite 
** database connections within the process. Otherwise, the asynchronous IO
** VFS is only used by connections opened using sqlite3_open_v2() that
** specifically request VFS "sqlite3async".
**
** If a parent VFS cannot be located, then SQLITE_ERROR is returned.
** In the unlikely event that operating system specific initialization
** fails (win32 systems create the required critical section and event 
** objects within this function), then SQLITE_ERROR is also returned.
** Finally, if the call to sqlite3_vfs_register() returns an error, then 
** the error code is returned to the user by this function. In all three
** of these cases, intialization has failed and the asynchronous IO VFS
** is not registered with SQLite.
**
** Otherwise, if no error occurs, SQLITE_OK is returned.
*/ 
int sqlite3async_initialize(const char *zParent, int isDefault);

/*
** This function unregisters the asynchronous IO VFS using 
** sqlite3_vfs_unregister().
**
** On win32 platforms, this function also releases the small number of 
** critical section and event objects created by sqlite3async_initialize().
*/ 
void sqlite3async_shutdown(void);

/*
** This function may only be called when the asynchronous IO VFS is 
** installed (after a call to sqlite3async_initialize()). It processes
** zero or more queued write operations before returning. It is expected
** (but not required) that this function will be called by a different 
** thread than those threads that use SQLite. The "background thread"
** that performs IO.
**
** How many queued write operations are performed before returning 
** depends on the global setting configured by passing the SQLITEASYNC_HALT
** verb to sqlite3async_control() (see below for details). By default
** this function never returns - it processes all pending operations and 
** then blocks waiting for new ones.
**
** If multiple simultaneous calls are made to sqlite3async_run() from two
** or more threads, then the calls are serialized internally.
*/
void sqlite3async_run(void);

/*
** This function may only be called when the asynchronous IO VFS is 
** installed (after a call to sqlite3async_initialize()). It is used 
** to query or configure various parameters that affect the operation 
** of the asynchronous IO VFS. At present there are three parameters 
** supported:
**
**   * The "halt" parameter, which configures the circumstances under
**     which the sqlite3async_run() parameter is configured.
**
**   * The "delay" parameter. Setting the delay parameter to a non-zero
**     value causes the sqlite3async_run() function to sleep for the
**     configured number of milliseconds between each queued write 
**     operation.
**
**   * The "lockfiles" parameter. This parameter determines whether or 
**     not the asynchronous IO VFS locks the database files it operates
**     on. Disabling file locking can improve throughput.
**
** This function is always passed two arguments. When setting the value
** of a parameter, the first argument must be one of SQLITEASYNC_HALT,
** SQLITEASYNC_DELAY or SQLITEASYNC_LOCKFILES. The second argument must
** be passed the new value for the parameter as type "int".
**
** When querying the current value of a paramter, the first argument must
** be one of SQLITEASYNC_GET_HALT, GET_DELAY or GET_LOCKFILES. The second 
** argument to this function must be of type (int *). The current value
** of the queried parameter is copied to the memory pointed to by the
** second argument. For example:
**
**   int eCurrentHalt;
**   int eNewHalt = SQLITEASYNC_HALT_IDLE;
**
**   sqlite3async_control(SQLITEASYNC_HALT, eNewHalt);
**   sqlite3async_control(SQLITEASYNC_GET_HALT, &eCurrentHalt);
**   assert( eNewHalt==eCurrentHalt );
**
** See below for more detail on each configuration parameter.
**
** SQLITEASYNC_HALT:
**
**   This is used to set the value of the "halt" parameter. The second
**   argument must be one of the SQLITEASYNC_HALT_XXX symbols defined
**   below (either NEVER, IDLE and NOW).
**
**   If the parameter is set to NEVER, then calls to sqlite3async_run()
**   never return. This is the default setting. If the parameter is set
**   to IDLE, then calls to sqlite3async_run() return as soon as the
**   queue of pending write operations is empty. If the parameter is set
**   to NOW, then calls to sqlite3async_run() return as quickly as 
**   possible, without processing any pending write requests.
**
**   If an attempt is made to set this parameter to an integer value other
**   than SQLITEASYNC_HALT_NEVER, IDLE or NOW, then sqlite3async_control() 
**   returns SQLITE_MISUSE and the current value of the parameter is not 
**   modified.
**
**   Modifying the "halt" parameter affects calls to sqlite3async_run() 
**   made by other threads that are currently in progress.
**
** SQLITEASYNC_DELAY:
**
**   This is used to set the value of the "delay" parameter. If set to
**   a non-zero value, then after completing a pending write request, the
**   sqlite3async_run() function sleeps for the configured number of 
**   milliseconds.
**
**   If an attempt is made to set this parameter to a negative value,
**   sqlite3async_control() returns SQLITE_MISUSE and the current value
**   of the parameter is not modified.
**
**   Modifying the "delay" parameter affects calls to sqlite3async_run() 
**   made by other threads that are currently in progress.
**
** SQLITEASYNC_LOCKFILES:
**
**   This is used to set the value of the "lockfiles" parameter. This
**   parameter must be set to either 0 or 1. If set to 1, then the
**   asynchronous IO VFS uses the xLock() and xUnlock() methods of the
**   parent VFS to lock database files being read and/or written. If
**   the parameter is set to 0, then these locks are omitted.
**
**   This parameter may only be set when there are no open database
**   connections using the VFS and the queue of pending write requests
**   is empty. Attempting to set it when this is not true, or to set it 
**   to a value other than 0 or 1 causes sqlite3async_control() to return
**   SQLITE_MISUSE and the value of the parameter to remain unchanged.
**
**   If this parameter is set to zero, then it is only safe to access the
**   database via the asynchronous IO VFS from within a single process. If
**   while writing to the database via the asynchronous IO VFS the database
**   is also read or written from within another process, or via another
**   connection that does not use the asynchronous IO VFS within the same
**   process, the results are undefined (and may include crashes or database
**   corruption).
**
**   Alternatively, if this parameter is set to 1, then it is safe to access
**   the database from multiple connections within multiple processes using
**   either the asynchronous IO VFS or the parent VFS directly.
*/
int sqlite3async_control(int op, ...);

/*
** Values that can be used as the first argument to sqlite3async_control().
*/
#define SQLITEASYNC_HALT          1
#define SQLITEASYNC_GET_HALT      2
#define SQLITEASYNC_DELAY         3
#define SQLITEASYNC_GET_DELAY     4
#define SQLITEASYNC_LOCKFILES     5
#define SQLITEASYNC_GET_LOCKFILES 6

/*
** If the first argument to sqlite3async_control() is SQLITEASYNC_HALT,
** the second argument should be one of the following.
*/
#define SQLITEASYNC_HALT_NEVER 0       /* Never halt (default value) */
#define SQLITEASYNC_HALT_NOW   1       /* Halt as soon as possible */
#define SQLITEASYNC_HALT_IDLE  2       /* Halt when write-queue is empty */

#ifdef __cplusplus
}  /* End of the 'extern "C"' block */
#endif
#endif        /* ifndef __SQLITEASYNC_H_ */
