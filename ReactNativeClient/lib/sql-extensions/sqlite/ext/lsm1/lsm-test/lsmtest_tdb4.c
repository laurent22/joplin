
/*
** This file contains the TestDb bt wrapper.
*/

#include "lsmtest_tdb.h"
#include "lsmtest.h"
#include <unistd.h>
#include "bt.h"

#include <pthread.h>

typedef struct BtDb BtDb;
typedef struct BtFile BtFile;

/* Background checkpointer interface (see implementations below). */
typedef struct bt_ckpter bt_ckpter;
static int bgc_attach(BtDb *pDb, const char*);
static int bgc_detach(BtDb *pDb);

/*
** Each database or log file opened by a database handle is wrapped by
** an object of the following type.
*/
struct BtFile {
  BtDb *pBt;                      /* Database handle that opened this file */
  bt_env *pVfs;                   /* Underlying VFS */
  bt_file *pFile;                 /* File handle belonging to underlying VFS */
  int nSectorSize;                /* Size of sectors in bytes */
  int nSector;                    /* Allocated size of nSector array */
  u8 **apSector;                  /* Original sector data */
};

/*
** nCrashSync:
**   If this value is non-zero, then a "crash-test" is running. If
**   nCrashSync==1, then the crash is simulated during the very next 
**   call to the xSync() VFS method (on either the db or log file).
**   If nCrashSync==2, the following call to xSync(), and so on.
**
** bCrash:
**   After a crash is simulated, this variable is set. Any subsequent
**   attempts to write to a file or modify the file system in any way 
**   fail once this is set. All the caller can do is close the connection.
**
** bFastInsert:
**   If this variable is set to true, then a BT_CONTROL_FAST_INSERT_OP
**   control is issued before each callto BtReplace() or BtCsrOpen().
*/
struct BtDb {
  TestDb base;                    /* Base class */
  bt_db *pBt;                     /* bt database handle */
  sqlite4_env *pEnv;              /* SQLite environment (for malloc/free) */
  bt_env *pVfs;                   /* Underlying VFS */
  int bFastInsert;                /* True to use fast-insert */

  /* Space for bt_fetch() results */
  u8 *aBuffer;                    /* Space to store results */
  int nBuffer;                    /* Allocated size of aBuffer[] in bytes */
  int nRef;

  /* Background checkpointer used by mt connections */
  bt_ckpter *pCkpter;

  /* Stuff used for crash test simulation */
  BtFile *apFile[2];              /* Database and log files used by pBt */
  bt_env env;                     /* Private VFS for this object */
  int nCrashSync;                 /* Number of syncs until crash (see above) */
  int bCrash;                     /* True once a crash has been simulated */
};

static int btVfsFullpath(
  sqlite4_env *pEnv, 
  bt_env *pVfs, 
  const char *z, 
  char **pzOut
){
  BtDb *pBt = (BtDb*)pVfs->pVfsCtx;
  if( pBt->bCrash ) return SQLITE4_IOERR;
  return pBt->pVfs->xFullpath(pEnv, pBt->pVfs, z, pzOut);
}

static int btVfsOpen(
  sqlite4_env *pEnv, 
  bt_env *pVfs, 
  const char *zFile, 
  int flags, bt_file **ppFile
){
  BtFile *p;
  BtDb *pBt = (BtDb*)pVfs->pVfsCtx;
  int rc;

  if( pBt->bCrash ) return SQLITE4_IOERR;

  p = (BtFile*)testMalloc(sizeof(BtFile));
  if( !p ) return SQLITE4_NOMEM;
  if( flags & BT_OPEN_DATABASE ){
    pBt->apFile[0] = p;
  }else if( flags & BT_OPEN_LOG ){
    pBt->apFile[1] = p;
  }
  if( (flags & BT_OPEN_SHARED)==0 ){
    p->pBt = pBt; 
  }
  p->pVfs = pBt->pVfs; 

  rc = pBt->pVfs->xOpen(pEnv, pVfs, zFile, flags, &p->pFile);
  if( rc!=SQLITE4_OK ){
    testFree(p);
    p = 0;
  }else{
    pBt->nRef++;
  }

  *ppFile = (bt_file*)p;
  return rc;
}

static int btVfsSize(bt_file *pFile, sqlite4_int64 *piRes){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  return p->pVfs->xSize(p->pFile, piRes);
}

