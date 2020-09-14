/*
** 2012-01-23
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
** Utilities used to help multiple LSM clients to coexist within the
** same process space.
*/
#include "lsmInt.h"

/*
** Global data. All global variables used by code in this file are grouped
** into the following structure instance.
**
** pDatabase:
**   Linked list of all Database objects allocated within this process.
**   This list may not be traversed without holding the global mutex (see
**   functions enterGlobalMutex() and leaveGlobalMutex()).
*/
static struct SharedData {
  Database *pDatabase;            /* Linked list of all Database objects */
} gShared;

/*
** Database structure. There is one such structure for each distinct 
** database accessed by this process. They are stored in the singly linked 
** list starting at global variable gShared.pDatabase. Database objects are 
** reference counted. Once the number of connections to the associated
** database drops to zero, they are removed from the linked list and deleted.
**
** pFile:
**   In multi-process mode, this file descriptor is used to obtain locks 
**   and to access shared-memory. In single process mode, its only job is
**   to hold the exclusive lock on the file.
**   
*/
struct Database {
  /* Protected by the global mutex (enterGlobalMutex/leaveGlobalMutex): */
  char *zName;                    /* Canonical path to database file */
  int nName;                      /* strlen(zName) */
  int nDbRef;                     /* Number of associated lsm_db handles */
  Database *pDbNext;              /* Next Database structure in global list */

  /* Protected by the local mutex (pClientMutex) */
  int bReadonly;                  /* True if Database.pFile is read-only */
  int bMultiProc;                 /* True if running in multi-process mode */
  lsm_file *pFile;                /* Used for locks/shm in multi-proc mode */
  LsmFile *pLsmFile;              /* List of deferred closes */
  lsm_mutex *pClientMutex;        /* Protects the apShmChunk[] and pConn */
  int nShmChunk;                  /* Number of entries in apShmChunk[] array */
  void **apShmChunk;              /* Array of "shared" memory regions */
  lsm_db *pConn;                  /* List of connections to this db. */
};

/*
** Functions to enter and leave the global mutex. This mutex is used
** to protect the global linked-list headed at gShared.pDatabase.
*/
static int enterGlobalMutex(lsm_env *pEnv){
  lsm_mutex *p;
  int rc = lsmMutexStatic(pEnv, LSM_MUTEX_GLOBAL, &p);
  if( rc==LSM_OK ) lsmMutexEnter(pEnv, p);
  return rc;
}
static void leaveGlobalMutex(lsm_env *pEnv){
  lsm_mutex *p;
  lsmMutexStatic(pEnv, LSM_MUTEX_GLOBAL, &p);
  lsmMutexLeave(pEnv, p);
}

#ifdef LSM_DEBUG
static int holdingGlobalMutex(lsm_env *pEnv){
  lsm_mutex *p;
  lsmMutexStatic(pEnv, LSM_MUTEX_GLOBAL, &p);
  return lsmMutexHeld(pEnv, p);
}
#endif

#if 0
static void assertNotInFreelist(Freelist *p, int iBlk){
  int i; 
  for(i=0; i<p->nEntry; i++){
    assert( p->aEntry[i].iBlk!=iBlk );
  }
}
#else
# define assertNotInFreelist(x,y)
#endif

/*
** Append an entry to the free-list. If (iId==-1), this is a delete.
*/
int freelistAppend(lsm_db *db, u32 iBlk, i64 iId){
  lsm_env *pEnv = db->pEnv;
  Freelist *p;
  int i; 

  assert( iId==-1 || iId>=0 );
  p = db->bUseFreelist ? db->pFreelist : &db->pWorker->freelist;

  /* Extend the space allocated for the freelist, if required */
  assert( p->nAlloc>=p->nEntry );
  if( p->nAlloc==p->nEntry ){
    int nNew; 
    int nByte; 
    FreelistEntry *aNew;

    nNew = (p->nAlloc==0 ? 4 : p->nAlloc*2);
    nByte = sizeof(FreelistEntry) * nNew;
    aNew = (FreelistEntry *)lsmRealloc(pEnv, p->aEntry, nByte);
    if( !aNew ) return LSM_NOMEM_BKPT;
    p->nAlloc = nNew;
    p->aEntry = aNew;
  }

  for(i=0; i<p->nEntry; i++){
    assert( i==0 || p->aEntry[i].iBlk > p->aEntry[i-1].iBlk );
    if( p->aEntry[i].iBlk>=iBlk ) break;
  }

  if( i<p->nEntry && p->aEntry[i].iBlk==iBlk ){
    /* Clobber an existing entry */
    p->aEntry[i].iId = iId;
  }else{
    /* Insert a new entry into the list */
    int nByte = sizeof(FreelistEntry)*(p->nEntry-i);
    memmove(&p->aEntry[i+1], &p->aEntry[i], nByte);
    p->aEntry[i].iBlk = iBlk;
    p->aEntry[i].iId = iId;
    p->nEntry++;
  }

  return LSM_OK;
}

/*
** This function frees all resources held by the Database structure passed
** as the only argument.
*/
static void freeDatabase(lsm_env *pEnv, Database *p){
  assert( holdingGlobalMutex(pEnv) );
  if( p ){
    /* Free the mutexes */
    lsmMutexDel(pEnv, p->pClientMutex);

    if( p->pFile ){
      lsmEnvClose(pEnv, p->pFile);
    }

    /* Free the array of shm pointers */
    lsmFree(pEnv, p->apShmChunk);

    /* Free the memory allocated for the Database struct itself */
    lsmFree(pEnv, p);
  }
}

typedef struct DbTruncateCtx DbTruncateCtx;
struct DbTruncateCtx {
  int nBlock;
  i64 iInUse;
};

static int dbTruncateCb(void *pCtx, int iBlk, i64 iSnapshot){
  DbTruncateCtx *p = (DbTruncateCtx *)pCtx;
  if( iBlk!=p->nBlock || (p->iInUse>=0 && iSnapshot>=p->iInUse) ) return 1;
  p->nBlock--;
  return 0;
}

static int dbTruncate(lsm_db *pDb, i64 iInUse){
  int rc = LSM_OK;
#if 0
  int i;
  DbTruncateCtx ctx;

  assert( pDb->pWorker );
  ctx.nBlock = pDb->pWorker->nBlock;
  ctx.iInUse = iInUse;

  rc = lsmWalkFreelist(pDb, 1, dbTruncateCb, (void *)&ctx);
  for(i=ctx.nBlock+1; rc==LSM_OK && i<=pDb->pWorker->nBlock; i++){
    rc = freelistAppend(pDb, i, -1);
  }

  if( rc==LSM_OK ){
#ifdef LSM_LOG_FREELIST
    if( ctx.nBlock!=pDb->pWorker->nBlock ){
      lsmLogMessage(pDb, 0, 
          "dbTruncate(): truncated db to %d blocks",ctx.nBlock
      );
    }
#endif
    pDb->pWorker->nBlock = ctx.nBlock;
  }
#endif
  return rc;
}


/*
** This function is called during database shutdown (when the number of
** connections drops from one to zero). It truncates the database file
** to as small a size as possible without truncating away any blocks that
** contain data.
*/
static int dbTruncateFile(lsm_db *pDb){
  int rc;

  assert( pDb->pWorker==0 );
  assert( lsmShmAssertLock(pDb, LSM_LOCK_DMS1, LSM_LOCK_EXCL) );
  rc = lsmCheckpointLoadWorker(pDb);

  if( rc==LSM_OK ){
    DbTruncateCtx ctx;

    /* Walk the database free-block-list in reverse order. Set ctx.nBlock
    ** to the block number of the last block in the database that actually
    ** contains data. */
    ctx.nBlock = pDb->pWorker->nBlock;
    ctx.iInUse = -1;
    rc = lsmWalkFreelist(pDb, 1, dbTruncateCb, (void *)&ctx);

    /* If the last block that contains data is not already the last block in
    ** the database file, truncate the database file so that it is. */
    if( rc==LSM_OK ){
      rc = lsmFsTruncateDb(
          pDb->pFS, (i64)ctx.nBlock*lsmFsBlockSize(pDb->pFS)
      );
    }
  }

  lsmFreeSnapshot(pDb->pEnv, pDb->pWorker);
  pDb->pWorker = 0;
  return rc;
}

