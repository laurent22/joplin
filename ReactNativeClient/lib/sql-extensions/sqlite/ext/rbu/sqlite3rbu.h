/*
** 2014 August 30
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
**
** This file contains the public interface for the RBU extension. 
*/

/*
** SUMMARY
**
** Writing a transaction containing a large number of operations on 
** b-tree indexes that are collectively larger than the available cache
** memory can be very inefficient. 
**
** The problem is that in order to update a b-tree, the leaf page (at least)
** containing the entry being inserted or deleted must be modified. If the
** working set of leaves is larger than the available cache memory, then a 
** single leaf that is modified more than once as part of the transaction 
** may be loaded from or written to the persistent media multiple times.
** Additionally, because the index updates are likely to be applied in
** random order, access to pages within the database is also likely to be in 
** random order, which is itself quite inefficient.
**
** One way to improve the situation is to sort the operations on each index
** by index key before applying them to the b-tree. This leads to an IO
** pattern that resembles a single linear scan through the index b-tree,
** and all but guarantees each modified leaf page is loaded and stored 
** exactly once. SQLite uses this trick to improve the performance of
** CREATE INDEX commands. This extension allows it to be used to improve
** the performance of large transactions on existing databases.
**
** Additionally, this extension allows the work involved in writing the 
** large transaction to be broken down into sub-transactions performed 
** sequentially by separate processes. This is useful if the system cannot 
** guarantee that a single update process will run for long enough to apply 
** the entire update, for example because the update is being applied on a 
** mobile device that is frequently rebooted. Even after the writer process 
** has committed one or more sub-transactions, other database clients continue
** to read from the original database snapshot. In other words, partially 
** applied transactions are not visible to other clients. 
**
** "RBU" stands for "Resumable Bulk Update". As in a large database update
** transmitted via a wireless network to a mobile device. A transaction
** applied using this extension is hence refered to as an "RBU update".
**
**
** LIMITATIONS
**
** An "RBU update" transaction is subject to the following limitations:
**
**   * The transaction must consist of INSERT, UPDATE and DELETE operations
**     only.
**
**   * INSERT statements may not use any default values.
**
**   * UPDATE and DELETE statements must identify their target rows by 
**     non-NULL PRIMARY KEY values. Rows with NULL values stored in PRIMARY
**     KEY fields may not be updated or deleted. If the table being written 
**     has no PRIMARY KEY, affected rows must be identified by rowid.
**
**   * UPDATE statements may not modify PRIMARY KEY columns.
**
**   * No triggers will be fired.
**
**   * No foreign key violations are detected or reported.
**
**   * CHECK constraints are not enforced.
**
**   * No constraint handling mode except for "OR ROLLBACK" is supported.
**
**
** PREPARATION
**
** An "RBU update" is stored as a separate SQLite database. A database
** containing an RBU update is an "RBU database". For each table in the 
** target database to be updated, the RBU database should contain a table
** named "data_<target name>" containing the same set of columns as the
** target table, and one more - "rbu_control". The data_% table should 
** have no PRIMARY KEY or UNIQUE constraints, but each column should have
** the same type as the corresponding column in the target database.
** The "rbu_control" column should have no type at all. For example, if
** the target database contains:
**
**   CREATE TABLE t1(a INTEGER PRIMARY KEY, b TEXT, c UNIQUE);
**
** Then the RBU database should contain:
**
**   CREATE TABLE data_t1(a INTEGER, b TEXT, c, rbu_control);
**
** The order of the columns in the data_% table does not matter.
**
** Instead of a regular table, the RBU database may also contain virtual
** tables or view named using the data_<target> naming scheme. 
**
** Instead of the plain data_<target> naming scheme, RBU database tables 
** may also be named data<integer>_<target>, where <integer> is any sequence
** of zero or more numeric characters (0-9). This can be significant because
** tables within the RBU database are always processed in order sorted by 
** name. By judicious selection of the <integer> portion of the names
** of the RBU tables the user can therefore control the order in which they
** are processed. This can be useful, for example, to ensure that "external
** content" FTS4 tables are updated before their underlying content tables.
**
** If the target database table is a virtual table or a table that has no
** PRIMARY KEY declaration, the data_% table must also contain a column 
** named "rbu_rowid". This column is mapped to the tables implicit primary 
** key column - "rowid". Virtual tables for which the "rowid" column does 
** not function like a primary key value cannot be updated using RBU. For 
** example, if the target db contains either of the following:
**
**   CREATE VIRTUAL TABLE x1 USING fts3(a, b);
**   CREATE TABLE x1(a, b)
**
** then the RBU database should contain:
**
**   CREATE TABLE data_x1(a, b, rbu_rowid, rbu_control);
**
** All non-hidden columns (i.e. all columns matched by "SELECT *") of the
** target table must be present in the input table. For virtual tables,
** hidden columns are optional - they are updated by RBU if present in
** the input table, or not otherwise. For example, to write to an fts4
** table with a hidden languageid column such as:
**
**   CREATE VIRTUAL TABLE ft1 USING fts4(a, b, languageid='langid');
**
** Either of the following input table schemas may be used:
**
**   CREATE TABLE data_ft1(a, b, langid, rbu_rowid, rbu_control);
**   CREATE TABLE data_ft1(a, b, rbu_rowid, rbu_control);
**
** For each row to INSERT into the target database as part of the RBU 
** update, the corresponding data_% table should contain a single record
** with the "rbu_control" column set to contain integer value 0. The
** other columns should be set to the values that make up the new record 
** to insert. 
**
** If the target database table has an INTEGER PRIMARY KEY, it is not 
** possible to insert a NULL value into the IPK column. Attempting to 
** do so results in an SQLITE_MISMATCH error.
**
** For each row to DELETE from the target database as part of the RBU 
** update, the corresponding data_% table should contain a single record
** with the "rbu_control" column set to contain integer value 1. The
** real primary key values of the row to delete should be stored in the
** corresponding columns of the data_% table. The values stored in the
** other columns are not used.
**
** For each row to UPDATE from the target database as part of the RBU 
** update, the corresponding data_% table should contain a single record
** with the "rbu_control" column set to contain a value of type text.
** The real primary key values identifying the row to update should be 
** stored in the corresponding columns of the data_% table row, as should
** the new values of all columns being update. The text value in the 
** "rbu_control" column must contain the same number of characters as
** there are columns in the target database table, and must consist entirely
** of 'x' and '.' characters (or in some special cases 'd' - see below). For 
** each column that is being updated, the corresponding character is set to
** 'x'. For those that remain as they are, the corresponding character of the
** rbu_control value should be set to '.'. For example, given the tables 
** above, the update statement:
**
**   UPDATE t1 SET c = 'usa' WHERE a = 4;
**
** is represented by the data_t1 row created by:
**
**   INSERT INTO data_t1(a, b, c, rbu_control) VALUES(4, NULL, 'usa', '..x');
**
** Instead of an 'x' character, characters of the rbu_control value specified
** for UPDATEs may also be set to 'd'. In this case, instead of updating the
** target table with the value stored in the corresponding data_% column, the
** user-defined SQL function "rbu_delta()" is invoked and the result stored in
** the target table column. rbu_delta() is invoked with two arguments - the
** original value currently stored in the target table column and the 
** value specified in the data_xxx table.
**
** For example, this row:
**
**   INSERT INTO data_t1(a, b, c, rbu_control) VALUES(4, NULL, 'usa', '..d');
**
** is similar to an UPDATE statement such as: 
**
**   UPDATE t1 SET c = rbu_delta(c, 'usa') WHERE a = 4;
**
** Finally, if an 'f' character appears in place of a 'd' or 's' in an 
** ota_control string, the contents of the data_xxx table column is assumed
** to be a "fossil delta" - a patch to be applied to a blob value in the
** format used by the fossil source-code management system. In this case
** the existing value within the target database table must be of type BLOB. 
** It is replaced by the result of applying the specified fossil delta to
** itself.
**
** If the target database table is a virtual table or a table with no PRIMARY
** KEY, the rbu_control value should not include a character corresponding 
** to the rbu_rowid value. For example, this:
**
**   INSERT INTO data_ft1(a, b, rbu_rowid, rbu_control) 
**       VALUES(NULL, 'usa', 12, '.x');
**
** causes a result similar to:
**
**   UPDATE ft1 SET b = 'usa' WHERE rowid = 12;
**
** The data_xxx tables themselves should have no PRIMARY KEY declarations.
** However, RBU is more efficient if reading the rows in from each data_xxx
** table in "rowid" order is roughly the same as reading them sorted by
** the PRIMARY KEY of the corresponding target database table. In other 
** words, rows should be sorted using the destination table PRIMARY KEY 
** fields before they are inserted into the data_xxx tables.
**
** USAGE
**
** The API declared below allows an application to apply an RBU update 
** stored on disk to an existing target database. Essentially, the 
** application:
**
**     1) Opens an RBU handle using the sqlite3rbu_open() function.
**
**     2) Registers any required virtual table modules with the database
**        handle returned by sqlite3rbu_db(). Also, if required, register
**        the rbu_delta() implementation.
**
**     3) Calls the sqlite3rbu_step() function one or more times on
**        the new handle. Each call to sqlite3rbu_step() performs a single
**        b-tree operation, so thousands of calls may be required to apply 
**        a complete update.
**
**     4) Calls sqlite3rbu_close() to close the RBU update handle. If
**        sqlite3rbu_step() has been called enough times to completely
**        apply the update to the target database, then the RBU database
**        is marked as fully applied. Otherwise, the state of the RBU 
**        update application is saved in the RBU database for later 
**        resumption.
**
** See comments below for more detail on APIs.
**
** If an update is only partially applied to the target database by the
** time sqlite3rbu_close() is called, various state information is saved 
** within the RBU database. This allows subsequent processes to automatically
** resume the RBU update from where it left off.
**
** To remove all RBU extension state information, returning an RBU database 
** to its original contents, it is sufficient to drop all tables that begin
** with the prefix "rbu_"
**
** DATABASE LOCKING
**
** An RBU update may not be applied to a database in WAL mode. Attempting
** to do so is an error (SQLITE_ERROR).
**
** While an RBU handle is open, a SHARED lock may be held on the target
** database file. This means it is possible for other clients to read the
** database, but not to write it.
**
** If an RBU update is started and then suspended before it is completed,
** then an external client writes to the database, then attempting to resume
** the suspended RBU update is also an error (SQLITE_BUSY).
*/

