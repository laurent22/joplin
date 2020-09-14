
/*
** This program attempts to test the correctness of some facets of the 
** LSM database library. Specifically, that the contents of the database
** are maintained correctly during a series of inserts and deletes.
*/


#include "lsmtest_tdb.h"
#include "lsm.h"

#include "lsmtest.h"

#include <stdlib.h>
#include <string.h>
#include <assert.h>
#ifndef _WIN32
# include <unistd.h>
#endif
#include <stdio.h>


typedef struct SqlDb SqlDb;

static int error_transaction_function(TestDb *p, int iLevel){ 
  unused_parameter(p);
  unused_parameter(iLevel);
  return -1; 
}


/*************************************************************************
** Begin wrapper for LevelDB.
*/
#ifdef HAVE_LEVELDB

#include <leveldb/c.h>

typedef struct LevelDb LevelDb;
struct LevelDb {
  TestDb base;
  leveldb_t *db;
  leveldb_options_t *pOpt;
  leveldb_writeoptions_t *pWriteOpt;
  leveldb_readoptions_t *pReadOpt;

  char *pVal;
};

static int test_leveldb_close(TestDb *pTestDb){
  LevelDb *pDb = (LevelDb *)pTestDb;

  leveldb_close(pDb->db);
  leveldb_writeoptions_destroy(pDb->pWriteOpt);
  leveldb_readoptions_destroy(pDb->pReadOpt);
  leveldb_options_destroy(pDb->pOpt);
  free(pDb->pVal);
  free(pDb);

  return 0;
}

static int test_leveldb_write(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void *pVal, 
  int nVal
){
  LevelDb *pDb = (LevelDb *)pTestDb;
  char *zErr = 0;
  leveldb_put(pDb->db, pDb->pWriteOpt, pKey, nKey, pVal, nVal, &zErr);
  return (zErr!=0);
}

static int test_leveldb_delete(TestDb *pTestDb, void *pKey, int nKey){
  LevelDb *pDb = (LevelDb *)pTestDb;
  char *zErr = 0;
  leveldb_delete(pDb->db, pDb->pWriteOpt, pKey, nKey, &zErr);
  return (zErr!=0);
}

static int test_leveldb_fetch(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void **ppVal, 
  int *pnVal
){
  LevelDb *pDb = (LevelDb *)pTestDb;
  char *zErr = 0;
  size_t nVal = 0;

  if( pKey==0 ) return 0;
  free(pDb->pVal);
  pDb->pVal = leveldb_get(pDb->db, pDb->pReadOpt, pKey, nKey, &nVal, &zErr);
  *ppVal = (void *)(pDb->pVal);
  if( pDb->pVal==0 ){
    *pnVal = -1;
  }else{
    *pnVal = (int)nVal;
  }

  return (zErr!=0);
}

static int test_leveldb_scan(
  TestDb *pTestDb,
  void *pCtx,
  int bReverse,
  void *pKey1, int nKey1,         /* Start of search */
  void *pKey2, int nKey2,         /* End of search */
  void (*xCallback)(void *, void *, int , void *, int)
){
  LevelDb *pDb = (LevelDb *)pTestDb;
  leveldb_iterator_t *iter;

  iter = leveldb_create_iterator(pDb->db, pDb->pReadOpt);

  if( bReverse==0 ){
    if( pKey1 ){
      leveldb_iter_seek(iter, pKey1, nKey1);
    }else{
      leveldb_iter_seek_to_first(iter);
    }
  }else{
    if( pKey2 ){
      leveldb_iter_seek(iter, pKey2, nKey2);

      if( leveldb_iter_valid(iter)==0 ){
        leveldb_iter_seek_to_last(iter);
      }else{
        const char *k; size_t n;
        int res;
        k = leveldb_iter_key(iter, &n);
        res = memcmp(k, pKey2, MIN(n, nKey2));
        if( res==0 ) res = n - nKey2;
        assert( res>=0 );
        if( res>0 ){
          leveldb_iter_prev(iter);
        }
      }
    }else{
      leveldb_iter_seek_to_last(iter);
    }
  }


  while( leveldb_iter_valid(iter) ){
    const char *k; size_t n;
    const char *v; size_t n2;
    int res;

    k = leveldb_iter_key(iter, &n);
    if( bReverse==0 && pKey2 ){
      res = memcmp(k, pKey2, MIN(n, nKey2));
      if( res==0 ) res = n - nKey2;
      if( res>0 ) break;
    }
    if( bReverse!=0 && pKey1 ){
      res = memcmp(k, pKey1, MIN(n, nKey1));
      if( res==0 ) res = n - nKey1;
      if( res<0 ) break;
    }

    v = leveldb_iter_value(iter, &n2);

    xCallback(pCtx, (void *)k, n, (void *)v, n2);

    if( bReverse==0 ){
      leveldb_iter_next(iter);
    }else{
      leveldb_iter_prev(iter);
    }
  }

  leveldb_iter_destroy(iter);
  return 0;
}

