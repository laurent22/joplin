
/*
** This file is the interface to a very simple database library used for
** testing. The interface is similar to that of the LSM. The main virtue 
** of this library is that the same API may be used to access a key-value
** store implemented by LSM, SQLite or another database system. Which 
** makes it easy to use for correctness and performance tests.
*/

#ifndef __WRAPPER_H_
#define __WRAPPER_H_

#ifdef __cplusplus
extern "C" {
#endif

#include "lsm.h"

typedef struct TestDb TestDb;

/*
** Open a new database connection. The first argument is the name of the
** database library to use. e.g. something like:
**
**     "sqlite3"
**     "lsm"
**
** See function tdb_system_name() for a list of available database systems.
**
** The second argument is the name of the database to open (e.g. a filename).
**
** If the third parameter is non-zero, then any existing database by the
** name of zDb is removed before opening a new one. If it is zero, then an
** existing database may be opened.
*/
int tdb_open(const char *zLibrary, const char *zDb, int bClear, TestDb **ppDb);

/*
** Close a database handle.
*/
int tdb_close(TestDb *pDb);

/*
** Write a new key/value into the database.
*/
int tdb_write(TestDb *pDb, void *pKey, int nKey, void *pVal, int nVal);

/*
** Delete a key from the database.
*/
int tdb_delete(TestDb *pDb, void *pKey, int nKey);

/*
** Delete a range of keys from the database.
*/
int tdb_delete_range(TestDb *, void *pKey1, int nKey1, void *pKey2, int nKey2);

/*
** Query the database for key (pKey/nKey). If no entry is found, set *ppVal
** to 0 and *pnVal to -1 before returning. Otherwise, set *ppVal and *pnVal
** to a pointer to and size of the value associated with (pKey/nKey).
*/
int tdb_fetch(TestDb *pDb, void *pKey, int nKey, void **ppVal, int *pnVal);

/*
** Open and close nested transactions. Currently, these functions only 
** work for SQLite3 and LSM systems. Use the tdb_transaction_support() 
** function to determine if a given TestDb handle supports these methods.
**
** These functions and the iLevel parameter follow the same conventions as
** the SQLite 4 transaction interface. Note that this is slightly different
** from the way LSM does things. As follows:
**
** tdb_begin():
**   A successful call to tdb_begin() with (iLevel>1) guarantees that 
**   there are at least (iLevel-1) write transactions open. If iLevel==1,
**   then it guarantees that at least a read-transaction is open. Calling
**   tdb_begin() with iLevel==0 is a no-op.
**
** tdb_commit():
**   A successful call to tdb_commit() with (iLevel>1) guarantees that 
**   there are at most (iLevel-1) write transactions open. If iLevel==1,
**   then it guarantees that there are no write transactions open (although
**   a read-transaction may remain open).  Calling tdb_commit() with 
**   iLevel==0 ensures that all transactions, read or write, have been 
**   closed and committed.
**
** tdb_rollback():
**   This call is similar to tdb_commit(), except that instead of committing
**   transactions, it reverts them. For example, calling tdb_rollback() with
**   iLevel==2 ensures that there is at most one write transaction open, and
**   restores the database to the state that it was in when that transaction
**   was opened.
**
**   In other words, tdb_commit() just closes transactions - tdb_rollback()
**   closes transactions and then restores the database to the state it
**   was in before those transactions were even opened.
*/
int tdb_begin(TestDb *pDb, int iLevel);
int tdb_commit(TestDb *pDb, int iLevel);
int tdb_rollback(TestDb *pDb, int iLevel);

/*
** Return true if transactions are supported, or false otherwise.
*/
int tdb_transaction_support(TestDb *pDb);

/*
** Return the name of the database library (as passed to tdb_open()) used
** by the handled passed as the first argument.
*/
const char *tdb_library_name(TestDb *pDb);

/*
** Scan a range of database keys. Invoke the callback function for each
** key visited.
*/
int tdb_scan(
  TestDb *pDb,                    /* Database handle */
  void *pCtx,                     /* Context pointer to pass to xCallback */
  int bReverse,                   /* True to scan in reverse order */
  void *pKey1, int nKey1,         /* Start of search */
  void *pKey2, int nKey2,         /* End of search */
  void (*xCallback)(void *pCtx, void *pKey, int nKey, void *pVal, int nVal)
);

const char *tdb_system_name(int i);
const char *tdb_default_db(const char *zSys);

int tdb_lsm_open(const char *zCfg, const char *zDb, int bClear, TestDb **ppDb);

/*
** If the TestDb handle passed as an argument is a wrapper around an LSM
** database, return the LSM handle. Otherwise, if the argument is some other
** database system, return NULL.
*/
lsm_db *tdb_lsm(TestDb *pDb);

/*
** Return true if the db passed as an argument is a multi-threaded LSM
** connection.
*/
int tdb_lsm_multithread(TestDb *pDb);

/*
** Return a pointer to the lsm_env object used by all lsm database
** connections initialized as a copy of the object returned by 
** lsm_default_env(). It may be modified (e.g. to override functions)
** if the caller can guarantee that it is not already in use.
*/
lsm_env *tdb_lsm_env(void);

/*
** The following functions only work with LSM database handles. It is
** illegal to call them with any other type of database handle specified
** as an argument.
*/
void tdb_lsm_enable_log(TestDb *pDb, int bEnable);
void tdb_lsm_application_crash(TestDb *pDb);
void tdb_lsm_prepare_system_crash(TestDb *pDb);
void tdb_lsm_system_crash(TestDb *pDb);
void tdb_lsm_prepare_sync_crash(TestDb *pDb, int iSync);


void tdb_lsm_safety(TestDb *pDb, int eMode);
void tdb_lsm_config_work_hook(TestDb *pDb, void (*)(lsm_db *, void *), void *);
void tdb_lsm_write_hook(TestDb *, void(*)(void*,int,lsm_i64,int,int), void*);
int tdb_lsm_config_str(TestDb *pDb, const char *zStr);

#ifdef __cplusplus
}  /* End of the 'extern "C"' block */
#endif

#endif