static int btVfsRead(bt_file *pFile, sqlite4_int64 iOff, void *pBuf, int nBuf){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  return p->pVfs->xRead(p->pFile, iOff, pBuf, nBuf);
}

static int btFlushSectors(BtFile *p, int iFile){
  sqlite4_int64 iSz;
  int rc;
  int i;
  u8 *aTmp = 0;

  rc = p->pBt->pVfs->xSize(p->pFile, &iSz);
  for(i=0; rc==SQLITE4_OK && i<p->nSector; i++){
    if( p->pBt->bCrash && p->apSector[i] ){

      /* The system is simulating a crash. There are three choices for
      ** this sector:
      **
      **   1) Leave it as it is (simulating a successful write),
      **   2) Restore the original data (simulating a lost write),
      **   3) Populate the disk sector with garbage data.
      */
      sqlite4_int64 iSOff = p->nSectorSize*i;
      int nWrite = MIN(p->nSectorSize, iSz - iSOff);

      if( nWrite ){
        u8 *aWrite = 0;
        int iOpt = (testPrngValue(i) % 3) + 1;
        if( iOpt==1 ){
          aWrite = p->apSector[i];
        }else if( iOpt==3 ){
          if( aTmp==0 ) aTmp = testMalloc(p->nSectorSize);
          aWrite = aTmp;
          testPrngArray(i*13, (u32*)aWrite, nWrite/sizeof(u32));
        }

#if 0
fprintf(stderr, "handle sector %d of %s with %s\n", i, 
    iFile==0 ? "db" : "log",
    iOpt==1 ? "rollback" : iOpt==2 ? "write" : "omit"
);
fflush(stderr);
#endif

        if( aWrite ){
          rc = p->pBt->pVfs->xWrite(p->pFile, iSOff, aWrite, nWrite);
        }
      }
    }
    testFree(p->apSector[i]);
    p->apSector[i] = 0;
  }

  testFree(aTmp);
  return rc;
}

static int btSaveSectors(BtFile *p, sqlite4_int64 iOff, int nBuf){
  int rc;
  sqlite4_int64 iSz;              /* Size of file on disk */
  int iFirst;                     /* First sector affected */
  int iSector;                    /* Current sector */
  int iLast;                      /* Last sector affected */

  if( p->nSectorSize==0 ){
    p->nSectorSize = p->pBt->pVfs->xSectorSize(p->pFile);
    if( p->nSectorSize<512 ) p->nSectorSize = 512;
  }
  iLast = (iOff+nBuf-1) / p->nSectorSize;
  iFirst = iOff / p->nSectorSize;

  rc = p->pBt->pVfs->xSize(p->pFile, &iSz);
  for(iSector=iFirst; rc==SQLITE4_OK && iSector<=iLast; iSector++){
    int nRead;
    sqlite4_int64 iSOff = iSector * p->nSectorSize;
    u8 *aBuf = testMalloc(p->nSectorSize);
    nRead = MIN(p->nSectorSize, (iSz - iSOff));
    if( nRead>0 ){
      rc = p->pBt->pVfs->xRead(p->pFile, iSOff, aBuf, nRead);
    }

    while( rc==SQLITE4_OK && iSector>=p->nSector ){
      int nNew = p->nSector + 32;
      u8 **apNew = (u8**)testMalloc(nNew * sizeof(u8*));
      memcpy(apNew, p->apSector, p->nSector*sizeof(u8*));
      testFree(p->apSector);
      p->apSector = apNew;
      p->nSector = nNew;
    }

    p->apSector[iSector] = aBuf;
  }

  return rc;
}

static int btVfsWrite(bt_file *pFile, sqlite4_int64 iOff, void *pBuf, int nBuf){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  if( p->pBt && p->pBt->nCrashSync ){
    btSaveSectors(p, iOff, nBuf);
  }
  return p->pVfs->xWrite(p->pFile, iOff, pBuf, nBuf);
}

static int btVfsTruncate(bt_file *pFile, sqlite4_int64 iOff){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  return p->pVfs->xTruncate(p->pFile, iOff);
}