static int test_leveldb_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){
  static const DatabaseMethods LeveldbMethods = {
    test_leveldb_close,
    test_leveldb_write,
    test_leveldb_delete,
    0,
    test_leveldb_fetch,
    test_leveldb_scan,
    error_transaction_function,
    error_transaction_function,
    error_transaction_function
  };

  LevelDb *pLevelDb;
  char *zErr = 0;

  if( bClear ){
    char *zCmd = sqlite3_mprintf("rm -rf %s\n", zFilename);
    system(zCmd);
    sqlite3_free(zCmd);
  }

  pLevelDb = (LevelDb *)malloc(sizeof(LevelDb));
  memset(pLevelDb, 0, sizeof(LevelDb));

  pLevelDb->pOpt = leveldb_options_create();
  leveldb_options_set_create_if_missing(pLevelDb->pOpt, 1);
  pLevelDb->pWriteOpt = leveldb_writeoptions_create();
  pLevelDb->pReadOpt = leveldb_readoptions_create();

  pLevelDb->db = leveldb_open(pLevelDb->pOpt, zFilename, &zErr);

  if( zErr ){
    test_leveldb_close((TestDb *)pLevelDb);
    *ppDb = 0;
    return 1;
  }

  *ppDb = (TestDb *)pLevelDb;
  pLevelDb->base.pMethods = &LeveldbMethods;
  return 0;
}
#endif  /* HAVE_LEVELDB */
/* 
** End wrapper for LevelDB.
*************************************************************************/

#ifdef HAVE_KYOTOCABINET
static int kc_close(TestDb *pTestDb){
  return test_kc_close(pTestDb);
}

static int kc_write(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void *pVal, 
  int nVal
){
  return test_kc_write(pTestDb, pKey, nKey, pVal, nVal);
}

static int kc_delete(TestDb *pTestDb, void *pKey, int nKey){
  return test_kc_delete(pTestDb, pKey, nKey);
}

static int kc_delete_range(
  TestDb *pTestDb, 
  void *pKey1, int nKey1,
  void *pKey2, int nKey2
){
  return test_kc_delete_range(pTestDb, pKey1, nKey1, pKey2, nKey2);
}

static int kc_fetch(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void **ppVal, 
  int *pnVal
){
  if( pKey==0 ) return LSM_OK;
  return test_kc_fetch(pTestDb, pKey, nKey, ppVal, pnVal);
}

static int kc_scan(
  TestDb *pTestDb,
  void *pCtx,
  int bReverse,
  void *pFirst, int nFirst,
  void *pLast, int nLast,
  void (*xCallback)(void *, void *, int , void *, int)
){
  return test_kc_scan(
      pTestDb, pCtx, bReverse, pFirst, nFirst, pLast, nLast, xCallback
  );
}

