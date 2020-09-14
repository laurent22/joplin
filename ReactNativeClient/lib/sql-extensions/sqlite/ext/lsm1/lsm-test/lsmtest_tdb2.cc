

#include "lsmtest.h"
#include <stdlib.h>

#ifdef HAVE_KYOTOCABINET
#include "kcpolydb.h"
extern "C" {
  struct KcDb {
    TestDb base;
    kyotocabinet::TreeDB* db;
    char *pVal;
  };
}

int test_kc_open(const char *zFilename, int bClear, TestDb **ppDb){
  KcDb *pKcDb;
  int ok;
  int rc = 0;

  if( bClear ){
    char *zCmd = sqlite3_mprintf("rm -rf %s\n", zFilename);
    system(zCmd);
    sqlite3_free(zCmd);
  }

  pKcDb = (KcDb *)malloc(sizeof(KcDb));
  memset(pKcDb, 0, sizeof(KcDb));


  pKcDb->db = new kyotocabinet::TreeDB();
  pKcDb->db->tune_page(TESTDB_DEFAULT_PAGE_SIZE);
  pKcDb->db->tune_page_cache(
      TESTDB_DEFAULT_PAGE_SIZE * TESTDB_DEFAULT_CACHE_SIZE
  );
  ok = pKcDb->db->open(zFilename,
      kyotocabinet::PolyDB::OWRITER | kyotocabinet::PolyDB::OCREATE
  );
  if( ok==0 ){
    free(pKcDb);
    pKcDb = 0;
    rc = 1;
  }

  *ppDb = (TestDb *)pKcDb;
  return rc;
}

int test_kc_close(TestDb *pDb){
  KcDb *pKcDb = (KcDb *)pDb;
  if( pKcDb->pVal ){
    delete [] pKcDb->pVal;
  }
  pKcDb->db->close();
  delete pKcDb->db;
  free(pKcDb);
  return 0;
}

int test_kc_write(TestDb *pDb, void *pKey, int nKey, void *pVal, int nVal){
  KcDb *pKcDb = (KcDb *)pDb;
  int ok;

  ok = pKcDb->db->set((const char *)pKey, nKey, (const char *)pVal, nVal);
  return (ok ? 0 : 1);
}

int test_kc_delete(TestDb *pDb, void *pKey, int nKey){
  KcDb *pKcDb = (KcDb *)pDb;
  int ok;

  ok = pKcDb->db->remove((const char *)pKey, nKey);
  return (ok ? 0 : 1);
}

int test_kc_delete_range(
  TestDb *pDb, 
  void *pKey1, int nKey1,
  void *pKey2, int nKey2
){
  int res;
  KcDb *pKcDb = (KcDb *)pDb;
  kyotocabinet::DB::Cursor* pCur = pKcDb->db->cursor();

  if( pKey1 ){
    res = pCur->jump((const char *)pKey1, nKey1);
  }else{
    res = pCur->jump();
  }

  while( 1 ){
    const char *pKey; size_t nKey;
    const char *pVal; size_t nVal;

    pKey = pCur->get(&nKey, &pVal, &nVal);
    if( pKey==0 ) break;

#ifndef NDEBUG
    if( pKey1 ){
      res = memcmp(pKey, pKey1, MIN((size_t)nKey1, nKey));
      assert( res>0 || (res==0 && nKey>nKey1) );
    }
#endif

    if( pKey2 ){
      res = memcmp(pKey, pKey2, MIN((size_t)nKey2, nKey));
      if( res>0 || (res==0 && (size_t)nKey2<nKey) ){
        delete [] pKey;
        break;
      }
    }
    pCur->remove();
    delete [] pKey;
  }

  delete pCur;
  return 0;
}

int test_kc_fetch(
  TestDb *pDb, 
  void *pKey, 
  int nKey, 
  void **ppVal,
  int *pnVal
){
  KcDb *pKcDb = (KcDb *)pDb;
  size_t nVal;

  if( pKcDb->pVal ){
    delete [] pKcDb->pVal;
    pKcDb->pVal = 0;
  }

  pKcDb->pVal = pKcDb->db->get((const char *)pKey, nKey, &nVal);
  if( pKcDb->pVal ){
    *ppVal = pKcDb->pVal;
    *pnVal = nVal;
  }else{
    *ppVal = 0;
    *pnVal = -1;
  }

  return 0;
}

int test_kc_scan(
  TestDb *pDb,                    /* Database handle */
  void *pCtx,                     /* Context pointer to pass to xCallback */
  int bReverse,                   /* True for a reverse order scan */
  void *pKey1, int nKey1,         /* Start of search */
  void *pKey2, int nKey2,         /* End of search */
  void (*xCallback)(void *pCtx, void *pKey, int nKey, void *pVal, int nVal)
){
  KcDb *pKcDb = (KcDb *)pDb;
  kyotocabinet::DB::Cursor* pCur = pKcDb->db->cursor();
  int res;

  if( bReverse==0 ){
    if( pKey1 ){
      res = pCur->jump((const char *)pKey1, nKey1);
    }else{
      res = pCur->jump();
    }
  }else{
    if( pKey2 ){
      res = pCur->jump_back((const char *)pKey2, nKey2);
    }else{
      res = pCur->jump_back();
    }
  }

  while( res ){
    const char *pKey; size_t nKey;
    const char *pVal; size_t nVal;
    pKey = pCur->get(&nKey, &pVal, &nVal);

    if( bReverse==0 && pKey2 ){
      res = memcmp(pKey, pKey2, MIN((size_t)nKey2, nKey));
      if( res>0 || (res==0 && (size_t)nKey2<nKey) ){
        delete [] pKey;
        break;
      }
    }else if( bReverse!=0 && pKey1 ){
      res = memcmp(pKey, pKey1, MIN((size_t)nKey1, nKey));
      if( res<0 || (res==0 && (size_t)nKey1>nKey) ){
        delete [] pKey;
        break;
      }
    }

    xCallback(pCtx, (void *)pKey, (int)nKey, (void *)pVal, (int)nVal);
    delete [] pKey;

    if( bReverse ){
      res = pCur->step_back();
    }else{
      res = pCur->step();
    }
  }

  delete pCur;
  return 0;
}
#endif /* HAVE_KYOTOCABINET */