static int btVfsSync(bt_file *pFile){
  int rc = SQLITE4_OK;
  BtFile *p = (BtFile*)pFile;
  BtDb *pBt = p->pBt;

  if( pBt ){
    if( pBt->bCrash ) return SQLITE4_IOERR;
    if( pBt->nCrashSync ){
      pBt->nCrashSync--;
      pBt->bCrash = (pBt->nCrashSync==0);
      if( pBt->bCrash ){
        btFlushSectors(pBt->apFile[0], 0);
        btFlushSectors(pBt->apFile[1], 1);
        rc = SQLITE4_IOERR;
      }else{
        btFlushSectors(p, 0);
      }
    }
  }

  if( rc==SQLITE4_OK ){
    rc = p->pVfs->xSync(p->pFile);
  }
  return rc;
}

static int btVfsSectorSize(bt_file *pFile){
  BtFile *p = (BtFile*)pFile;
  return p->pVfs->xSectorSize(p->pFile);
}

static void btDeref(BtDb *p){
  p->nRef--;
  assert( p->nRef>=0 );
  if( p->nRef<=0 ) testFree(p);
}

static int btVfsClose(bt_file *pFile){
  BtFile *p = (BtFile*)pFile;
  BtDb *pBt = p->pBt;
  int rc;
  if( pBt ){
    btFlushSectors(p, 0);
    if( p==pBt->apFile[0] ) pBt->apFile[0] = 0;
    if( p==pBt->apFile[1] ) pBt->apFile[1] = 0;
  }
  testFree(p->apSector);
  rc = p->pVfs->xClose(p->pFile);
#if 0
  btDeref(p->pBt);
#endif
  testFree(p);
  return rc;
}

static int btVfsUnlink(sqlite4_env *pEnv, bt_env *pVfs, const char *zFile){
  BtDb *pBt = (BtDb*)pVfs->pVfsCtx;
  if( pBt->bCrash ) return SQLITE4_IOERR;
  return pBt->pVfs->xUnlink(pEnv, pBt->pVfs, zFile);
}

static int btVfsLock(bt_file *pFile, int iLock, int eType){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  return p->pVfs->xLock(p->pFile, iLock, eType);
}

static int btVfsTestLock(bt_file *pFile, int iLock, int nLock, int eType){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  return p->pVfs->xTestLock(p->pFile, iLock, nLock, eType);
}

static int btVfsShmMap(bt_file *pFile, int iChunk, int sz, void **ppOut){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  return p->pVfs->xShmMap(p->pFile, iChunk, sz, ppOut);
}

static void btVfsShmBarrier(bt_file *pFile){
  BtFile *p = (BtFile*)pFile;
  return p->pVfs->xShmBarrier(p->pFile);
}

static int btVfsShmUnmap(bt_file *pFile, int bDelete){
  BtFile *p = (BtFile*)pFile;
  if( p->pBt && p->pBt->bCrash ) return SQLITE4_IOERR;
  return p->pVfs->xShmUnmap(p->pFile, bDelete);
}

static int bt_close(TestDb *pTestDb){
  BtDb *p = (BtDb*)pTestDb;
  int rc = sqlite4BtClose(p->pBt);
  free(p->aBuffer);
  if( p->apFile[0] ) p->apFile[0]->pBt = 0;
  if( p->apFile[1] ) p->apFile[1]->pBt = 0;
  bgc_detach(p);
  testFree(p);
  return rc;
}

static int btMinTransaction(BtDb *p, int iMin, int *piLevel){
  int iLevel;
  int rc = SQLITE4_OK;

  iLevel = sqlite4BtTransactionLevel(p->pBt);
  if( iLevel<iMin ){ 
    rc = sqlite4BtBegin(p->pBt, iMin); 
    *piLevel = iLevel;
  }else{
    *piLevel = -1;
  }

  return rc;
}
static int btRestoreTransaction(BtDb *p, int iLevel, int rcin){
  int rc = rcin;
  if( iLevel>=0 ){
    if( rc==SQLITE4_OK ){
      rc = sqlite4BtCommit(p->pBt, iLevel);
    }else{
      sqlite4BtRollback(p->pBt, iLevel);
    }
    assert( iLevel==sqlite4BtTransactionLevel(p->pBt) );
  }
  return rc;
}

static int bt_write(TestDb *pTestDb, void *pK, int nK, void *pV, int nV){
  BtDb *p = (BtDb*)pTestDb;
  int iLevel;
  int rc;

  rc = btMinTransaction(p, 2, &iLevel);
  if( rc==SQLITE4_OK ){
    if( p->bFastInsert ) sqlite4BtControl(p->pBt, BT_CONTROL_FAST_INSERT_OP, 0);
    rc = sqlite4BtReplace(p->pBt, pK, nK, pV, nV);
    rc = btRestoreTransaction(p, iLevel, rc);
  }
  return rc;
}