static int kc_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){
  static const DatabaseMethods KcdbMethods = {
    kc_close,
    kc_write,
    kc_delete,
    kc_delete_range,
    kc_fetch,
    kc_scan,
    error_transaction_function,
    error_transaction_function,
    error_transaction_function
  };

  int rc;
  TestDb *pTestDb = 0;

  rc = test_kc_open(zFilename, bClear, &pTestDb);
  if( rc!=0 ){
    *ppDb = 0;
    return rc;
  }
  pTestDb->pMethods = &KcdbMethods;
  *ppDb = pTestDb;
  return 0;
}
#endif /* HAVE_KYOTOCABINET */
/* 
** End wrapper for Kyoto cabinet.
*************************************************************************/

#ifdef HAVE_MDB
static int mdb_close(TestDb *pTestDb){
  return test_mdb_close(pTestDb);
}

static int mdb_write(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void *pVal, 
  int nVal
){
  return test_mdb_write(pTestDb, pKey, nKey, pVal, nVal);
}

static int mdb_delete(TestDb *pTestDb, void *pKey, int nKey){
  return test_mdb_delete(pTestDb, pKey, nKey);
}

static int mdb_fetch(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void **ppVal, 
  int *pnVal
){
  if( pKey==0 ) return LSM_OK;
  return test_mdb_fetch(pTestDb, pKey, nKey, ppVal, pnVal);
}

static int mdb_scan(
  TestDb *pTestDb,
  void *pCtx,
  int bReverse,
  void *pFirst, int nFirst,
  void *pLast, int nLast,
  void (*xCallback)(void *, void *, int , void *, int)
){
  return test_mdb_scan(
      pTestDb, pCtx, bReverse, pFirst, nFirst, pLast, nLast, xCallback
  );
}

static int mdb_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){
  static const DatabaseMethods KcdbMethods = {
    mdb_close,
    mdb_write,
    mdb_delete,
    0,
    mdb_fetch,
    mdb_scan,
    error_transaction_function,
    error_transaction_function,
    error_transaction_function
  };

  int rc;
  TestDb *pTestDb = 0;

  rc = test_mdb_open(zSpec, zFilename, bClear, &pTestDb);
  if( rc!=0 ){
    *ppDb = 0;
    return rc;
  }
  pTestDb->pMethods = &KcdbMethods;
  *ppDb = pTestDb;
  return 0;
}
#endif /* HAVE_MDB */

/*************************************************************************
** Begin wrapper for SQLite.
*/

/*
** nOpenTrans:
**   The number of open nested transactions, in the same sense as used
**   by the tdb_begin/commit/rollback and SQLite 4 KV interfaces. If this
**   value is 0, there are no transactions open at all. If it is 1, then
**   there is a read transaction. If it is 2 or greater, then there are
**   (nOpenTrans-1) nested write transactions open.
*/
struct SqlDb {
  TestDb base;
  sqlite3 *db;
  sqlite3_stmt *pInsert;
  sqlite3_stmt *pDelete;
  sqlite3_stmt *pDeleteRange;
  sqlite3_stmt *pFetch;
  sqlite3_stmt *apScan[8];

  int nOpenTrans;

  /* Used by sql_fetch() to allocate space for results */
  int nAlloc;
  u8 *aAlloc;
};

static int sql_close(TestDb *pTestDb){
  SqlDb *pDb = (SqlDb *)pTestDb;
  sqlite3_finalize(pDb->pInsert);
  sqlite3_finalize(pDb->pDelete);
  sqlite3_finalize(pDb->pDeleteRange);
  sqlite3_finalize(pDb->pFetch);
  sqlite3_finalize(pDb->apScan[0]);
  sqlite3_finalize(pDb->apScan[1]);
  sqlite3_finalize(pDb->apScan[2]);
  sqlite3_finalize(pDb->apScan[3]);
  sqlite3_finalize(pDb->apScan[4]);
  sqlite3_finalize(pDb->apScan[5]);
  sqlite3_finalize(pDb->apScan[6]);
  sqlite3_finalize(pDb->apScan[7]);
  sqlite3_close(pDb->db);
  free((char *)pDb->aAlloc);
  free((char *)pDb);
  return SQLITE_OK;
}