static void doDbDisconnect(lsm_db *pDb){
  int rc;

  if( pDb->bReadonly ){
    lsmShmLock(pDb, LSM_LOCK_DMS3, LSM_LOCK_UNLOCK, 0);
  }else{
    /* Block for an exclusive lock on DMS1. This lock serializes all calls
    ** to doDbConnect() and doDbDisconnect() across all processes.  */
    rc = lsmShmLock(pDb, LSM_LOCK_DMS1, LSM_LOCK_EXCL, 1);
    if( rc==LSM_OK ){

      lsmShmLock(pDb, LSM_LOCK_DMS2, LSM_LOCK_UNLOCK, 0);

      /* Try an exclusive lock on DMS2. If successful, this is the last
      ** connection to the database. In this case flush the contents of the
      ** in-memory tree to disk and write a checkpoint.  */
      rc = lsmShmTestLock(pDb, LSM_LOCK_DMS2, 1, LSM_LOCK_EXCL);
      if( rc==LSM_OK ){
        rc = lsmShmTestLock(pDb, LSM_LOCK_CHECKPOINTER, 1, LSM_LOCK_EXCL);
      }
      if( rc==LSM_OK ){
        int bReadonly = 0;        /* True if there exist read-only conns. */

        /* Flush the in-memory tree, if required. If there is data to flush,
        ** this will create a new client snapshot in Database.pClient. The
        ** checkpoint (serialization) of this snapshot may be written to disk
        ** by the following block.  
        **
        ** There is no need to take a WRITER lock here. That there are no 
        ** other locks on DMS2 guarantees that there are no other read-write
        ** connections at this time (and the lock on DMS1 guarantees that
        ** no new ones may appear).
        */
        rc = lsmTreeLoadHeader(pDb, 0);
        if( rc==LSM_OK && (lsmTreeHasOld(pDb) || lsmTreeSize(pDb)>0) ){
          rc = lsmFlushTreeToDisk(pDb);
        }

        /* Now check if there are any read-only connections. If there are,
        ** then do not truncate the db file or unlink the shared-memory 
        ** region.  */
        if( rc==LSM_OK ){
          rc = lsmShmTestLock(pDb, LSM_LOCK_DMS3, 1, LSM_LOCK_EXCL);
          if( rc==LSM_BUSY ){
            bReadonly = 1;
            rc = LSM_OK;
          }
        }

        /* Write a checkpoint to disk. */
        if( rc==LSM_OK ){
          rc = lsmCheckpointWrite(pDb, 0);
        }

        /* If the checkpoint was written successfully, delete the log file
        ** and, if possible, truncate the database file.  */
        if( rc==LSM_OK ){
          int bRotrans = 0;
          Database *p = pDb->pDatabase;

          /* The log file may only be deleted if there are no clients 
          ** read-only clients running rotrans transactions.  */
          rc = lsmDetectRoTrans(pDb, &bRotrans);
          if( rc==LSM_OK && bRotrans==0 ){
            lsmFsCloseAndDeleteLog(pDb->pFS);
          }

          /* The database may only be truncated if there exist no read-only
          ** clients - either connected or running rotrans transactions. */
          if( bReadonly==0 && bRotrans==0 ){
            lsmFsUnmap(pDb->pFS);
            dbTruncateFile(pDb);
            if( p->pFile && p->bMultiProc ){
              lsmEnvShmUnmap(pDb->pEnv, p->pFile, 1);
            }
          }
        }
      }
    }

    if( pDb->iRwclient>=0 ){
      lsmShmLock(pDb, LSM_LOCK_RWCLIENT(pDb->iRwclient), LSM_LOCK_UNLOCK, 0);
      pDb->iRwclient = -1;
    }

    lsmShmLock(pDb, LSM_LOCK_DMS1, LSM_LOCK_UNLOCK, 0);
  }
  pDb->pShmhdr = 0;
}

static int doDbConnect(lsm_db *pDb){
  const int nUsMax = 100000;      /* Max value for nUs */
  int nUs = 1000;                 /* us to wait between DMS1 attempts */
  int rc;

  /* Obtain a pointer to the shared-memory header */
  assert( pDb->pShmhdr==0 );
  assert( pDb->bReadonly==0 );

  /* Block for an exclusive lock on DMS1. This lock serializes all calls
  ** to doDbConnect() and doDbDisconnect() across all processes.  */
  while( 1 ){
    rc = lsmShmLock(pDb, LSM_LOCK_DMS1, LSM_LOCK_EXCL, 1);
    if( rc!=LSM_BUSY ) break;
    lsmEnvSleep(pDb->pEnv, nUs);
    nUs = nUs * 2;
    if( nUs>nUsMax ) nUs = nUsMax;
  }
  if( rc==LSM_OK ){
    rc = lsmShmCacheChunks(pDb, 1);
  }
  if( rc!=LSM_OK ) return rc;
  pDb->pShmhdr = (ShmHeader *)pDb->apShm[0];

  /* Try an exclusive lock on DMS2/DMS3. If successful, this is the first 
  ** and only connection to the database. In this case initialize the 
  ** shared-memory and run log file recovery.  */
  assert( LSM_LOCK_DMS3==1+LSM_LOCK_DMS2 );
  rc = lsmShmTestLock(pDb, LSM_LOCK_DMS2, 2, LSM_LOCK_EXCL);
  if( rc==LSM_OK ){
    memset(pDb->pShmhdr, 0, sizeof(ShmHeader));
    rc = lsmCheckpointRecover(pDb);
    if( rc==LSM_OK ){
      rc = lsmLogRecover(pDb);
    }
    if( rc==LSM_OK ){
      ShmHeader *pShm = pDb->pShmhdr;
      pShm->aReader[0].iLsmId = lsmCheckpointId(pShm->aSnap1, 0);
      pShm->aReader[0].iTreeId = pDb->treehdr.iUsedShmid;
    }
  }else if( rc==LSM_BUSY ){
    rc = LSM_OK;
  }

  /* Take a shared lock on DMS2. In multi-process mode this lock "cannot" 
  ** fail, as connections may only hold an exclusive lock on DMS2 if they 
  ** first hold an exclusive lock on DMS1. And this connection is currently 
  ** holding the exclusive lock on DSM1. 
  **
  ** However, if some other connection has the database open in single-process
  ** mode, this operation will fail. In this case, return the error to the
  ** caller - the attempt to connect to the db has failed.
  */
  if( rc==LSM_OK ){
    rc = lsmShmLock(pDb, LSM_LOCK_DMS2, LSM_LOCK_SHARED, 0);
  }

  /* If anything went wrong, unlock DMS2. Otherwise, try to take an exclusive
  ** lock on one of the LSM_LOCK_RWCLIENT() locks. Unlock DMS1 in any case. */
  if( rc!=LSM_OK ){
    pDb->pShmhdr = 0;
  }else{
    int i;
    for(i=0; i<LSM_LOCK_NRWCLIENT; i++){
      int rc2 = lsmShmLock(pDb, LSM_LOCK_RWCLIENT(i), LSM_LOCK_EXCL, 0);
      if( rc2==LSM_OK ) pDb->iRwclient = i;
      if( rc2!=LSM_BUSY ){
        rc = rc2;
        break;
      }
    }
  }
  lsmShmLock(pDb, LSM_LOCK_DMS1, LSM_LOCK_UNLOCK, 0);

  return rc;
}

static int dbOpenSharedFd(lsm_env *pEnv, Database *p, int bRoOk){
  int rc;

  rc = lsmEnvOpen(pEnv, p->zName, 0, &p->pFile);
  if( rc==LSM_IOERR && bRoOk ){
    rc = lsmEnvOpen(pEnv, p->zName, LSM_OPEN_READONLY, &p->pFile);
    p->bReadonly = 1;
  }

  return rc;
}

/*
** Return a reference to the shared Database handle for the database 
** identified by canonical path zName. If this is the first connection to
** the named database, a new Database object is allocated. Otherwise, a
** pointer to an existing object is returned.
**
** If successful, *ppDatabase is set to point to the shared Database 
** structure and LSM_OK returned. Otherwise, *ppDatabase is set to NULL
** and and LSM error code returned.
**
** Each successful call to this function should be (eventually) matched
** by a call to lsmDbDatabaseRelease().
*/
int lsmDbDatabaseConnect(
  lsm_db *pDb,                    /* Database handle */
  const char *zName               /* Full-path to db file */
){
  lsm_env *pEnv = pDb->pEnv;
  int rc;                         /* Return code */
  Database *p = 0;                /* Pointer returned via *ppDatabase */
  int nName = lsmStrlen(zName);

  assert( pDb->pDatabase==0 );
  rc = enterGlobalMutex(pEnv);
  if( rc==LSM_OK ){

    /* Search the global list for an existing object. TODO: Need something
    ** better than the memcmp() below to figure out if a given Database
    ** object represents the requested file.  */
    for(p=gShared.pDatabase; p; p=p->pDbNext){
      if( nName==p->nName && 0==memcmp(zName, p->zName, nName) ) break;
    }

    /* If no suitable Database object was found, allocate a new one. */
    if( p==0 ){
      p = (Database *)lsmMallocZeroRc(pEnv, sizeof(Database)+nName+1, &rc);

      /* If the allocation was successful, fill in other fields and
      ** allocate the client mutex. */ 
      if( rc==LSM_OK ){
        p->bMultiProc = pDb->bMultiProc;
        p->zName = (char *)&p[1];
        p->nName = nName;
        memcpy((void *)p->zName, zName, nName+1);
        rc = lsmMutexNew(pEnv, &p->pClientMutex);
      }

      /* If nothing has gone wrong so far, open the shared fd. And if that
      ** succeeds and this connection requested single-process mode, 
      ** attempt to take the exclusive lock on DMS2.  */
      if( rc==LSM_OK ){
        int bReadonly = (pDb->bReadonly && pDb->bMultiProc);
        rc = dbOpenSharedFd(pDb->pEnv, p, bReadonly);
      }

      if( rc==LSM_OK && p->bMultiProc==0 ){
        /* Hold an exclusive lock DMS1 while grabbing DMS2. This ensures
        ** that any ongoing call to doDbDisconnect() (even one in another
        ** process) is finished before proceeding.  */
        assert( p->bReadonly==0 );
        rc = lsmEnvLock(pDb->pEnv, p->pFile, LSM_LOCK_DMS1, LSM_LOCK_EXCL);
        if( rc==LSM_OK ){
          rc = lsmEnvLock(pDb->pEnv, p->pFile, LSM_LOCK_DMS2, LSM_LOCK_EXCL);
          lsmEnvLock(pDb->pEnv, p->pFile, LSM_LOCK_DMS1, LSM_LOCK_UNLOCK);
        }
      }

      if( rc==LSM_OK ){
        p->pDbNext = gShared.pDatabase;
        gShared.pDatabase = p;
      }else{
        freeDatabase(pEnv, p);
        p = 0;
      }
    }

    if( p ){
      p->nDbRef++;
    }
    leaveGlobalMutex(pEnv);

    if( p ){
      lsmMutexEnter(pDb->pEnv, p->pClientMutex);
      pDb->pNext = p->pConn;
      p->pConn = pDb;
      lsmMutexLeave(pDb->pEnv, p->pClientMutex);
    }
  }

  pDb->pDatabase = p;
  if( rc==LSM_OK ){
    assert( p );
    rc = lsmFsOpen(pDb, zName, p->bReadonly);
  }

  /* If the db handle is read-write, then connect to the system now. Run
  ** recovery as necessary. Or, if this is a read-only database handle,
  ** defer attempting to connect to the system until a read-transaction
  ** is opened.  */
  if( rc==LSM_OK ){
    rc = lsmFsConfigure(pDb);
  }
  if( rc==LSM_OK && pDb->bReadonly==0 ){
    rc = doDbConnect(pDb);
  }

  return rc;
}