static int bt_delete(TestDb *pTestDb, void *pK, int nK){
  return bt_write(pTestDb, pK, nK, 0, -1);
}

static int bt_delete_range(
  TestDb *pTestDb, 
  void *pKey1, int nKey1,
  void *pKey2, int nKey2
){
  BtDb *p = (BtDb*)pTestDb;
  bt_cursor *pCsr = 0;
  int rc = SQLITE4_OK;
  int iLevel;

  rc = btMinTransaction(p, 2, &iLevel);
  if( rc==SQLITE4_OK ){
    if( p->bFastInsert ) sqlite4BtControl(p->pBt, BT_CONTROL_FAST_INSERT_OP, 0);
    rc = sqlite4BtCsrOpen(p->pBt, 0, &pCsr);
  }
  while( rc==SQLITE4_OK ){
    const void *pK;
    int n;
    int nCmp;
    int res;

    rc = sqlite4BtCsrSeek(pCsr, pKey1, nKey1, BT_SEEK_GE);
    if( rc==SQLITE4_INEXACT ) rc = SQLITE4_OK;
    if( rc!=SQLITE4_OK ) break;

    rc = sqlite4BtCsrKey(pCsr, &pK, &n);
    if( rc!=SQLITE4_OK ) break;

    nCmp = MIN(n, nKey1);
    res = memcmp(pKey1, pK, nCmp);
    assert( res<0 || (res==0 && nKey1<=n) );
    if( res==0 && nKey1==n ){
      rc = sqlite4BtCsrNext(pCsr);
      if( rc!=SQLITE4_OK ) break;
      rc = sqlite4BtCsrKey(pCsr, &pK, &n);
      if( rc!=SQLITE4_OK ) break;
    }

    nCmp = MIN(n, nKey2);
    res = memcmp(pKey2, pK, nCmp);
    if( res<0 || (res==0 && nKey2<=n) ) break;
    
    rc = sqlite4BtDelete(pCsr);
  }
  if( rc==SQLITE4_NOTFOUND ) rc = SQLITE4_OK;

  sqlite4BtCsrClose(pCsr);

  rc = btRestoreTransaction(p, iLevel, rc);
  return rc;
}

static int bt_fetch(
  TestDb *pTestDb, 
  void *pK, int nK, 
  void **ppVal, int *pnVal
){
  BtDb *p = (BtDb*)pTestDb;
  bt_cursor *pCsr = 0;
  int iLevel;
  int rc = SQLITE4_OK;

  iLevel = sqlite4BtTransactionLevel(p->pBt);
  if( iLevel==0 ){ 
    rc = sqlite4BtBegin(p->pBt, 1); 
    if( rc!=SQLITE4_OK ) return rc;
  }

  if( p->bFastInsert ) sqlite4BtControl(p->pBt, BT_CONTROL_FAST_INSERT_OP, 0);
  rc = sqlite4BtCsrOpen(p->pBt, 0, &pCsr);
  if( rc==SQLITE4_OK ){
    rc = sqlite4BtCsrSeek(pCsr, pK, nK, BT_SEEK_EQ);
    if( rc==SQLITE4_OK ){
      const void *pV = 0;
      int nV = 0;
      rc = sqlite4BtCsrData(pCsr, 0, -1, &pV, &nV);
      if( rc==SQLITE4_OK ){
        if( nV>p->nBuffer ){
          free(p->aBuffer);
          p->aBuffer = (u8*)malloc(nV*2);
          p->nBuffer = nV*2;
        }
        memcpy(p->aBuffer, pV, nV);
        *pnVal = nV;
        *ppVal = (void*)(p->aBuffer);
      }

    }else if( rc==SQLITE4_INEXACT || rc==SQLITE4_NOTFOUND ){
      *ppVal = 0;
      *pnVal = -1;
      rc = SQLITE4_OK;
    }
    sqlite4BtCsrClose(pCsr);
  }

  if( iLevel==0 ) sqlite4BtCommit(p->pBt, 0); 
  return rc;
}