static int sql_write(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void *pVal, 
  int nVal
){
  SqlDb *pDb = (SqlDb *)pTestDb;
  sqlite3_bind_blob(pDb->pInsert, 1, pKey, nKey, SQLITE_STATIC);
  sqlite3_bind_blob(pDb->pInsert, 2, pVal, nVal, SQLITE_STATIC);
  sqlite3_step(pDb->pInsert);
  return sqlite3_reset(pDb->pInsert);
}

static int sql_delete(TestDb *pTestDb, void *pKey, int nKey){
  SqlDb *pDb = (SqlDb *)pTestDb;
  sqlite3_bind_blob(pDb->pDelete, 1, pKey, nKey, SQLITE_STATIC);
  sqlite3_step(pDb->pDelete);
  return sqlite3_reset(pDb->pDelete);
}

static int sql_delete_range(
  TestDb *pTestDb, 
  void *pKey1, int nKey1,
  void *pKey2, int nKey2
){
  SqlDb *pDb = (SqlDb *)pTestDb;
  sqlite3_bind_blob(pDb->pDeleteRange, 1, pKey1, nKey1, SQLITE_STATIC);
  sqlite3_bind_blob(pDb->pDeleteRange, 2, pKey2, nKey2, SQLITE_STATIC);
  sqlite3_step(pDb->pDeleteRange);
  return sqlite3_reset(pDb->pDeleteRange);
}

static int sql_fetch(
  TestDb *pTestDb, 
  void *pKey, 
  int nKey, 
  void **ppVal, 
  int *pnVal
){
  SqlDb *pDb = (SqlDb *)pTestDb;
  int rc;

  sqlite3_reset(pDb->pFetch);
  if( pKey==0 ){
    assert( ppVal==0 );
    assert( pnVal==0 );
    return LSM_OK;
  }

  sqlite3_bind_blob(pDb->pFetch, 1, pKey, nKey, SQLITE_STATIC);
  rc = sqlite3_step(pDb->pFetch);
  if( rc==SQLITE_ROW ){
    int nVal = sqlite3_column_bytes(pDb->pFetch, 0);
    u8 *aVal = (void *)sqlite3_column_blob(pDb->pFetch, 0);

    if( nVal>pDb->nAlloc ){
      free(pDb->aAlloc);
      pDb->aAlloc = (u8 *)malloc(nVal*2);
      pDb->nAlloc = nVal*2;
    }
    memcpy(pDb->aAlloc, aVal, nVal);
    *pnVal = nVal;
    *ppVal = (void *)pDb->aAlloc;
  }else{
    *pnVal = -1;
    *ppVal = 0;
  }

  rc = sqlite3_reset(pDb->pFetch);
  return rc;
}

static int sql_scan(
  TestDb *pTestDb,
  void *pCtx,
  int bReverse,
  void *pFirst, int nFirst,
  void *pLast, int nLast,
  void (*xCallback)(void *, void *, int , void *, int)
){
  SqlDb *pDb = (SqlDb *)pTestDb;
  sqlite3_stmt *pScan;

  assert( bReverse==1 || bReverse==0 );
  pScan = pDb->apScan[(pFirst==0) + (pLast==0)*2 + bReverse*4];

  if( pFirst ) sqlite3_bind_blob(pScan, 1, pFirst, nFirst, SQLITE_STATIC);
  if( pLast ) sqlite3_bind_blob(pScan, 2, pLast, nLast, SQLITE_STATIC);

  while( SQLITE_ROW==sqlite3_step(pScan) ){
    void *pKey; int nKey;
    void *pVal; int nVal;

    nKey = sqlite3_column_bytes(pScan, 0);
    pKey = (void *)sqlite3_column_blob(pScan, 0);
    nVal = sqlite3_column_bytes(pScan, 1);
    pVal = (void *)sqlite3_column_blob(pScan, 1);

    xCallback(pCtx, pKey, nKey, pVal, nVal);
  }
  return sqlite3_reset(pScan);
}