#ifdef HAVE_MDB 
#include "lmdb.h"

extern "C" {
  struct MdbDb {
    TestDb base;
    MDB_env *env;
    MDB_dbi dbi;
  };
}

int test_mdb_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){
  MDB_txn *txn;
  MdbDb *pMdb;
  int rc;

  if( bClear ){
    char *zCmd = sqlite3_mprintf("rm -rf %s\n", zFilename);
    system(zCmd);
    sqlite3_free(zCmd);
  }

  pMdb = (MdbDb *)malloc(sizeof(MdbDb));
  memset(pMdb, 0, sizeof(MdbDb));

  rc = mdb_env_create(&pMdb->env);
  if( rc==0 ) rc = mdb_env_set_mapsize(pMdb->env, 1*1024*1024*1024);
  if( rc==0 ) rc = mdb_env_open(pMdb->env, zFilename, MDB_NOSYNC|MDB_NOSUBDIR, 0600);
  if( rc==0 ) rc = mdb_txn_begin(pMdb->env, NULL, 0, &txn);
  if( rc==0 ){
    rc = mdb_open(txn, NULL, 0, &pMdb->dbi);
    mdb_txn_commit(txn);
  }

  *ppDb = (TestDb *)pMdb;
  return rc;
}

int test_mdb_close(TestDb *pDb){
  MdbDb *pMdb = (MdbDb *)pDb;

  mdb_close(pMdb->env, pMdb->dbi);
  mdb_env_close(pMdb->env);
  free(pMdb);
  return 0;
}

int test_mdb_write(TestDb *pDb, void *pKey, int nKey, void *pVal, int nVal){
  int rc;
  MdbDb *pMdb = (MdbDb *)pDb;
  MDB_val val;
  MDB_val key;
  MDB_txn *txn;

  val.mv_size = nVal; 
  val.mv_data = pVal;
  key.mv_size = nKey; 
  key.mv_data = pKey;

  rc = mdb_txn_begin(pMdb->env, NULL, 0, &txn);
  if( rc==0 ){
    rc = mdb_put(txn, pMdb->dbi, &key, &val, 0);
    if( rc==0 ){
      rc = mdb_txn_commit(txn);
    }else{
      mdb_txn_abort(txn);
    }
  }
  
  return rc;
}

int test_mdb_delete(TestDb *pDb, void *pKey, int nKey){
  int rc;
  MdbDb *pMdb = (MdbDb *)pDb;
  MDB_val key;
  MDB_txn *txn;

  key.mv_size = nKey; 
  key.mv_data = pKey;
  rc = mdb_txn_begin(pMdb->env, NULL, 0, &txn);
  if( rc==0 ){
    rc = mdb_del(txn, pMdb->dbi, &key, 0);
    if( rc==0 ){
      rc = mdb_txn_commit(txn);
    }else{
      mdb_txn_abort(txn);
    }
  }
  
  return rc;
}

int test_mdb_fetch(
  TestDb *pDb, 
  void *pKey, 
  int nKey, 
  void **ppVal,
  int *pnVal
){
  int rc;
  MdbDb *pMdb = (MdbDb *)pDb;
  MDB_val key;
  MDB_txn *txn;

  key.mv_size = nKey;
  key.mv_data = pKey;

  rc = mdb_txn_begin(pMdb->env, NULL, MDB_RDONLY, &txn);
  if( rc==0 ){
    MDB_val val = {0, 0};
    rc = mdb_get(txn, pMdb->dbi, &key, &val);
    if( rc==MDB_NOTFOUND ){
      rc = 0;
      *ppVal = 0;
      *pnVal = -1;
    }else{
      *ppVal = val.mv_data;
      *pnVal = val.mv_size;
    }
    mdb_txn_commit(txn);
  }

  return rc;
}

int test_mdb_scan(
  TestDb *pDb,                    /* Database handle */
  void *pCtx,                     /* Context pointer to pass to xCallback */
  int bReverse,                   /* True for a reverse order scan */
  void *pKey1, int nKey1,         /* Start of search */
  void *pKey2, int nKey2,         /* End of search */
  void (*xCallback)(void *pCtx, void *pKey, int nKey, void *pVal, int nVal)
){
  MdbDb *pMdb = (MdbDb *)pDb;
  int rc;
  MDB_cursor_op op = bReverse ? MDB_PREV : MDB_NEXT;
  MDB_txn *txn;

  rc = mdb_txn_begin(pMdb->env, NULL, MDB_RDONLY, &txn);
  if( rc==0 ){
    MDB_cursor *csr;
    MDB_val key = {0, 0};
    MDB_val val = {0, 0};

    rc = mdb_cursor_open(txn, pMdb->dbi, &csr);
    if( rc==0 ){
      while( mdb_cursor_get(csr, &key, &val, op)==0 ){
        xCallback(pCtx, key.mv_data, key.mv_size, val.mv_data, val.mv_size);
      }
      mdb_cursor_close(csr);
    }
  }

  return rc;
}

#endif /* HAVE_MDB */