static int bt_scan(
  TestDb *pTestDb,
  void *pCtx,
  int bReverse,
  void *pFirst, int nFirst,
  void *pLast, int nLast,
  void (*xCallback)(void *, void *, int , void *, int)
){
  BtDb *p = (BtDb*)pTestDb;
  bt_cursor *pCsr = 0;
  int rc;
  int iLevel;

  rc = btMinTransaction(p, 1, &iLevel);

  if( rc==SQLITE4_OK ){
    if( p->bFastInsert ) sqlite4BtControl(p->pBt, BT_CONTROL_FAST_INSERT_OP, 0);
    rc = sqlite4BtCsrOpen(p->pBt, 0, &pCsr);
  }
  if( rc==SQLITE4_OK ){
    if( bReverse ){
      if( pLast ){
        rc = sqlite4BtCsrSeek(pCsr, pLast, nLast, BT_SEEK_LE);
      }else{
        rc = sqlite4BtCsrLast(pCsr);
      }
    }else{
      rc = sqlite4BtCsrSeek(pCsr, pFirst, nFirst, BT_SEEK_GE);
    }
    if( rc==SQLITE4_INEXACT ) rc = SQLITE4_OK;

    while( rc==SQLITE4_OK ){
      const void *pK = 0; int nK = 0;
      const void *pV = 0; int nV = 0;

      rc = sqlite4BtCsrKey(pCsr, &pK, &nK);
      if( rc==SQLITE4_OK ){
        rc = sqlite4BtCsrData(pCsr, 0, -1, &pV, &nV);
      }

      if( rc!=SQLITE4_OK ) break;
      if( bReverse ){
        if( pFirst ){
          int res;
          int nCmp = MIN(nK, nFirst);
          res = memcmp(pFirst, pK, nCmp);
          if( res>0 || (res==0 && nK<nFirst) ) break;
        }
      }else{
        if( pLast ){
          int res;
          int nCmp = MIN(nK, nLast);
          res = memcmp(pLast, pK, nCmp);
          if( res<0 || (res==0 && nK>nLast) ) break;
        }
      }

      xCallback(pCtx, (void*)pK, nK, (void*)pV, nV);
      if( bReverse ){
        rc = sqlite4BtCsrPrev(pCsr);
      }else{
        rc = sqlite4BtCsrNext(pCsr);
      }
    }
    if( rc==SQLITE4_NOTFOUND ) rc = SQLITE4_OK;

    sqlite4BtCsrClose(pCsr);
  }

  rc = btRestoreTransaction(p, iLevel, rc);
  return rc;
}

static int bt_begin(TestDb *pTestDb, int iLvl){
  BtDb *p = (BtDb*)pTestDb;
  int rc = sqlite4BtBegin(p->pBt, iLvl);
  return rc;
}

static int bt_commit(TestDb *pTestDb, int iLvl){
  BtDb *p = (BtDb*)pTestDb;
  int rc = sqlite4BtCommit(p->pBt, iLvl);
  return rc;
}

static int bt_rollback(TestDb *pTestDb, int iLvl){
  BtDb *p = (BtDb*)pTestDb;
  int rc = sqlite4BtRollback(p->pBt, iLvl);
  return rc;
}

static int testParseOption(
  const char **pzIn,              /* IN/OUT: pointer to next option */
  const char **pzOpt,             /* OUT: nul-terminated option name */
  const char **pzArg,             /* OUT: nul-terminated option argument */
  char *pSpace                    /* Temporary space for output params */
){
  const char *p = *pzIn;
  const char *pStart;
  int n;

  char *pOut = pSpace;

  while( *p==' ' ) p++;
  pStart = p;
  while( *p && *p!='=' ) p++;
  if( *p==0 ) return 1;

  n = (p - pStart);
  memcpy(pOut, pStart, n);
  *pzOpt = pOut;
  pOut += n;
  *pOut++ = '\0';

  p++;
  pStart = p;
  while( *p && *p!=' ' ) p++;
  n = (p - pStart);

  memcpy(pOut, pStart, n);
  *pzArg = pOut;
  pOut += n;
  *pOut++ = '\0';

  *pzIn = p;
  return 0;
}