static void dbDeferClose(lsm_db *pDb){
  if( pDb->pFS ){
    LsmFile *pLsmFile;
    Database *p = pDb->pDatabase;
    pLsmFile = lsmFsDeferClose(pDb->pFS);
    pLsmFile->pNext = p->pLsmFile;
    p->pLsmFile = pLsmFile;
  }
}

LsmFile *lsmDbRecycleFd(lsm_db *db){
  LsmFile *pRet;
  Database *p = db->pDatabase;
  lsmMutexEnter(db->pEnv, p->pClientMutex);
  if( (pRet = p->pLsmFile)!=0 ){
    p->pLsmFile = pRet->pNext;
  }
  lsmMutexLeave(db->pEnv, p->pClientMutex);
  return pRet;
}

/*
** Release a reference to a Database object obtained from 
** lsmDbDatabaseConnect(). There should be exactly one call to this function 
** for each successful call to Find().
*/
void lsmDbDatabaseRelease(lsm_db *pDb){
  Database *p = pDb->pDatabase;
  if( p ){
    lsm_db **ppDb;

    if( pDb->pShmhdr ){
      doDbDisconnect(pDb);
    }

    lsmFsUnmap(pDb->pFS);
    lsmMutexEnter(pDb->pEnv, p->pClientMutex);
    for(ppDb=&p->pConn; *ppDb!=pDb; ppDb=&((*ppDb)->pNext));
    *ppDb = pDb->pNext;
    dbDeferClose(pDb);
    lsmMutexLeave(pDb->pEnv, p->pClientMutex);

    enterGlobalMutex(pDb->pEnv);
    p->nDbRef--;
    if( p->nDbRef==0 ){
      LsmFile *pIter;
      LsmFile *pNext;
      Database **pp;

      /* Remove the Database structure from the linked list. */
      for(pp=&gShared.pDatabase; *pp!=p; pp=&((*pp)->pDbNext));
      *pp = p->pDbNext;

      /* If they were allocated from the heap, free the shared memory chunks */
      if( p->bMultiProc==0 ){
        int i;
        for(i=0; i<p->nShmChunk; i++){
          lsmFree(pDb->pEnv, p->apShmChunk[i]);
        }
      }

      /* Close any outstanding file descriptors */
      for(pIter=p->pLsmFile; pIter; pIter=pNext){
        pNext = pIter->pNext;
        lsmEnvClose(pDb->pEnv, pIter->pFile);
        lsmFree(pDb->pEnv, pIter);
      }
      freeDatabase(pDb->pEnv, p);
    }
    leaveGlobalMutex(pDb->pEnv);
  }
}

Level *lsmDbSnapshotLevel(Snapshot *pSnapshot){
  return pSnapshot->pLevel;
}

void lsmDbSnapshotSetLevel(Snapshot *pSnap, Level *pLevel){
  pSnap->pLevel = pLevel;
}

/* TODO: Shuffle things around to get rid of this */
static int firstSnapshotInUse(lsm_db *, i64 *);

/* 
** Context object used by the lsmWalkFreelist() utility. 
*/
typedef struct WalkFreelistCtx WalkFreelistCtx;
struct WalkFreelistCtx {
  lsm_db *pDb;
  int bReverse;
  Freelist *pFreelist;
  int iFree;
  int (*xUsr)(void *, int, i64);  /* User callback function */
  void *pUsrctx;                  /* User callback context */
  int bDone;                      /* Set to true after xUsr() returns true */
};

/* 
** Callback used by lsmWalkFreelist().
*/
static int walkFreelistCb(void *pCtx, int iBlk, i64 iSnapshot){
  WalkFreelistCtx *p = (WalkFreelistCtx *)pCtx;
  const int iDir = (p->bReverse ? -1 : 1);
  Freelist *pFree = p->pFreelist;

  assert( p->bDone==0 );
  assert( iBlk>=0 );
  if( pFree ){
    while( (p->iFree < pFree->nEntry) && p->iFree>=0 ){
      FreelistEntry *pEntry = &pFree->aEntry[p->iFree];
      if( (p->bReverse==0 && pEntry->iBlk>(u32)iBlk)
       || (p->bReverse!=0 && pEntry->iBlk<(u32)iBlk)
      ){
        break;
      }else{
        p->iFree += iDir;
        if( pEntry->iId>=0 
            && p->xUsr(p->pUsrctx, pEntry->iBlk, pEntry->iId) 
          ){
          p->bDone = 1;
          return 1;
        }
        if( pEntry->iBlk==(u32)iBlk ) return 0;
      }
    }
  }

  if( p->xUsr(p->pUsrctx, iBlk, iSnapshot) ){
    p->bDone = 1;
    return 1;
  }
  return 0;
}

/*
** The database handle passed as the first argument must be the worker
** connection. This function iterates through the contents of the current
** free block list, invoking the supplied callback once for each list
** element.
**
** The difference between this function and lsmSortedWalkFreelist() is
** that lsmSortedWalkFreelist() only considers those free-list elements
** stored within the LSM. This function also merges in any in-memory 
** elements.
*/
int lsmWalkFreelist(
  lsm_db *pDb,                    /* Database handle (must be worker) */
  int bReverse,                   /* True to iterate from largest to smallest */
  int (*x)(void *, int, i64),     /* Callback function */
  void *pCtx                      /* First argument to pass to callback */
){
  const int iDir = (bReverse ? -1 : 1);
  int rc;
  int iCtx;

  WalkFreelistCtx ctx[2];

  ctx[0].pDb = pDb;
  ctx[0].bReverse = bReverse;
  ctx[0].pFreelist = &pDb->pWorker->freelist;
  if( ctx[0].pFreelist && bReverse ){
    ctx[0].iFree = ctx[0].pFreelist->nEntry-1;
  }else{
    ctx[0].iFree = 0;
  }
  ctx[0].xUsr = walkFreelistCb;
  ctx[0].pUsrctx = (void *)&ctx[1];
  ctx[0].bDone = 0;

  ctx[1].pDb = pDb;
  ctx[1].bReverse = bReverse;
  ctx[1].pFreelist = pDb->pFreelist;
  if( ctx[1].pFreelist && bReverse ){
    ctx[1].iFree = ctx[1].pFreelist->nEntry-1;
  }else{
    ctx[1].iFree = 0;
  }
  ctx[1].xUsr = x;
  ctx[1].pUsrctx = pCtx;
  ctx[1].bDone = 0;

  rc = lsmSortedWalkFreelist(pDb, bReverse, walkFreelistCb, (void *)&ctx[0]);

  if( ctx[0].bDone==0 ){
    for(iCtx=0; iCtx<2; iCtx++){
      int i;
      WalkFreelistCtx *p = &ctx[iCtx];
      for(i=p->iFree; 
          p->pFreelist && rc==LSM_OK && i<p->pFreelist->nEntry && i>=0;
          i += iDir
         ){
        FreelistEntry *pEntry = &p->pFreelist->aEntry[i];
        if( pEntry->iId>=0 && p->xUsr(p->pUsrctx, pEntry->iBlk, pEntry->iId) ){
          return LSM_OK;
        }
      }
    }
  }

  return rc;
}


typedef struct FindFreeblockCtx FindFreeblockCtx;
struct FindFreeblockCtx {
  i64 iInUse;
  int iRet;
  int bNotOne;
};