static int sql_begin(TestDb *pTestDb, int iLevel){
  int i;
  SqlDb *pDb = (SqlDb *)pTestDb;

  /* iLevel==0 is a no-op */
  if( iLevel==0 ) return 0;

  /* If there are no transactions at all open, open a read transaction. */
  if( pDb->nOpenTrans==0 ){
    int rc = sqlite3_exec(pDb->db, 
        "BEGIN; SELECT * FROM sqlite_schema LIMIT 1;" , 0, 0, 0
    );
    if( rc!=0 ) return rc;
    pDb->nOpenTrans = 1;
  }

  /* Open any required write transactions */
  for(i=pDb->nOpenTrans; i<iLevel; i++){
    char *zSql = sqlite3_mprintf("SAVEPOINT x%d", i);
    int rc = sqlite3_exec(pDb->db, zSql, 0, 0, 0);
    sqlite3_free(zSql);
    if( rc!=SQLITE_OK ) return rc;
  }

  pDb->nOpenTrans = iLevel;
  return 0;
}

static int sql_commit(TestDb *pTestDb, int iLevel){
  SqlDb *pDb = (SqlDb *)pTestDb;
  assert( iLevel>=0 );

  /* Close the read transaction if requested. */
  if( pDb->nOpenTrans>=1 && iLevel==0 ){
    int rc = sqlite3_exec(pDb->db, "COMMIT", 0, 0, 0);
    if( rc!=0 ) return rc;
    pDb->nOpenTrans = 0;
  }

  /* Close write transactions as required */
  if( pDb->nOpenTrans>iLevel ){
    char *zSql = sqlite3_mprintf("RELEASE x%d", iLevel);
    int rc = sqlite3_exec(pDb->db, zSql, 0, 0, 0);
    sqlite3_free(zSql);
    if( rc!=0 ) return rc;
  }

  pDb->nOpenTrans = iLevel;
  return 0;
}

static int sql_rollback(TestDb *pTestDb, int iLevel){
  SqlDb *pDb = (SqlDb *)pTestDb;
  assert( iLevel>=0 );

  if( pDb->nOpenTrans>=1 && iLevel==0 ){
    /* Close the read transaction if requested. */
    int rc = sqlite3_exec(pDb->db, "ROLLBACK", 0, 0, 0);
    if( rc!=0 ) return rc;
  }else if( pDb->nOpenTrans>1 && iLevel==1 ){
    /* Or, rollback and close the top-level write transaction */
    int rc = sqlite3_exec(pDb->db, "ROLLBACK TO x1; RELEASE x1;", 0, 0, 0);
    if( rc!=0 ) return rc;
  }else{
    /* Or, just roll back some nested transactions */
    char *zSql = sqlite3_mprintf("ROLLBACK TO x%d", iLevel-1);
    int rc = sqlite3_exec(pDb->db, zSql, 0, 0, 0);
    sqlite3_free(zSql);
    if( rc!=0 ) return rc;
  }

  pDb->nOpenTrans = iLevel;
  return 0;
}