static int testParseInt(const char *z, int *piVal){
  int i = 0;
  const char *p = z;

  while( *p>='0' && *p<='9' ){
    i = i*10 + (*p - '0');
    p++;
  }
  if( *p=='K' || *p=='k' ){
    i = i * 1024;
    p++;
  }else if( *p=='M' || *p=='m' ){
    i = i * 1024 * 1024;
    p++;
  }

  if( *p ) return SQLITE4_ERROR;
  *piVal = i;
  return SQLITE4_OK;
}

static int testBtConfigure(BtDb *pDb, const char *zCfg, int *pbMt){
  int rc = SQLITE4_OK;

  if( zCfg ){
    struct CfgParam {
      const char *zParam;
      int eParam;
    } aParam[] = {
      { "safety",         BT_CONTROL_SAFETY },
      { "autockpt",       BT_CONTROL_AUTOCKPT },
      { "multiproc",      BT_CONTROL_MULTIPROC },
      { "blksz",          BT_CONTROL_BLKSZ },
      { "pagesz",         BT_CONTROL_PAGESZ },
      { "mt",             -1 },
      { "fastinsert",     -2 },
      { 0, 0 }
    };
    const char *z = zCfg;
    int n = strlen(z);
    char *aSpace;
    const char *zOpt;
    const char *zArg;

    aSpace = (char*)testMalloc(n+2);
    while( rc==SQLITE4_OK && 0==testParseOption(&z, &zOpt, &zArg, aSpace) ){
      int i;
      int iVal;
      rc = testArgSelect(aParam, "param", zOpt, &i);
      if( rc!=SQLITE4_OK ) break;

      rc = testParseInt(zArg, &iVal);
      if( rc!=SQLITE4_OK ) break;

      switch( aParam[i].eParam ){
        case -1:
          *pbMt = iVal;
          break;
        case -2:
          pDb->bFastInsert = 1;
          break;
        default:
          rc = sqlite4BtControl(pDb->pBt, aParam[i].eParam, (void*)&iVal);
          break;
      }
    }
    testFree(aSpace);
  }

  return rc;
}


int test_bt_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){

  static const DatabaseMethods SqlMethods = {
    bt_close,
    bt_write,
    bt_delete,
    bt_delete_range,
    bt_fetch,
    bt_scan,
    bt_begin,
    bt_commit,
    bt_rollback
  };
  BtDb *p = 0;
  bt_db *pBt = 0;
  int rc;
  sqlite4_env *pEnv = sqlite4_env_default();

  if( bClear && zFilename && zFilename[0] ){
    char *zLog = sqlite3_mprintf("%s-wal", zFilename);
    unlink(zFilename);
    unlink(zLog);
    sqlite3_free(zLog);
  }
  
  rc = sqlite4BtNew(pEnv, 0, &pBt);
  if( rc==SQLITE4_OK ){
    int mt = 0;                   /* True for multi-threaded connection */

    p = (BtDb*)testMalloc(sizeof(BtDb));
    p->base.pMethods = &SqlMethods;
    p->pBt = pBt;
    p->pEnv = pEnv;
    p->nRef = 1;

    p->env.pVfsCtx = (void*)p;
    p->env.xFullpath = btVfsFullpath;
    p->env.xOpen = btVfsOpen;
    p->env.xSize = btVfsSize;
    p->env.xRead = btVfsRead;
    p->env.xWrite = btVfsWrite;
    p->env.xTruncate = btVfsTruncate;
    p->env.xSync = btVfsSync;
    p->env.xSectorSize = btVfsSectorSize;
    p->env.xClose = btVfsClose;
    p->env.xUnlink = btVfsUnlink;
    p->env.xLock = btVfsLock;
    p->env.xTestLock = btVfsTestLock;
    p->env.xShmMap = btVfsShmMap;
    p->env.xShmBarrier = btVfsShmBarrier;
    p->env.xShmUnmap = btVfsShmUnmap;

    sqlite4BtControl(pBt, BT_CONTROL_GETVFS, (void*)&p->pVfs);
    sqlite4BtControl(pBt, BT_CONTROL_SETVFS, (void*)&p->env);

    rc = testBtConfigure(p, zSpec, &mt);
    if( rc==SQLITE4_OK ){
      rc = sqlite4BtOpen(pBt, zFilename);
    }

    if( rc==SQLITE4_OK && mt ){
      int nAuto = 0;
      rc = bgc_attach(p, zSpec);
      sqlite4BtControl(pBt, BT_CONTROL_AUTOCKPT, (void*)&nAuto);
    }
  }

  if( rc!=SQLITE4_OK && p ){
    bt_close(&p->base);
  }

  *ppDb = &p->base;
  return rc;
}