static int findFreeblockCb(void *pCtx, int iBlk, i64 iSnapshot){
  FindFreeblockCtx *p = (FindFreeblockCtx *)pCtx;
  if( iSnapshot<p->iInUse && (iBlk!=1 || p->bNotOne==0) ){
    p->iRet = iBlk;
    return 1;
  }
  return 0;
}

static int findFreeblock(lsm_db *pDb, i64 iInUse, int bNotOne, int *piRet){
  int rc;                         /* Return code */
  FindFreeblockCtx ctx;           /* Context object */

  ctx.iInUse = iInUse;
  ctx.iRet = 0;
  ctx.bNotOne = bNotOne;
  rc = lsmWalkFreelist(pDb, 0, findFreeblockCb, (void *)&ctx);
  *piRet = ctx.iRet;

  return rc;
}

/*
** Allocate a new database file block to write data to, either by extending
** the database file or by recycling a free-list entry. The worker snapshot 
** must be held in order to call this function.
**
** If successful, *piBlk is set to the block number allocated and LSM_OK is
** returned. Otherwise, *piBlk is zeroed and an lsm error code returned.
*/
int lsmBlockAllocate(lsm_db *pDb, int iBefore, int *piBlk){
  Snapshot *p = pDb->pWorker;
  int iRet = 0;                   /* Block number of allocated block */
  int rc = LSM_OK;
  i64 iInUse = 0;                 /* Snapshot id still in use */
  i64 iSynced = 0;                /* Snapshot id synced to disk */

  assert( p );

#ifdef LSM_LOG_FREELIST
  {
    static int nCall = 0;
    char *zFree = 0;
    nCall++;
    rc = lsmInfoFreelist(pDb, &zFree);
    if( rc!=LSM_OK ) return rc;
    lsmLogMessage(pDb, 0, "lsmBlockAllocate(): %d freelist: %s", nCall, zFree);
    lsmFree(pDb->pEnv, zFree);
  }
#endif

  /* Set iInUse to the smallest snapshot id that is either:
  **
  **   * Currently in use by a database client,
  **   * May be used by a database client in the future, or
  **   * Is the most recently checkpointed snapshot (i.e. the one that will
  **     be used following recovery if a failure occurs at this point).
  */
  rc = lsmCheckpointSynced(pDb, &iSynced, 0, 0);
  if( rc==LSM_OK && iSynced==0 ) iSynced = p->iId;
  iInUse = iSynced;
  if( rc==LSM_OK && pDb->iReader>=0 ){
    assert( pDb->pClient );
    iInUse = LSM_MIN(iInUse, pDb->pClient->iId);
  }
  if( rc==LSM_OK ) rc = firstSnapshotInUse(pDb, &iInUse);

#ifdef LSM_LOG_FREELIST
  {
    lsmLogMessage(pDb, 0, "lsmBlockAllocate(): "
        "snapshot-in-use: %lld (iSynced=%lld) (client-id=%lld)", 
        iInUse, iSynced, (pDb->iReader>=0 ? pDb->pClient->iId : 0)
    );
  }
#endif


  /* Unless there exists a read-only transaction (which prevents us from
  ** recycling any blocks regardless, query the free block list for a 
  ** suitable block to reuse. 
  **
  ** It might seem more natural to check for a read-only transaction at
  ** the start of this function. However, it is better do wait until after
  ** the call to lsmCheckpointSynced() to do so.
  */
  if( rc==LSM_OK ){
    int bRotrans;
    rc = lsmDetectRoTrans(pDb, &bRotrans);

    if( rc==LSM_OK && bRotrans==0 ){
      rc = findFreeblock(pDb, iInUse, (iBefore>0), &iRet);
    }
  }

  if( iBefore>0 && (iRet<=0 || iRet>=iBefore) ){
    iRet = 0;

  }else if( rc==LSM_OK ){
    /* If a block was found in the free block list, use it and remove it from 
    ** the list. Otherwise, if no suitable block was found, allocate one from
    ** the end of the file.  */
    if( iRet>0 ){
#ifdef LSM_LOG_FREELIST
      lsmLogMessage(pDb, 0, 
          "reusing block %d (snapshot-in-use=%lld)", iRet, iInUse);
#endif
      rc = freelistAppend(pDb, iRet, -1);
      if( rc==LSM_OK ){
        rc = dbTruncate(pDb, iInUse);
      }
    }else{
      iRet = ++(p->nBlock);
#ifdef LSM_LOG_FREELIST
      lsmLogMessage(pDb, 0, "extending file to %d blocks", iRet);
#endif
    }
  }

  assert( iBefore>0 || iRet>0 || rc!=LSM_OK );
  *piBlk = iRet;
  return rc;
}

/*
** Free a database block. The worker snapshot must be held in order to call 
** this function.
**
** If successful, LSM_OK is returned. Otherwise, an lsm error code (e.g. 
** LSM_NOMEM).
*/
int lsmBlockFree(lsm_db *pDb, int iBlk){
  Snapshot *p = pDb->pWorker;
  assert( lsmShmAssertWorker(pDb) );

#ifdef LSM_LOG_FREELIST
  lsmLogMessage(pDb, LSM_OK, "lsmBlockFree(): Free block %d", iBlk);
#endif

  return freelistAppend(pDb, iBlk, p->iId);
}

/*
** Refree a database block. The worker snapshot must be held in order to call 
** this function.
**
** Refreeing is required when a block is allocated using lsmBlockAllocate()
** but then not used. This function is used to push the block back onto
** the freelist. Refreeing a block is different from freeing is, as a refreed
** block may be reused immediately. Whereas a freed block can not be reused 
** until (at least) after the next checkpoint.
*/
int lsmBlockRefree(lsm_db *pDb, int iBlk){
  int rc = LSM_OK;                /* Return code */

#ifdef LSM_LOG_FREELIST
  lsmLogMessage(pDb, LSM_OK, "lsmBlockRefree(): Refree block %d", iBlk);
#endif

  rc = freelistAppend(pDb, iBlk, 0);
  return rc;
}

/*
** If required, copy a database checkpoint from shared memory into the
** database itself.
**
** The WORKER lock must not be held when this is called. This is because
** this function may indirectly call fsync(). And the WORKER lock should
** not be held that long (in case it is required by a client flushing an
** in-memory tree to disk).
*/
int lsmCheckpointWrite(lsm_db *pDb, u32 *pnWrite){
  int rc;                         /* Return Code */
  u32 nWrite = 0;

  assert( pDb->pWorker==0 );
  assert( 1 || pDb->pClient==0 );
  assert( lsmShmAssertLock(pDb, LSM_LOCK_WORKER, LSM_LOCK_UNLOCK) );

  rc = lsmShmLock(pDb, LSM_LOCK_CHECKPOINTER, LSM_LOCK_EXCL, 0);
  if( rc!=LSM_OK ) return rc;

  rc = lsmCheckpointLoad(pDb, 0);
  if( rc==LSM_OK ){
    int nBlock = lsmCheckpointNBlock(pDb->aSnapshot);
    ShmHeader *pShm = pDb->pShmhdr;
    int bDone = 0;                /* True if checkpoint is already stored */

    /* Check if this checkpoint has already been written to the database
    ** file. If so, set variable bDone to true.  */
    if( pShm->iMetaPage ){
      MetaPage *pPg;              /* Meta page */
      u8 *aData;                  /* Meta-page data buffer */
      int nData;                  /* Size of aData[] in bytes */
      i64 iCkpt;                  /* Id of checkpoint just loaded */
      i64 iDisk = 0;              /* Id of checkpoint already stored in db */
      iCkpt = lsmCheckpointId(pDb->aSnapshot, 0);
      rc = lsmFsMetaPageGet(pDb->pFS, 0, pShm->iMetaPage, &pPg);
      if( rc==LSM_OK ){
        aData = lsmFsMetaPageData(pPg, &nData);
        iDisk = lsmCheckpointId((u32 *)aData, 1);
        nWrite = lsmCheckpointNWrite((u32 *)aData, 1);
        lsmFsMetaPageRelease(pPg);
      }
      bDone = (iDisk>=iCkpt);
    }

    if( rc==LSM_OK && bDone==0 ){
      int iMeta = (pShm->iMetaPage % 2) + 1;
      if( pDb->eSafety!=LSM_SAFETY_OFF ){
        rc = lsmFsSyncDb(pDb->pFS, nBlock);
      }
      if( rc==LSM_OK ) rc = lsmCheckpointStore(pDb, iMeta);
      if( rc==LSM_OK && pDb->eSafety!=LSM_SAFETY_OFF){
        rc = lsmFsSyncDb(pDb->pFS, 0);
      }
      if( rc==LSM_OK ){
        pShm->iMetaPage = iMeta;
        nWrite = lsmCheckpointNWrite(pDb->aSnapshot, 0) - nWrite;
      }
#ifdef LSM_LOG_WORK
      lsmLogMessage(pDb, 0, "finish checkpoint %d", 
          (int)lsmCheckpointId(pDb->aSnapshot, 0)
      );
#endif
    }
  }

  lsmShmLock(pDb, LSM_LOCK_CHECKPOINTER, LSM_LOCK_UNLOCK, 0);
  if( pnWrite && rc==LSM_OK ) *pnWrite = nWrite;
  return rc;
}