#ifndef _SQLITE3RBU_H
#define _SQLITE3RBU_H

#include "sqlite3.h"              /* Required for error code definitions */

#ifdef __cplusplus
extern "C" {
#endif

typedef struct sqlite3rbu sqlite3rbu;

/*
** Open an RBU handle.
**
** Argument zTarget is the path to the target database. Argument zRbu is
** the path to the RBU database. Each call to this function must be matched
** by a call to sqlite3rbu_close(). When opening the databases, RBU passes
** the SQLITE_CONFIG_URI flag to sqlite3_open_v2(). So if either zTarget
** or zRbu begin with "file:", it will be interpreted as an SQLite 
** database URI, not a regular file name.
**
** If the zState argument is passed a NULL value, the RBU extension stores 
** the current state of the update (how many rows have been updated, which 
** indexes are yet to be updated etc.) within the RBU database itself. This
** can be convenient, as it means that the RBU application does not need to
** organize removing a separate state file after the update is concluded. 
** Or, if zState is non-NULL, it must be a path to a database file in which 
** the RBU extension can store the state of the update.
**
** When resuming an RBU update, the zState argument must be passed the same
** value as when the RBU update was started.
**
** Once the RBU update is finished, the RBU extension does not 
** automatically remove any zState database file, even if it created it.
**
** By default, RBU uses the default VFS to access the files on disk. To
** use a VFS other than the default, an SQLite "file:" URI containing a
** "vfs=..." option may be passed as the zTarget option.
**
** IMPORTANT NOTE FOR ZIPVFS USERS: The RBU extension works with all of
** SQLite's built-in VFSs, including the multiplexor VFS. However it does
** not work out of the box with zipvfs. Refer to the comment describing
** the zipvfs_create_vfs() API below for details on using RBU with zipvfs.
*/
SQLITE_API sqlite3rbu *sqlite3rbu_open(
  const char *zTarget, 
  const char *zRbu,
  const char *zState
);

/*
** Open an RBU handle to perform an RBU vacuum on database file zTarget.
** An RBU vacuum is similar to SQLite's built-in VACUUM command, except
** that it can be suspended and resumed like an RBU update.
**
** The second argument to this function identifies a database in which 
** to store the state of the RBU vacuum operation if it is suspended. The 
** first time sqlite3rbu_vacuum() is called, to start an RBU vacuum
** operation, the state database should either not exist or be empty
** (contain no tables). If an RBU vacuum is suspended by calling 
** sqlite3rbu_close() on the RBU handle before sqlite3rbu_step() has
** returned SQLITE_DONE, the vacuum state is stored in the state database. 
** The vacuum can be resumed by calling this function to open a new RBU
** handle specifying the same target and state databases.
**
** If the second argument passed to this function is NULL, then the
** name of the state database is "<database>-vacuum", where <database>
** is the name of the target database file. In this case, on UNIX, if the
** state database is not already present in the file-system, it is created
** with the same permissions as the target db is made. 
**
** With an RBU vacuum, it is an SQLITE_MISUSE error if the name of the 
** state database ends with "-vactmp". This name is reserved for internal 
** use.
**
** This function does not delete the state database after an RBU vacuum
** is completed, even if it created it. However, if the call to
** sqlite3rbu_close() returns any value other than SQLITE_OK, the contents
** of the state tables within the state database are zeroed. This way,
** the next call to sqlite3rbu_vacuum() opens a handle that starts a 
** new RBU vacuum operation.
**
** As with sqlite3rbu_open(), Zipvfs users should rever to the comment
** describing the sqlite3rbu_create_vfs() API function below for 
** a description of the complications associated with using RBU with 
** zipvfs databases.
*/
SQLITE_API sqlite3rbu *sqlite3rbu_vacuum(
  const char *zTarget, 
  const char *zState
);

/*
** Configure a limit for the amount of temp space that may be used by
** the RBU handle passed as the first argument. The new limit is specified
** in bytes by the second parameter. If it is positive, the limit is updated.
** If the second parameter to this function is passed zero, then the limit
** is removed entirely. If the second parameter is negative, the limit is
** not modified (this is useful for querying the current limit).
**
** In all cases the returned value is the current limit in bytes (zero 
** indicates unlimited).
**
** If the temp space limit is exceeded during operation, an SQLITE_FULL
** error is returned.
*/
SQLITE_API sqlite3_int64 sqlite3rbu_temp_size_limit(sqlite3rbu*, sqlite3_int64);

/*
** Return the current amount of temp file space, in bytes, currently used by 
** the RBU handle passed as the only argument.
*/
SQLITE_API sqlite3_int64 sqlite3rbu_temp_size(sqlite3rbu*);

/*
** Internally, each RBU connection uses a separate SQLite database 
** connection to access the target and rbu update databases. This
** API allows the application direct access to these database handles.
**
** The first argument passed to this function must be a valid, open, RBU
** handle. The second argument should be passed zero to access the target
** database handle, or non-zero to access the rbu update database handle.
** Accessing the underlying database handles may be useful in the
** following scenarios:
**
**   * If any target tables are virtual tables, it may be necessary to
**     call sqlite3_create_module() on the target database handle to 
**     register the required virtual table implementations.
**
**   * If the data_xxx tables in the RBU source database are virtual 
**     tables, the application may need to call sqlite3_create_module() on
**     the rbu update db handle to any required virtual table
**     implementations.
**
**   * If the application uses the "rbu_delta()" feature described above,
**     it must use sqlite3_create_function() or similar to register the
**     rbu_delta() implementation with the target database handle.
**
** If an error has occurred, either while opening or stepping the RBU object,
** this function may return NULL. The error code and message may be collected
** when sqlite3rbu_close() is called.
**
** Database handles returned by this function remain valid until the next
** call to any sqlite3rbu_xxx() function other than sqlite3rbu_db().
*/
SQLITE_API sqlite3 *sqlite3rbu_db(sqlite3rbu*, int bRbu);

/*
** Do some work towards applying the RBU update to the target db. 
**
** Return SQLITE_DONE if the update has been completely applied, or 
** SQLITE_OK if no error occurs but there remains work to do to apply
** the RBU update. If an error does occur, some other error code is 
** returned. 
**
** Once a call to sqlite3rbu_step() has returned a value other than
** SQLITE_OK, all subsequent calls on the same RBU handle are no-ops
** that immediately return the same value.
*/
SQLITE_API int sqlite3rbu_step(sqlite3rbu *pRbu);

/*
** Force RBU to save its state to disk.
**
** If a power failure or application crash occurs during an update, following
** system recovery RBU may resume the update from the point at which the state
** was last saved. In other words, from the most recent successful call to 
** sqlite3rbu_close() or this function.
**
** SQLITE_OK is returned if successful, or an SQLite error code otherwise.
*/
SQLITE_API int sqlite3rbu_savestate(sqlite3rbu *pRbu);

/*
** Close an RBU handle. 
**
** If the RBU update has been completely applied, mark the RBU database
** as fully applied. Otherwise, assuming no error has occurred, save the
** current state of the RBU update appliation to the RBU database.
**
** If an error has already occurred as part of an sqlite3rbu_step()
** or sqlite3rbu_open() call, or if one occurs within this function, an
** SQLite error code is returned. Additionally, if pzErrmsg is not NULL,
** *pzErrmsg may be set to point to a buffer containing a utf-8 formatted
** English language error message. It is the responsibility of the caller to
** eventually free any such buffer using sqlite3_free().
**
** Otherwise, if no error occurs, this function returns SQLITE_OK if the
** update has been partially applied, or SQLITE_DONE if it has been 
** completely applied.
*/
SQLITE_API int sqlite3rbu_close(sqlite3rbu *pRbu, char **pzErrmsg);

/*
** Return the total number of key-value operations (inserts, deletes or 
** updates) that have been performed on the target database since the
** current RBU update was started.
*/
SQLITE_API sqlite3_int64 sqlite3rbu_progress(sqlite3rbu *pRbu);

/*
** Obtain permyriadage (permyriadage is to 10000 as percentage is to 100) 
** progress indications for the two stages of an RBU update. This API may
** be useful for driving GUI progress indicators and similar.
**
** An RBU update is divided into two stages:
**
**   * Stage 1, in which changes are accumulated in an oal/wal file, and
**   * Stage 2, in which the contents of the wal file are copied into the
**     main database.
**
** The update is visible to non-RBU clients during stage 2. During stage 1
** non-RBU reader clients may see the original database.
**
** If this API is called during stage 2 of the update, output variable 
** (*pnOne) is set to 10000 to indicate that stage 1 has finished and (*pnTwo)
** to a value between 0 and 10000 to indicate the permyriadage progress of
** stage 2. A value of 5000 indicates that stage 2 is half finished, 
** 9000 indicates that it is 90% finished, and so on.
**
** If this API is called during stage 1 of the update, output variable 
** (*pnTwo) is set to 0 to indicate that stage 2 has not yet started. The
** value to which (*pnOne) is set depends on whether or not the RBU 
** database contains an "rbu_count" table. The rbu_count table, if it 
** exists, must contain the same columns as the following:
**
**   CREATE TABLE rbu_count(tbl TEXT PRIMARY KEY, cnt INTEGER) WITHOUT ROWID;
**
** There must be one row in the table for each source (data_xxx) table within
** the RBU database. The 'tbl' column should contain the name of the source
** table. The 'cnt' column should contain the number of rows within the
** source table.
**
** If the rbu_count table is present and populated correctly and this
** API is called during stage 1, the *pnOne output variable is set to the
** permyriadage progress of the same stage. If the rbu_count table does
** not exist, then (*pnOne) is set to -1 during stage 1. If the rbu_count
** table exists but is not correctly populated, the value of the *pnOne
** output variable during stage 1 is undefined.
*/
SQLITE_API void sqlite3rbu_bp_progress(sqlite3rbu *pRbu, int *pnOne, int*pnTwo);

/*
** Obtain an indication as to the current stage of an RBU update or vacuum.
** This function always returns one of the SQLITE_RBU_STATE_XXX constants
** defined in this file. Return values should be interpreted as follows:
**
** SQLITE_RBU_STATE_OAL:
**   RBU is currently building a *-oal file. The next call to sqlite3rbu_step()
**   may either add further data to the *-oal file, or compute data that will
**   be added by a subsequent call.
**
** SQLITE_RBU_STATE_MOVE:
**   RBU has finished building the *-oal file. The next call to sqlite3rbu_step()
**   will move the *-oal file to the equivalent *-wal path. If the current
**   operation is an RBU update, then the updated version of the database
**   file will become visible to ordinary SQLite clients following the next
**   call to sqlite3rbu_step().
**
** SQLITE_RBU_STATE_CHECKPOINT:
**   RBU is currently performing an incremental checkpoint. The next call to
**   sqlite3rbu_step() will copy a page of data from the *-wal file into
**   the target database file.
**
** SQLITE_RBU_STATE_DONE:
**   The RBU operation has finished. Any subsequent calls to sqlite3rbu_step()
**   will immediately return SQLITE_DONE.
**
** SQLITE_RBU_STATE_ERROR:
**   An error has occurred. Any subsequent calls to sqlite3rbu_step() will
**   immediately return the SQLite error code associated with the error.
*/
#define SQLITE_RBU_STATE_OAL        1
#define SQLITE_RBU_STATE_MOVE       2
#define SQLITE_RBU_STATE_CHECKPOINT 3
#define SQLITE_RBU_STATE_DONE       4
#define SQLITE_RBU_STATE_ERROR      5

SQLITE_API int sqlite3rbu_state(sqlite3rbu *pRbu);

/*
** Create an RBU VFS named zName that accesses the underlying file-system
** via existing VFS zParent. Or, if the zParent parameter is passed NULL, 
** then the new RBU VFS uses the default system VFS to access the file-system.
** The new object is registered as a non-default VFS with SQLite before 
** returning.
**
** Part of the RBU implementation uses a custom VFS object. Usually, this
** object is created and deleted automatically by RBU. 
**
** The exception is for applications that also use zipvfs. In this case,
** the custom VFS must be explicitly created by the user before the RBU
** handle is opened. The RBU VFS should be installed so that the zipvfs
** VFS uses the RBU VFS, which in turn uses any other VFS layers in use 
** (for example multiplexor) to access the file-system. For example,
** to assemble an RBU enabled VFS stack that uses both zipvfs and 
** multiplexor (error checking omitted):
**
**     // Create a VFS named "multiplex" (not the default).
**     sqlite3_multiplex_initialize(0, 0);
**
**     // Create an rbu VFS named "rbu" that uses multiplexor. If the
**     // second argument were replaced with NULL, the "rbu" VFS would
**     // access the file-system via the system default VFS, bypassing the
**     // multiplexor.
**     sqlite3rbu_create_vfs("rbu", "multiplex");
**
**     // Create a zipvfs VFS named "zipvfs" that uses rbu.
**     zipvfs_create_vfs_v3("zipvfs", "rbu", 0, xCompressorAlgorithmDetector);
**
**     // Make zipvfs the default VFS.
**     sqlite3_vfs_register(sqlite3_vfs_find("zipvfs"), 1);
**
** Because the default VFS created above includes a RBU functionality, it
** may be used by RBU clients. Attempting to use RBU with a zipvfs VFS stack
** that does not include the RBU layer results in an error.
**
** The overhead of adding the "rbu" VFS to the system is negligible for 
** non-RBU users. There is no harm in an application accessing the 
** file-system via "rbu" all the time, even if it only uses RBU functionality 
** occasionally.
*/
SQLITE_API int sqlite3rbu_create_vfs(const char *zName, const char *zParent);

/*
** Deregister and destroy an RBU vfs created by an earlier call to
** sqlite3rbu_create_vfs().
**
** VFS objects are not reference counted. If a VFS object is destroyed
** before all database handles that use it have been closed, the results
** are undefined.
*/
SQLITE_API void sqlite3rbu_destroy_vfs(const char *zName);

#ifdef __cplusplus
}  /* end of the 'extern "C"' block */
#endif

#endif /* _SQLITE3RBU_H */