static int sql_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){
  static const DatabaseMethods SqlMethods = {
    sql_close,
    sql_write,
    sql_delete,
    sql_delete_range,
    sql_fetch,
    sql_scan,
    sql_begin,
    sql_commit,
    sql_rollback
  };
  const char *zCreate = "CREATE TABLE IF NOT EXISTS t1(k PRIMARY KEY, v)";
  const char *zInsert = "REPLACE INTO t1 VALUES(?, ?)";
  const char *zDelete = "DELETE FROM t1 WHERE k = ?";
  const char *zRange = "DELETE FROM t1 WHERE k>? AND k<?";
  const char *zFetch  = "SELECT v FROM t1 WHERE k = ?";

  const char *zScan0  = "SELECT * FROM t1 WHERE k BETWEEN ?1 AND ?2 ORDER BY k";
  const char *zScan1  = "SELECT * FROM t1 WHERE k <= ?2 ORDER BY k";
  const char *zScan2  = "SELECT * FROM t1 WHERE k >= ?1 ORDER BY k";
  const char *zScan3  = "SELECT * FROM t1 ORDER BY k";

  const char *zScan4  = 
    "SELECT * FROM t1 WHERE k BETWEEN ?1 AND ?2 ORDER BY k DESC";
  const char *zScan5  = "SELECT * FROM t1 WHERE k <= ?2 ORDER BY k DESC";
  const char *zScan6  = "SELECT * FROM t1 WHERE k >= ?1 ORDER BY k DESC";
  const char *zScan7  = "SELECT * FROM t1 ORDER BY k DESC";

  int rc;
  SqlDb *pDb;
  char *zPragma;

  if( bClear && zFilename && zFilename[0] ){
    unlink(zFilename);
  }

  pDb = (SqlDb *)malloc(sizeof(SqlDb));
  memset(pDb, 0, sizeof(SqlDb));
  pDb->base.pMethods = &SqlMethods;

  if( 0!=(rc = sqlite3_open(zFilename, &pDb->db))
   || 0!=(rc = sqlite3_exec(pDb->db, zCreate, 0, 0, 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zInsert, -1, &pDb->pInsert, 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zDelete, -1, &pDb->pDelete, 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zRange, -1, &pDb->pDeleteRange, 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zFetch, -1, &pDb->pFetch, 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan0, -1, &pDb->apScan[0], 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan1, -1, &pDb->apScan[1], 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan2, -1, &pDb->apScan[2], 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan3, -1, &pDb->apScan[3], 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan4, -1, &pDb->apScan[4], 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan5, -1, &pDb->apScan[5], 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan6, -1, &pDb->apScan[6], 0))
   || 0!=(rc = sqlite3_prepare_v2(pDb->db, zScan7, -1, &pDb->apScan[7], 0))
  ){
    *ppDb = 0;
    sql_close((TestDb *)pDb);
    return rc;
  }

  zPragma = sqlite3_mprintf("PRAGMA page_size=%d", TESTDB_DEFAULT_PAGE_SIZE);
  sqlite3_exec(pDb->db, zPragma, 0, 0, 0);
  sqlite3_free(zPragma);
  zPragma = sqlite3_mprintf("PRAGMA cache_size=%d", TESTDB_DEFAULT_CACHE_SIZE);
  sqlite3_exec(pDb->db, zPragma, 0, 0, 0);
  sqlite3_free(zPragma);

  /* sqlite3_exec(pDb->db, "PRAGMA locking_mode=EXCLUSIVE", 0, 0, 0); */
  sqlite3_exec(pDb->db, "PRAGMA synchronous=OFF", 0, 0, 0);
  sqlite3_exec(pDb->db, "PRAGMA journal_mode=WAL", 0, 0, 0);
  sqlite3_exec(pDb->db, "PRAGMA wal_autocheckpoint=4096", 0, 0, 0);
  if( zSpec ){
    rc = sqlite3_exec(pDb->db, zSpec, 0, 0, 0);
    if( rc!=SQLITE_OK ){
      sql_close((TestDb *)pDb);
      return rc;
    }
  }

  *ppDb = (TestDb *)pDb;
  return 0;
}
/* 
** End wrapper for SQLite.
*************************************************************************/

/*************************************************************************
** Begin exported functions.
*/
static struct Lib {
  const char *zName;
  const char *zDefaultDb;
  int (*xOpen)(const char *, const char *zFilename, int bClear, TestDb **ppDb);
} aLib[] = {
  { "sqlite3",      "testdb.sqlite",    sql_open },
  { "lsm_small",    "testdb.lsm_small", test_lsm_small_open },
  { "lsm_lomem",    "testdb.lsm_lomem", test_lsm_lomem_open },
  { "lsm_lomem2",   "testdb.lsm_lomem2", test_lsm_lomem2_open },
#ifdef HAVE_ZLIB
  { "lsm_zip",      "testdb.lsm_zip",   test_lsm_zip_open },
#endif
  { "lsm",          "testdb.lsm",       test_lsm_open },
#ifdef LSM_MUTEX_PTHREADS
  { "lsm_mt2",      "testdb.lsm_mt2",   test_lsm_mt2 },
  { "lsm_mt3",      "testdb.lsm_mt3",   test_lsm_mt3 },
#endif
#ifdef HAVE_LEVELDB
  { "leveldb",      "testdb.leveldb",   test_leveldb_open },
#endif
#ifdef HAVE_KYOTOCABINET
  { "kyotocabinet", "testdb.kc",        kc_open },
#endif
#ifdef HAVE_MDB
  { "mdb", "./testdb.mdb",        mdb_open }
#endif
};