int lsmBeginWork(lsm_db *pDb){
  int rc;

  /* Attempt to take the WORKER lock */
  rc = lsmShmLock(pDb, LSM_LOCK_WORKER, LSM_LOCK_EXCL, 0);

  /* Deserialize the current worker snapshot */
  if( rc==LSM_OK ){
    rc = lsmCheckpointLoadWorker(pDb);
  }
  return rc;
}

void lsmFreeSnapshot(lsm_env *pEnv, Snapshot *p){
  if( p ){
    lsmSortedFreeLevel(pEnv, p->pLevel);
    lsmFree(pEnv, p->freelist.aEntry);
    lsmFree(pEnv, p->redirect.a);
    lsmFree(pEnv, p);
  }
}

/*
** Attempt to populate one of the read-lock slots to contain lock values
** iLsm/iShm. Or, if such a slot exists already, this function is a no-op.
**
** It is not an error if no slot can be populated because the write-lock
** cannot be obtained. If any other error occurs, return an LSM error code.
** Otherwise, LSM_OK.
**
** This function is called at various points to try to ensure that there
** always exists at least one read-lock slot that can be used by a read-only
** client. And so that, in the usual case, there is an "exact match" available
** whenever a read transaction is opened by any client. At present this
** function is called when:
**
**    * A write transaction that called lsmTreeDiscardOld() is committed, and
**    * Whenever the working snapshot is updated (i.e. lsmFinishWork()).
*/
static int dbSetReadLock(lsm_db *db, i64 iLsm, u32 iShm){
  int rc = LSM_OK;
  ShmHeader *pShm = db->pShmhdr;
  int i;

  /* Check if there is already a slot containing the required values. */
  for(i=0; i<LSM_LOCK_NREADER; i++){
    ShmReader *p = &pShm->aReader[i];
    if( p->iLsmId==iLsm && p->iTreeId==iShm ) return LSM_OK;
  }

  /* Iterate through all read-lock slots, attempting to take a write-lock
  ** on each of them. If a write-lock succeeds, populate the locked slot
  ** with the required values and break out of the loop.  */
  for(i=0; rc==LSM_OK && i<LSM_LOCK_NREADER; i++){
    rc = lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_EXCL, 0);
    if( rc==LSM_BUSY ){
      rc = LSM_OK;
    }else{
      ShmReader *p = &pShm->aReader[i];
      p->iLsmId = iLsm;
      p->iTreeId = iShm;
      lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_UNLOCK, 0);
      break;
    }
  }

  return rc;
}

/*
** Release the read-lock currently held by connection db.
*/
int dbReleaseReadlock(lsm_db *db){
  int rc = LSM_OK;
  if( db->iReader>=0 ){
    rc = lsmShmLock(db, LSM_LOCK_READER(db->iReader), LSM_LOCK_UNLOCK, 0);
    db->iReader = -1;
  }
  db->bRoTrans = 0;
  return rc;
}


/*
** Argument bFlush is true if the contents of the in-memory tree has just
** been flushed to disk. The significance of this is that once the snapshot
** created to hold the updated state of the database is synced to disk, log
** file space can be recycled.
*/
void lsmFinishWork(lsm_db *pDb, int bFlush, int *pRc){
  int rc = *pRc;
  assert( rc!=0 || pDb->pWorker );
  if( pDb->pWorker ){
    /* If no error has occurred, serialize the worker snapshot and write
    ** it to shared memory.  */
    if( rc==LSM_OK ){
      rc = lsmSaveWorker(pDb, bFlush);
    }

    /* Assuming no error has occurred, update a read lock slot with the
    ** new snapshot id (see comments above function dbSetReadLock()).  */
    if( rc==LSM_OK ){
      if( pDb->iReader<0 ){
        rc = lsmTreeLoadHeader(pDb, 0);
      }
      if( rc==LSM_OK ){
        rc = dbSetReadLock(pDb, pDb->pWorker->iId, pDb->treehdr.iUsedShmid);
      }
    }

    /* Free the snapshot object. */
    lsmFreeSnapshot(pDb->pEnv, pDb->pWorker);
    pDb->pWorker = 0;
  }

  lsmShmLock(pDb, LSM_LOCK_WORKER, LSM_LOCK_UNLOCK, 0);
  *pRc = rc;
}

/*
** Called when recovery is finished.
*/
int lsmFinishRecovery(lsm_db *pDb){
  lsmTreeEndTransaction(pDb, 1);
  return LSM_OK;
}

/*
** Check if the currently configured compression functions
** (LSM_CONFIG_SET_COMPRESSION) are compatible with a database that has its
** compression id set to iReq. Compression routines are compatible if iReq
** is zero (indicating the database is empty), or if it is equal to the 
** compression id of the configured compression routines.
**
** If the check shows that the current compression are incompatible and there
** is a compression factory registered, give it a chance to install new
** compression routines.
**
** If, after any registered factory is invoked, the compression functions
** are still incompatible, return LSM_MISMATCH. Otherwise, LSM_OK.
*/
int lsmCheckCompressionId(lsm_db *pDb, u32 iReq){
  if( iReq!=LSM_COMPRESSION_EMPTY && pDb->compress.iId!=iReq ){
    if( pDb->factory.xFactory ){
      pDb->bInFactory = 1;
      pDb->factory.xFactory(pDb->factory.pCtx, pDb, iReq);
      pDb->bInFactory = 0;
    }
    if( pDb->compress.iId!=iReq ){
      /* Incompatible */
      return LSM_MISMATCH;
    }
  }
  /* Compatible */
  return LSM_OK;
}

/*
** Begin a read transaction. This function is a no-op if the connection
** passed as the only argument already has an open read transaction.
*/
int lsmBeginReadTrans(lsm_db *pDb){
  const int MAX_READLOCK_ATTEMPTS = 10;
  const int nMaxAttempt = (pDb->bRoTrans ? 1 : MAX_READLOCK_ATTEMPTS);

  int rc = LSM_OK;                /* Return code */
  int iAttempt = 0;

  assert( pDb->pWorker==0 );

  while( rc==LSM_OK && pDb->iReader<0 && (iAttempt++)<nMaxAttempt ){
    int iTreehdr = 0;
    int iSnap = 0;
    assert( pDb->pCsr==0 && pDb->nTransOpen==0 );

    /* Load the in-memory tree header. */
    rc = lsmTreeLoadHeader(pDb, &iTreehdr);

    /* Load the database snapshot */
    if( rc==LSM_OK ){
      if( lsmCheckpointClientCacheOk(pDb)==0 ){
        lsmFreeSnapshot(pDb->pEnv, pDb->pClient);
        pDb->pClient = 0;
        lsmMCursorFreeCache(pDb);
        lsmFsPurgeCache(pDb->pFS);
        rc = lsmCheckpointLoad(pDb, &iSnap);
      }else{
        iSnap = 1;
      }
    }

    /* Take a read-lock on the tree and snapshot just loaded. Then check
    ** that the shared-memory still contains the same values. If so, proceed.
    ** Otherwise, relinquish the read-lock and retry the whole procedure
    ** (starting with loading the in-memory tree header).  */
    if( rc==LSM_OK ){
      u32 iShmMax = pDb->treehdr.iUsedShmid;
      u32 iShmMin = pDb->treehdr.iNextShmid+1-LSM_MAX_SHMCHUNKS;
      rc = lsmReadlock(
          pDb, lsmCheckpointId(pDb->aSnapshot, 0), iShmMin, iShmMax
      );
      if( rc==LSM_OK ){
        if( lsmTreeLoadHeaderOk(pDb, iTreehdr)
         && lsmCheckpointLoadOk(pDb, iSnap)
        ){
          /* Read lock has been successfully obtained. Deserialize the 
          ** checkpoint just loaded. TODO: This will be removed after 
          ** lsm_sorted.c is changed to work directly from the serialized
          ** version of the snapshot.  */
          if( pDb->pClient==0 ){
            rc = lsmCheckpointDeserialize(pDb, 0, pDb->aSnapshot,&pDb->pClient);
          }
          assert( (rc==LSM_OK)==(pDb->pClient!=0) );
          assert( pDb->iReader>=0 );

          /* Check that the client has the right compression hooks loaded.
          ** If not, set rc to LSM_MISMATCH.  */
          if( rc==LSM_OK ){
            rc = lsmCheckCompressionId(pDb, pDb->pClient->iCmpId);
          }
        }else{
          rc = dbReleaseReadlock(pDb);
        }
      }

      if( rc==LSM_BUSY ){
        rc = LSM_OK;
      }
    }
#if 0
if( rc==LSM_OK && pDb->pClient ){
  fprintf(stderr, 
      "reading %p: snapshot:%d used-shmid:%d trans-id:%d iOldShmid=%d\n",
      (void *)pDb,
      (int)pDb->pClient->iId, (int)pDb->treehdr.iUsedShmid, 
      (int)pDb->treehdr.root.iTransId,
      (int)pDb->treehdr.iOldShmid
  );
}
#endif
  }

  if( rc==LSM_OK ){
    rc = lsmShmCacheChunks(pDb, pDb->treehdr.nChunk);
  }
  if( rc!=LSM_OK ){
    dbReleaseReadlock(pDb);
  }
  if( pDb->pClient==0 && rc==LSM_OK ) rc = LSM_BUSY;
  return rc;
}