int test_fbt_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){
  return test_bt_open("fast=1", zFilename, bClear, ppDb);
}

int test_fbts_open(
  const char *zSpec, 
  const char *zFilename, 
  int bClear, 
  TestDb **ppDb
){
  return test_bt_open("fast=1 blksz=32K pagesz=512", zFilename, bClear, ppDb);
}


void tdb_bt_prepare_sync_crash(TestDb *pTestDb, int iSync){
  BtDb *p = (BtDb*)pTestDb;
  assert( pTestDb->pMethods->xClose==bt_close );
  assert( p->bCrash==0 );
  p->nCrashSync = iSync;
}

bt_db *tdb_bt(TestDb *pDb){
  if( pDb->pMethods->xClose==bt_close ){
    return ((BtDb *)pDb)->pBt;
  }
  return 0;
}

/*************************************************************************
** Beginning of code for background checkpointer.
*/

struct bt_ckpter {
  sqlite4_buffer file;            /* File name */
  sqlite4_buffer spec;            /* Options */
  int nLogsize;                   /* Minimum log size to checkpoint */
  int nRef;                       /* Number of clients */

  int bDoWork;                    /* Set by client threads */
  pthread_t ckpter_thread;        /* Checkpointer thread */
  pthread_cond_t ckpter_cond;     /* Condition var the ckpter waits on */
  pthread_mutex_t ckpter_mutex;   /* Mutex used with ckpter_cond */

  bt_ckpter *pNext;               /* Next object in list at gBgc.pCkpter */
};

static struct GlobalBackgroundCheckpointer {
  bt_ckpter *pCkpter;             /* Linked list of checkpointers */
} gBgc;

static void *bgc_main(void *pArg){
  BtDb *pDb = 0;
  int rc;
  int mt;
  bt_ckpter *pCkpter = (bt_ckpter*)pArg;

  rc = test_bt_open("", (char*)pCkpter->file.p, 0, (TestDb**)&pDb);
  assert( rc==SQLITE4_OK );
  rc = testBtConfigure(pDb, (char*)pCkpter->spec.p, &mt);

  while( pCkpter->nRef>0 ){
    bt_db *db = pDb->pBt;
    int nLog = 0;

    sqlite4BtBegin(db, 1);
    sqlite4BtCommit(db, 0);
    sqlite4BtControl(db, BT_CONTROL_LOGSIZE, (void*)&nLog);

    if( nLog>=pCkpter->nLogsize ){
      int rc;
      bt_checkpoint ckpt;
      memset(&ckpt, 0, sizeof(bt_checkpoint));
      ckpt.nFrameBuffer = nLog/2;
      rc = sqlite4BtControl(db, BT_CONTROL_CHECKPOINT, (void*)&ckpt);
      assert( rc==SQLITE4_OK );
      sqlite4BtControl(db, BT_CONTROL_LOGSIZE, (void*)&nLog);
    }

    /* The thread will wake up when it is signaled either because another
    ** thread has created some work for this one or because the connection
    ** is being closed.  */
    pthread_mutex_lock(&pCkpter->ckpter_mutex);
    if( pCkpter->bDoWork==0 ){
      pthread_cond_wait(&pCkpter->ckpter_cond, &pCkpter->ckpter_mutex);
    }
    pCkpter->bDoWork = 0;
    pthread_mutex_unlock(&pCkpter->ckpter_mutex);
  }

  if( pDb ) bt_close((TestDb*)pDb);
  return 0;
}

static void bgc_logsize_cb(void *pCtx, int nLogsize){
  bt_ckpter *p = (bt_ckpter*)pCtx;
  if( nLogsize>=p->nLogsize ){
    pthread_mutex_lock(&p->ckpter_mutex);
    p->bDoWork = 1;
    pthread_cond_signal(&p->ckpter_cond);
    pthread_mutex_unlock(&p->ckpter_mutex);
  }
}