const char *tdb_system_name(int i){
  if( i<0 || i>=ArraySize(aLib) ) return 0;
  return aLib[i].zName;
}

const char *tdb_default_db(const char *zSys){
  int i;
  for(i=0; i<ArraySize(aLib); i++){
    if( strcmp(aLib[i].zName, zSys)==0 ) return aLib[i].zDefaultDb;
  }
  return 0;
}

int tdb_open(const char *zLib, const char *zDb, int bClear, TestDb **ppDb){
  int i;
  int rc = 1;
  const char *zSpec = 0;

  int nLib = 0;
  while( zLib[nLib] && zLib[nLib]!=' ' ){
    nLib++;
  }
  zSpec = &zLib[nLib];
  while( *zSpec==' ' ) zSpec++;
  if( *zSpec=='\0' ) zSpec = 0;

  for(i=0; i<ArraySize(aLib); i++){
    if( (int)strlen(aLib[i].zName)==nLib
        && 0==memcmp(zLib, aLib[i].zName, nLib) ){
      rc = aLib[i].xOpen(zSpec, (zDb ? zDb : aLib[i].zDefaultDb), bClear, ppDb);
      if( rc==0 ){
        (*ppDb)->zLibrary = aLib[i].zName;
      }
      break;
    }
  }

  if( rc ){
    /* Failed to find the requested database library. Return an error. */
    *ppDb = 0;
  }
  return rc;
}

int tdb_close(TestDb *pDb){
  if( pDb ){
    return pDb->pMethods->xClose(pDb);
  }
  return 0;
}

int tdb_write(TestDb *pDb, void *pKey, int nKey, void *pVal, int nVal){
  return pDb->pMethods->xWrite(pDb, pKey, nKey, pVal, nVal);
}

int tdb_delete(TestDb *pDb, void *pKey, int nKey){
  return pDb->pMethods->xDelete(pDb, pKey, nKey);
}

int tdb_delete_range(
    TestDb *pDb, void *pKey1, int nKey1, void *pKey2, int nKey2
){
  return pDb->pMethods->xDeleteRange(pDb, pKey1, nKey1, pKey2, nKey2);
}

int tdb_fetch(TestDb *pDb, void *pKey, int nKey, void **ppVal, int *pnVal){
  return pDb->pMethods->xFetch(pDb, pKey, nKey, ppVal, pnVal);
}

int tdb_scan(
  TestDb *pDb,                    /* Database handle */
  void *pCtx,                     /* Context pointer to pass to xCallback */
  int bReverse,                   /* True to scan in reverse order */
  void *pKey1, int nKey1,         /* Start of search */
  void *pKey2, int nKey2,         /* End of search */
  void (*xCallback)(void *pCtx, void *pKey, int nKey, void *pVal, int nVal)
){
  return pDb->pMethods->xScan(
      pDb, pCtx, bReverse, pKey1, nKey1, pKey2, nKey2, xCallback
  );
}

int tdb_begin(TestDb *pDb, int iLevel){
  return pDb->pMethods->xBegin(pDb, iLevel);
}
int tdb_commit(TestDb *pDb, int iLevel){
  return pDb->pMethods->xCommit(pDb, iLevel);
}
int tdb_rollback(TestDb *pDb, int iLevel){
  return pDb->pMethods->xRollback(pDb, iLevel);
}

int tdb_transaction_support(TestDb *pDb){
  return (pDb->pMethods->xBegin != error_transaction_function);
}

const char *tdb_library_name(TestDb *pDb){
  return pDb->zLibrary;
}

/* 
** End exported functions.
*************************************************************************/