/*
** This function is used by a read-write connection to determine if there
** are currently one or more read-only transactions open on the database
** (in this context a read-only transaction is one opened by a read-only
** connection on a non-live database).
**
** If no error occurs, LSM_OK is returned and *pbExists is set to true if
** some other connection has a read-only transaction open, or false 
** otherwise. If an error occurs an LSM error code is returned and the final
** value of *pbExist is undefined.
*/
int lsmDetectRoTrans(lsm_db *db, int *pbExist){
  int rc;

  /* Only a read-write connection may use this function. */
  assert( db->bReadonly==0 );

  rc = lsmShmTestLock(db, LSM_LOCK_ROTRANS, 1, LSM_LOCK_EXCL);
  if( rc==LSM_BUSY ){
    *pbExist = 1;
    rc = LSM_OK;
  }else{
    *pbExist = 0;
  }

  return rc;
}

/*
** db is a read-only database handle in the disconnected state. This function
** attempts to open a read-transaction on the database. This may involve
** connecting to the database system (opening shared memory etc.).
*/
int lsmBeginRoTrans(lsm_db *db){
  int rc = LSM_OK;

  assert( db->bReadonly && db->pShmhdr==0 );
  assert( db->iReader<0 );

  if( db->bRoTrans==0 ){

    /* Attempt a shared-lock on DMS1. */
    rc = lsmShmLock(db, LSM_LOCK_DMS1, LSM_LOCK_SHARED, 0);
    if( rc!=LSM_OK ) return rc;

    rc = lsmShmTestLock(
        db, LSM_LOCK_RWCLIENT(0), LSM_LOCK_NREADER, LSM_LOCK_SHARED
    );
    if( rc==LSM_OK ){
      /* System is not live. Take a SHARED lock on the ROTRANS byte and
      ** release DMS1. Locking ROTRANS tells all read-write clients that they
      ** may not recycle any disk space from within the database or log files,
      ** as a read-only client may be using it.  */
      rc = lsmShmLock(db, LSM_LOCK_ROTRANS, LSM_LOCK_SHARED, 0);
      lsmShmLock(db, LSM_LOCK_DMS1, LSM_LOCK_UNLOCK, 0);

      if( rc==LSM_OK ){
        db->bRoTrans = 1;
        rc = lsmShmCacheChunks(db, 1);
        if( rc==LSM_OK ){
          db->pShmhdr = (ShmHeader *)db->apShm[0];
          memset(db->pShmhdr, 0, sizeof(ShmHeader));
          rc = lsmCheckpointRecover(db);
          if( rc==LSM_OK ){
            rc = lsmLogRecover(db);
          }
        }
      }
    }else if( rc==LSM_BUSY ){
      /* System is live! */
      rc = lsmShmLock(db, LSM_LOCK_DMS3, LSM_LOCK_SHARED, 0);
      lsmShmLock(db, LSM_LOCK_DMS1, LSM_LOCK_UNLOCK, 0);
      if( rc==LSM_OK ){
        rc = lsmShmCacheChunks(db, 1);
        if( rc==LSM_OK ){
          db->pShmhdr = (ShmHeader *)db->apShm[0];
        }
      }
    }

    if( rc==LSM_OK ){
      rc = lsmBeginReadTrans(db);
    }
  }

  return rc;
}

/*
** Close the currently open read transaction.
*/
void lsmFinishReadTrans(lsm_db *pDb){

  /* Worker connections should not be closing read transactions. And
  ** read transactions should only be closed after all cursors and write
  ** transactions have been closed. Finally pClient should be non-NULL
  ** only iff pDb->iReader>=0.  */
  assert( pDb->pWorker==0 );
  assert( pDb->pCsr==0 && pDb->nTransOpen==0 );

  if( pDb->bRoTrans ){
    int i;
    for(i=0; i<pDb->nShm; i++){
      lsmFree(pDb->pEnv, pDb->apShm[i]);
    }
    lsmFree(pDb->pEnv, pDb->apShm);
    pDb->apShm = 0;
    pDb->nShm = 0;
    pDb->pShmhdr = 0;

    lsmShmLock(pDb, LSM_LOCK_ROTRANS, LSM_LOCK_UNLOCK, 0);
  }
  dbReleaseReadlock(pDb);
}

/*
** Open a write transaction.
*/
int lsmBeginWriteTrans(lsm_db *pDb){
  int rc = LSM_OK;                /* Return code */
  ShmHeader *pShm = pDb->pShmhdr; /* Shared memory header */

  assert( pDb->nTransOpen==0 );
  assert( pDb->bDiscardOld==0 );
  assert( pDb->bReadonly==0 );

  /* If there is no read-transaction open, open one now. */
  if( pDb->iReader<0 ){
    rc = lsmBeginReadTrans(pDb);
  }

  /* Attempt to take the WRITER lock */
  if( rc==LSM_OK ){
    rc = lsmShmLock(pDb, LSM_LOCK_WRITER, LSM_LOCK_EXCL, 0);
  }

  /* If the previous writer failed mid-transaction, run emergency rollback. */
  if( rc==LSM_OK && pShm->bWriter ){
    rc = lsmTreeRepair(pDb);
    if( rc==LSM_OK ) pShm->bWriter = 0;
  }

  /* Check that this connection is currently reading from the most recent
  ** version of the database. If not, return LSM_BUSY.  */
  if( rc==LSM_OK && memcmp(&pShm->hdr1, &pDb->treehdr, sizeof(TreeHeader)) ){
    rc = LSM_BUSY;
  }

  if( rc==LSM_OK ){
    rc = lsmLogBegin(pDb);
  }

  /* If everything was successful, set the "transaction-in-progress" flag
  ** and return LSM_OK. Otherwise, if some error occurred, relinquish the 
  ** WRITER lock and return an error code.  */
  if( rc==LSM_OK ){
    TreeHeader *p = &pDb->treehdr;
    pShm->bWriter = 1;
    p->root.iTransId++;
    if( lsmTreeHasOld(pDb) && p->iOldLog==pDb->pClient->iLogOff ){
      lsmTreeDiscardOld(pDb);
      pDb->bDiscardOld = 1;
    }
  }else{
    lsmShmLock(pDb, LSM_LOCK_WRITER, LSM_LOCK_UNLOCK, 0);
    if( pDb->pCsr==0 ) lsmFinishReadTrans(pDb);
  }
  return rc;
}

/*
** End the current write transaction. The connection is left with an open
** read transaction. It is an error to call this if there is no open write 
** transaction.
**
** If the transaction was committed, then a commit record has already been
** written into the log file when this function is called. Or, if the
** transaction was rolled back, both the log file and in-memory tree 
** structure have already been restored. In either case, this function 
** merely releases locks and other resources held by the write-transaction.
**
** LSM_OK is returned if successful, or an LSM error code otherwise.
*/
int lsmFinishWriteTrans(lsm_db *pDb, int bCommit){
  int rc = LSM_OK;
  int bFlush = 0;

  lsmLogEnd(pDb, bCommit);
  if( rc==LSM_OK && bCommit && lsmTreeSize(pDb)>pDb->nTreeLimit ){
    bFlush = 1;
    lsmTreeMakeOld(pDb);
  }
  lsmTreeEndTransaction(pDb, bCommit);

  if( rc==LSM_OK ){
    if( bFlush && pDb->bAutowork ){
      rc = lsmSortedAutoWork(pDb, 1);
    }else if( bCommit && pDb->bDiscardOld ){
      rc = dbSetReadLock(pDb, pDb->pClient->iId, pDb->treehdr.iUsedShmid);
    }
  }
  pDb->bDiscardOld = 0;
  lsmShmLock(pDb, LSM_LOCK_WRITER, LSM_LOCK_UNLOCK, 0);

  if( bFlush && pDb->bAutowork==0 && pDb->xWork ){
    pDb->xWork(pDb, pDb->pWorkCtx);
  }
  return rc;
}


/*
** Return non-zero if the caller is holding the client mutex.
*/
#ifdef LSM_DEBUG
int lsmHoldingClientMutex(lsm_db *pDb){
  return lsmMutexHeld(pDb->pEnv, pDb->pDatabase->pClientMutex);
}
#endif

static int slotIsUsable(ShmReader *p, i64 iLsm, u32 iShmMin, u32 iShmMax){
  return( 
      p->iLsmId && p->iLsmId<=iLsm 
      && shm_sequence_ge(iShmMax, p->iTreeId)
      && shm_sequence_ge(p->iTreeId, iShmMin)
  );
}