static int bgc_attach(BtDb *pDb, const char *zSpec){
  int rc;
  int n;
  bt_info info;
  bt_ckpter *pCkpter;

  /* Figure out the full path to the database opened by handle pDb. */
  info.eType = BT_INFO_FILENAME;
  info.pgno = 0;
  sqlite4_buffer_init(&info.output, 0);
  rc = sqlite4BtControl(pDb->pBt, BT_CONTROL_INFO, (void*)&info);
  if( rc!=SQLITE4_OK ) return rc;

  sqlite4_mutex_enter(sqlite4_mutex_alloc(pDb->pEnv, SQLITE4_MUTEX_STATIC_KV));

  /* Search for an existing bt_ckpter object. */
  n = info.output.n;
  for(pCkpter=gBgc.pCkpter; pCkpter; pCkpter=pCkpter->pNext){
    if( n==pCkpter->file.n && 0==memcmp(info.output.p, pCkpter->file.p, n) ){
      break;
    }
  }

  /* Failed to find a suitable checkpointer. Create a new one. */
  if( pCkpter==0 ){
    bt_logsizecb cb;

    pCkpter = testMalloc(sizeof(bt_ckpter));
    memcpy(&pCkpter->file, &info.output, sizeof(sqlite4_buffer));
    info.output.p = 0;
    pCkpter->pNext = gBgc.pCkpter;
    pCkpter->nLogsize = 1000;
    gBgc.pCkpter = pCkpter;
    pCkpter->nRef = 1;

    sqlite4_buffer_init(&pCkpter->spec, 0);
    rc = sqlite4_buffer_set(&pCkpter->spec, zSpec, strlen(zSpec)+1);
    assert( rc==SQLITE4_OK );

    /* Kick off the checkpointer thread. */
    if( rc==0 ) rc = pthread_cond_init(&pCkpter->ckpter_cond, 0);
    if( rc==0 ) rc = pthread_mutex_init(&pCkpter->ckpter_mutex, 0);
    if( rc==0 ){
      rc = pthread_create(&pCkpter->ckpter_thread, 0, bgc_main, (void*)pCkpter);
    }
    assert( rc==0 ); /* todo: Fix this */

    /* Set up the logsize callback for the client thread */
    cb.pCtx = (void*)pCkpter;
    cb.xLogsize = bgc_logsize_cb;
    sqlite4BtControl(pDb->pBt, BT_CONTROL_LOGSIZECB, (void*)&cb);
  }else{
    pCkpter->nRef++;
  }

  /* Assuming a checkpointer was encountered or effected, attach the 
  ** connection to it.  */
  if( pCkpter ){
    pDb->pCkpter = pCkpter;
  }

  sqlite4_mutex_leave(sqlite4_mutex_alloc(pDb->pEnv, SQLITE4_MUTEX_STATIC_KV));
  sqlite4_buffer_clear(&info.output);
  return rc;
}

static int bgc_detach(BtDb *pDb){
  int rc = SQLITE4_OK;
  bt_ckpter *pCkpter = pDb->pCkpter;
  if( pCkpter ){
    int bShutdown = 0;            /* True if this is the last reference */

    sqlite4_mutex_enter(sqlite4_mutex_alloc(pDb->pEnv,SQLITE4_MUTEX_STATIC_KV));
    pCkpter->nRef--;
    if( pCkpter->nRef==0 ){
      bt_ckpter **pp;

      *pp = pCkpter->pNext;
      for(pp=&gBgc.pCkpter; *pp!=pCkpter; pp=&((*pp)->pNext));
      bShutdown = 1;
    }
    sqlite4_mutex_leave(sqlite4_mutex_alloc(pDb->pEnv,SQLITE4_MUTEX_STATIC_KV));

    if( bShutdown ){
      void *pDummy;

      /* Signal the checkpointer thread. */
      pthread_mutex_lock(&pCkpter->ckpter_mutex);
      pCkpter->bDoWork = 1;
      pthread_cond_signal(&pCkpter->ckpter_cond);
      pthread_mutex_unlock(&pCkpter->ckpter_mutex);

      /* Join the checkpointer thread. */
      pthread_join(pCkpter->ckpter_thread, &pDummy);
      pthread_cond_destroy(&pCkpter->ckpter_cond);
      pthread_mutex_destroy(&pCkpter->ckpter_mutex);

      sqlite4_buffer_clear(&pCkpter->file);
      sqlite4_buffer_clear(&pCkpter->spec);
      testFree(pCkpter);
    }

    pDb->pCkpter = 0;
  }
  return rc;
}

/*
** End of background checkpointer.
*************************************************************************/