/*
** Obtain a read-lock on database version identified by the combination
** of snapshot iLsm and tree iTree. Return LSM_OK if successful, or
** an LSM error code otherwise.
*/
int lsmReadlock(lsm_db *db, i64 iLsm, u32 iShmMin, u32 iShmMax){
  int rc = LSM_OK;
  ShmHeader *pShm = db->pShmhdr;
  int i;

  assert( db->iReader<0 );
  assert( shm_sequence_ge(iShmMax, iShmMin) );

  /* This is a no-op if the read-only transaction flag is set. */
  if( db->bRoTrans ){
    db->iReader = 0;
    return LSM_OK;
  }

  /* Search for an exact match. */
  for(i=0; db->iReader<0 && rc==LSM_OK && i<LSM_LOCK_NREADER; i++){
    ShmReader *p = &pShm->aReader[i];
    if( p->iLsmId==iLsm && p->iTreeId==iShmMax ){
      rc = lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_SHARED, 0);
      if( rc==LSM_OK && p->iLsmId==iLsm && p->iTreeId==iShmMax ){
        db->iReader = i;
      }else if( rc==LSM_BUSY ){
        rc = LSM_OK;
      }
    }
  }

  /* Try to obtain a write-lock on each slot, in order. If successful, set
  ** the slot values to iLsm/iTree.  */
  for(i=0; db->iReader<0 && rc==LSM_OK && i<LSM_LOCK_NREADER; i++){
    rc = lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_EXCL, 0);
    if( rc==LSM_BUSY ){
      rc = LSM_OK;
    }else{
      ShmReader *p = &pShm->aReader[i];
      p->iLsmId = iLsm;
      p->iTreeId = iShmMax;
      rc = lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_SHARED, 0);
      assert( rc!=LSM_BUSY );
      if( rc==LSM_OK ) db->iReader = i;
    }
  }

  /* Search for any usable slot */
  for(i=0; db->iReader<0 && rc==LSM_OK && i<LSM_LOCK_NREADER; i++){
    ShmReader *p = &pShm->aReader[i];
    if( slotIsUsable(p, iLsm, iShmMin, iShmMax) ){
      rc = lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_SHARED, 0);
      if( rc==LSM_OK && slotIsUsable(p, iLsm, iShmMin, iShmMax) ){
        db->iReader = i;
      }else if( rc==LSM_BUSY ){
        rc = LSM_OK;
      }
    }
  }

  if( rc==LSM_OK && db->iReader<0 ){
    rc = LSM_BUSY;
  }
  return rc;
}

/*
** This is used to check if there exists a read-lock locking a particular
** version of either the in-memory tree or database file. 
**
** If iLsmId is non-zero, then it is a snapshot id. If there exists a 
** read-lock using this snapshot or newer, set *pbInUse to true. Or,
** if there is no such read-lock, set it to false.
**
** Or, if iLsmId is zero, then iShmid is a shared-memory sequence id.
** Search for a read-lock using this sequence id or newer. etc.
*/
static int isInUse(lsm_db *db, i64 iLsmId, u32 iShmid, int *pbInUse){
  ShmHeader *pShm = db->pShmhdr;
  int i;
  int rc = LSM_OK;

  for(i=0; rc==LSM_OK && i<LSM_LOCK_NREADER; i++){
    ShmReader *p = &pShm->aReader[i];
    if( p->iLsmId ){
      if( (iLsmId!=0 && p->iLsmId!=0 && iLsmId>=p->iLsmId) 
       || (iLsmId==0 && shm_sequence_ge(p->iTreeId, iShmid))
      ){
        rc = lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_EXCL, 0);
        if( rc==LSM_OK ){
          p->iLsmId = 0;
          lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_UNLOCK, 0);
        }
      }
    }
  }

  if( rc==LSM_BUSY ){
    *pbInUse = 1;
    return LSM_OK;
  }
  *pbInUse = 0;
  return rc;
}

/*
** This function is called by worker connections to determine the smallest
** snapshot id that is currently in use by a database client. The worker
** connection uses this result to determine whether or not it is safe to
** recycle a database block.
*/
static int firstSnapshotInUse(
  lsm_db *db,                     /* Database handle */
  i64 *piInUse                    /* IN/OUT: Smallest snapshot id in use */
){
  ShmHeader *pShm = db->pShmhdr;
  i64 iInUse = *piInUse;
  int i;

  assert( iInUse>0 );
  for(i=0; i<LSM_LOCK_NREADER; i++){
    ShmReader *p = &pShm->aReader[i];
    if( p->iLsmId ){
      i64 iThis = p->iLsmId;
      if( iThis!=0 && iInUse>iThis ){
        int rc = lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_EXCL, 0);
        if( rc==LSM_OK ){
          p->iLsmId = 0;
          lsmShmLock(db, LSM_LOCK_READER(i), LSM_LOCK_UNLOCK, 0);
        }else if( rc==LSM_BUSY ){
          iInUse = iThis;
        }else{
          /* Some error other than LSM_BUSY. Return the error code to
          ** the caller in this case.  */
          return rc;
        }
      }
    }
  }

  *piInUse = iInUse;
  return LSM_OK;
}

int lsmTreeInUse(lsm_db *db, u32 iShmid, int *pbInUse){
  if( db->treehdr.iUsedShmid==iShmid ){
    *pbInUse = 1;
    return LSM_OK;
  }
  return isInUse(db, 0, iShmid, pbInUse);
}

int lsmLsmInUse(lsm_db *db, i64 iLsmId, int *pbInUse){
  if( db->pClient && db->pClient->iId<=iLsmId ){
    *pbInUse = 1;
    return LSM_OK;
  }
  return isInUse(db, iLsmId, 0, pbInUse);
}

/*
** This function may only be called after a successful call to
** lsmDbDatabaseConnect(). It returns true if the connection is in
** multi-process mode, or false otherwise.
*/
int lsmDbMultiProc(lsm_db *pDb){
  return pDb->pDatabase && pDb->pDatabase->bMultiProc;
}


/*************************************************************************
**************************************************************************
**************************************************************************
**************************************************************************
**************************************************************************
*************************************************************************/

/*
** Ensure that database connection db has cached pointers to at least the 
** first nChunk chunks of shared memory.
*/
int lsmShmCacheChunks(lsm_db *db, int nChunk){
  int rc = LSM_OK;
  if( nChunk>db->nShm ){
    static const int NINCR = 16;
    Database *p = db->pDatabase;
    lsm_env *pEnv = db->pEnv;
    int nAlloc;
    int i;

    /* Ensure that the db->apShm[] array is large enough. If an attempt to
    ** allocate memory fails, return LSM_NOMEM immediately. The apShm[] array
    ** is always extended in multiples of 16 entries - so the actual allocated
    ** size can be inferred from nShm.  */ 
    nAlloc = ((db->nShm + NINCR - 1) / NINCR) * NINCR;
    while( nChunk>=nAlloc ){
      void **apShm;
      nAlloc += NINCR;
      apShm = lsmRealloc(pEnv, db->apShm, sizeof(void*)*nAlloc);
      if( !apShm ) return LSM_NOMEM_BKPT;
      db->apShm = apShm;
    }

    if( db->bRoTrans ){
      for(i=db->nShm; rc==LSM_OK && i<nChunk; i++){
        db->apShm[i] = lsmMallocZeroRc(pEnv, LSM_SHM_CHUNK_SIZE, &rc);
        db->nShm++;
      }

    }else{

      /* Enter the client mutex */
      lsmMutexEnter(pEnv, p->pClientMutex);

      /* Extend the Database objects apShmChunk[] array if necessary. Using the
       ** same pattern as for the lsm_db.apShm[] array above.  */
      nAlloc = ((p->nShmChunk + NINCR - 1) / NINCR) * NINCR;
      while( nChunk>=nAlloc ){
        void **apShm;
        nAlloc +=  NINCR;
        apShm = lsmRealloc(pEnv, p->apShmChunk, sizeof(void*)*nAlloc);
        if( !apShm ){
          rc = LSM_NOMEM_BKPT;
          break;
        }
        p->apShmChunk = apShm;
      }

      for(i=db->nShm; rc==LSM_OK && i<nChunk; i++){
        if( i>=p->nShmChunk ){
          void *pChunk = 0;
          if( p->bMultiProc==0 ){
            /* Single process mode */
            pChunk = lsmMallocZeroRc(pEnv, LSM_SHM_CHUNK_SIZE, &rc);
          }else{
            /* Multi-process mode */
            rc = lsmEnvShmMap(pEnv, p->pFile, i, LSM_SHM_CHUNK_SIZE, &pChunk);
          }
          if( rc==LSM_OK ){
            p->apShmChunk[i] = pChunk;
            p->nShmChunk++;
          }
        }
        if( rc==LSM_OK ){
          db->apShm[i] = p->apShmChunk[i];
          db->nShm++;
        }
      }

      /* Release the client mutex */
      lsmMutexLeave(pEnv, p->pClientMutex);
    }
  }

  return rc;
}

static int lockSharedFile(lsm_env *pEnv, Database *p, int iLock, int eOp){
  int rc = LSM_OK;
  if( p->bMultiProc ){
    rc = lsmEnvLock(pEnv, p->pFile, iLock, eOp);
  }
  return rc;
}

/*
** Test if it would be possible for connection db to obtain a lock of type
** eType on the nLock locks starting at iLock. If so, return LSM_OK. If it
** would not be possible to obtain the lock due to a lock held by another
** connection, return LSM_BUSY. If an IO or other error occurs (i.e. in the 
** lsm_env.xTestLock function), return some other LSM error code.
**
** Note that this function never actually locks the database - it merely
** queries the system to see if there exists a lock that would prevent
** it from doing so.
*/
int lsmShmTestLock(
  lsm_db *db,
  int iLock,
  int nLock,
  int eOp
){
  int rc = LSM_OK;
  lsm_db *pIter;
  Database *p = db->pDatabase;
  int i;
  u64 mask = 0;

  for(i=iLock; i<(iLock+nLock); i++){
    mask |= ((u64)1 << (iLock-1));
    if( eOp==LSM_LOCK_EXCL ) mask |= ((u64)1 << (iLock+32-1));
  }

  lsmMutexEnter(db->pEnv, p->pClientMutex);
  for(pIter=p->pConn; pIter; pIter=pIter->pNext){
    if( pIter!=db && (pIter->mLock & mask) ){
      assert( pIter!=db );
      break;
    }
  }

  if( pIter ){
    rc = LSM_BUSY;
  }else if( p->bMultiProc ){
    rc = lsmEnvTestLock(db->pEnv, p->pFile, iLock, nLock, eOp);
  }

  lsmMutexLeave(db->pEnv, p->pClientMutex);
  return rc;
}

/*
** Attempt to obtain the lock identified by the iLock and bExcl parameters.
** If successful, return LSM_OK. If the lock cannot be obtained because 
** there exists some other conflicting lock, return LSM_BUSY. If some other
** error occurs, return an LSM error code.
**
** Parameter iLock must be one of LSM_LOCK_WRITER, WORKER or CHECKPOINTER,
** or else a value returned by the LSM_LOCK_READER macro.
*/
int lsmShmLock(
  lsm_db *db, 
  int iLock,
  int eOp,                        /* One of LSM_LOCK_UNLOCK, SHARED or EXCL */
  int bBlock                      /* True for a blocking lock */
){
  lsm_db *pIter;
  const u64 me = ((u64)1 << (iLock-1));
  const u64 ms = ((u64)1 << (iLock+32-1));
  int rc = LSM_OK;
  Database *p = db->pDatabase;

  assert( eOp!=LSM_LOCK_EXCL || p->bReadonly==0 );
  assert( iLock>=1 && iLock<=LSM_LOCK_RWCLIENT(LSM_LOCK_NRWCLIENT-1) );
  assert( LSM_LOCK_RWCLIENT(LSM_LOCK_NRWCLIENT-1)<=32 );
  assert( eOp==LSM_LOCK_UNLOCK || eOp==LSM_LOCK_SHARED || eOp==LSM_LOCK_EXCL );

  /* Check for a no-op. Proceed only if this is not one of those. */
  if( (eOp==LSM_LOCK_UNLOCK && (db->mLock & (me|ms))!=0)
   || (eOp==LSM_LOCK_SHARED && (db->mLock & (me|ms))!=ms)
   || (eOp==LSM_LOCK_EXCL   && (db->mLock & me)==0)
  ){
    int nExcl = 0;                /* Number of connections holding EXCLUSIVE */
    int nShared = 0;              /* Number of connections holding SHARED */
    lsmMutexEnter(db->pEnv, p->pClientMutex);

    /* Figure out the locks currently held by this process on iLock, not
    ** including any held by connection db.  */
    for(pIter=p->pConn; pIter; pIter=pIter->pNext){
      assert( (pIter->mLock & me)==0 || (pIter->mLock & ms)!=0 );
      if( pIter!=db ){
        if( pIter->mLock & me ){
          nExcl++;
        }else if( pIter->mLock & ms ){
          nShared++;
        }
      }
    }
    assert( nExcl==0 || nExcl==1 );
    assert( nExcl==0 || nShared==0 );
    assert( nExcl==0 || (db->mLock & (me|ms))==0 );

    switch( eOp ){
      case LSM_LOCK_UNLOCK:
        if( nShared==0 ){
          lockSharedFile(db->pEnv, p, iLock, LSM_LOCK_UNLOCK);
        }
        db->mLock &= ~(me|ms);
        break;

      case LSM_LOCK_SHARED:
        if( nExcl ){
          rc = LSM_BUSY;
        }else{
          if( nShared==0 ){
            rc = lockSharedFile(db->pEnv, p, iLock, LSM_LOCK_SHARED);
          }
          if( rc==LSM_OK ){
            db->mLock |= ms;
            db->mLock &= ~me;
          }
        }
        break;

      default:
        assert( eOp==LSM_LOCK_EXCL );
        if( nExcl || nShared ){
          rc = LSM_BUSY;
        }else{
          rc = lockSharedFile(db->pEnv, p, iLock, LSM_LOCK_EXCL);
          if( rc==LSM_OK ){
            db->mLock |= (me|ms);
          }
        }
        break;
    }

    lsmMutexLeave(db->pEnv, p->pClientMutex);
  }

  return rc;
}

#ifdef LSM_DEBUG

int shmLockType(lsm_db *db, int iLock){
  const u64 me = ((u64)1 << (iLock-1));
  const u64 ms = ((u64)1 << (iLock+32-1));

  if( db->mLock & me ) return LSM_LOCK_EXCL;
  if( db->mLock & ms ) return LSM_LOCK_SHARED;
  return LSM_LOCK_UNLOCK;
}

/*
** The arguments passed to this function are similar to those passed to
** the lsmShmLock() function. However, instead of obtaining a new lock 
** this function returns true if the specified connection already holds 
** (or does not hold) such a lock, depending on the value of eOp. As
** follows:
**
**   (eOp==LSM_LOCK_UNLOCK) -> true if db has no lock on iLock
**   (eOp==LSM_LOCK_SHARED) -> true if db has at least a SHARED lock on iLock.
**   (eOp==LSM_LOCK_EXCL)   -> true if db has an EXCLUSIVE lock on iLock.
*/
int lsmShmAssertLock(lsm_db *db, int iLock, int eOp){
  int ret = 0;
  int eHave;

  assert( iLock>=1 && iLock<=LSM_LOCK_READER(LSM_LOCK_NREADER-1) );
  assert( iLock<=16 );
  assert( eOp==LSM_LOCK_UNLOCK || eOp==LSM_LOCK_SHARED || eOp==LSM_LOCK_EXCL );

  eHave = shmLockType(db, iLock);

  switch( eOp ){
    case LSM_LOCK_UNLOCK:
      ret = (eHave==LSM_LOCK_UNLOCK);
      break;
    case LSM_LOCK_SHARED:
      ret = (eHave!=LSM_LOCK_UNLOCK);
      break;
    case LSM_LOCK_EXCL:
      ret = (eHave==LSM_LOCK_EXCL);
      break;
    default:
      assert( !"bad eOp value passed to lsmShmAssertLock()" );
      break;
  }

  return ret;
}

int lsmShmAssertWorker(lsm_db *db){
  return lsmShmAssertLock(db, LSM_LOCK_WORKER, LSM_LOCK_EXCL) && db->pWorker;
}

/*
** This function does not contribute to library functionality, and is not
** included in release builds. It is intended to be called from within
** an interactive debugger.
**
** When called, this function prints a single line of human readable output
** to stdout describing the locks currently held by the connection. For 
** example:
**
**     (gdb) call print_db_locks(pDb)
**     (shared on dms2) (exclusive on writer) 
*/
void print_db_locks(lsm_db *db){
  int iLock;
  for(iLock=0; iLock<16; iLock++){
    int bOne = 0;
    const char *azLock[] = {0, "shared", "exclusive"};
    const char *azName[] = {
      0, "dms1", "dms2", "writer", "worker", "checkpointer",
      "reader0", "reader1", "reader2", "reader3", "reader4", "reader5"
    };
    int eHave = shmLockType(db, iLock);
    if( azLock[eHave] ){
      printf("%s(%s on %s)", (bOne?" ":""), azLock[eHave], azName[iLock]);
      bOne = 1;
    }
  }
  printf("\n");
}
void print_all_db_locks(lsm_db *db){
  lsm_db *p;
  for(p=db->pDatabase->pConn; p; p=p->pNext){
    printf("%s connection %p ", ((p==db)?"*":""), p);
    print_db_locks(p);
  }
}
#endif

void lsmShmBarrier(lsm_db *db){
  lsmEnvShmBarrier(db->pEnv);
}

int lsm_checkpoint(lsm_db *pDb, int *pnKB){
  int rc;                         /* Return code */
  u32 nWrite = 0;                 /* Number of pages checkpointed */

  /* Attempt the checkpoint. If successful, nWrite is set to the number of
  ** pages written between this and the previous checkpoint.  */
  rc = lsmCheckpointWrite(pDb, &nWrite);

  /* If required, calculate the output variable (KB of data checkpointed). 
  ** Set it to zero if an error occured.  */
  if( pnKB ){
    int nKB = 0;
    if( rc==LSM_OK && nWrite ){
      nKB = (((i64)nWrite * lsmFsPageSize(pDb->pFS)) + 1023) / 1024;
    }
    *pnKB = nKB;
  }

  return rc;
}
