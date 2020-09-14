/*
** 2011-08-18
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
** The main interface to the LSM module.
*/
#include "lsmInt.h"


#ifdef LSM_DEBUG
/*
** This function returns a copy of its only argument.
**
** When the library is built with LSM_DEBUG defined, this function is called
** whenever an error code is generated (not propagated - generated). So
** if the library is mysteriously returning (say) LSM_IOERR, a breakpoint
** may be set in this function to determine why.
*/
int lsmErrorBkpt(int rc){
  /* Set breakpoint here! */
  return rc;
}

/*
** This function contains various assert() statements that test that the
** lsm_db structure passed as an argument is internally consistent.
*/
static void assert_db_state(lsm_db *pDb){

  /* If there is at least one cursor or a write transaction open, the database
  ** handle must be holding a pointer to a client snapshot. And the reverse 
  ** - if there are no open cursors and no write transactions then there must 
  ** not be a client snapshot.  */
  
  assert( (pDb->pCsr!=0||pDb->nTransOpen>0)==(pDb->iReader>=0||pDb->bRoTrans) );

  assert( (pDb->iReader<0 && pDb->bRoTrans==0) || pDb->pClient!=0 );

  assert( pDb->nTransOpen>=0 );
}
#else
# define assert_db_state(x) 
#endif

/*
** The default key-compare function.
*/
static int xCmp(void *p1, int n1, void *p2, int n2){
  int res;
  res = memcmp(p1, p2, LSM_MIN(n1, n2));
  if( res==0 ) res = (n1-n2);
  return res;
}

static void xLog(void *pCtx, int rc, const char *z){
  (void)(rc);
  (void)(pCtx);
  fprintf(stderr, "%s\n", z);
  fflush(stderr);
}

/*
** Allocate a new db handle.
*/
int lsm_new(lsm_env *pEnv, lsm_db **ppDb){
  lsm_db *pDb;

  /* If the user did not provide an environment, use the default. */
  if( pEnv==0 ) pEnv = lsm_default_env();
  assert( pEnv );

  /* Allocate the new database handle */
  *ppDb = pDb = (lsm_db *)lsmMallocZero(pEnv, sizeof(lsm_db));
  if( pDb==0 ) return LSM_NOMEM_BKPT;

  /* Initialize the new object */
  pDb->pEnv = pEnv;
  pDb->nTreeLimit = LSM_DFLT_AUTOFLUSH;
  pDb->nAutockpt = LSM_DFLT_AUTOCHECKPOINT;
  pDb->bAutowork = LSM_DFLT_AUTOWORK;
  pDb->eSafety = LSM_DFLT_SAFETY;
  pDb->xCmp = xCmp;
  pDb->nDfltPgsz = LSM_DFLT_PAGE_SIZE;
  pDb->nDfltBlksz = LSM_DFLT_BLOCK_SIZE;
  pDb->nMerge = LSM_DFLT_AUTOMERGE;
  pDb->nMaxFreelist = LSM_MAX_FREELIST_ENTRIES;
  pDb->bUseLog = LSM_DFLT_USE_LOG;
  pDb->iReader = -1;
  pDb->iRwclient = -1;
  pDb->bMultiProc = LSM_DFLT_MULTIPLE_PROCESSES;
  pDb->iMmap = LSM_DFLT_MMAP;
  pDb->xLog = xLog;
  pDb->compress.iId = LSM_COMPRESSION_NONE;
  return LSM_OK;
}

lsm_env *lsm_get_env(lsm_db *pDb){
  assert( pDb->pEnv );
  return pDb->pEnv;
}

/*
** If database handle pDb is currently holding a client snapshot, but does
** not have any open cursors or write transactions, release it.
*/
static void dbReleaseClientSnapshot(lsm_db *pDb){
  if( pDb->nTransOpen==0 && pDb->pCsr==0 ){
    lsmFinishReadTrans(pDb);
  }
}

static int getFullpathname(
  lsm_env *pEnv, 
  const char *zRel,
  char **pzAbs
){
  int nAlloc = 0;
  char *zAlloc = 0;
  int nReq = 0;
  int rc;

  do{
    nAlloc = nReq;
    rc = pEnv->xFullpath(pEnv, zRel, zAlloc, &nReq);
    if( nReq>nAlloc ){
      zAlloc = lsmReallocOrFreeRc(pEnv, zAlloc, nReq, &rc);
    }
  }while( nReq>nAlloc && rc==LSM_OK );

  if( rc!=LSM_OK ){
    lsmFree(pEnv, zAlloc);
    zAlloc = 0;
  }
  *pzAbs = zAlloc;
  return rc;
}

/*
** Check that the bits in the db->mLock mask are consistent with the
** value stored in db->iRwclient. An assert shall fail otherwise.
*/
static void assertRwclientLockValue(lsm_db *db){
#ifndef NDEBUG
  u64 msk;                        /* Mask of mLock bits for RWCLIENT locks */
  u64 rwclient = 0;               /* Bit corresponding to db->iRwclient */

  if( db->iRwclient>=0 ){
    rwclient = ((u64)1 << (LSM_LOCK_RWCLIENT(db->iRwclient)-1));
  }
  msk  = ((u64)1 << (LSM_LOCK_RWCLIENT(LSM_LOCK_NRWCLIENT)-1)) - 1;
  msk -= (((u64)1 << (LSM_LOCK_RWCLIENT(0)-1)) - 1);

  assert( (db->mLock & msk)==rwclient );
#endif
}

/*
** Open a new connection to database zFilename.
*/
int lsm_open(lsm_db *pDb, const char *zFilename){
  int rc;

  if( pDb->pDatabase ){
    rc = LSM_MISUSE;
  }else{
    char *zFull;

    /* Translate the possibly relative pathname supplied by the user into
    ** an absolute pathname. This is required because the supplied path
    ** is used (either directly or with "-log" appended to it) for more 
    ** than one purpose - to open both the database and log files, and 
    ** perhaps to unlink the log file during disconnection. An absolute
    ** path is required to ensure that the correct files are operated
    ** on even if the application changes the cwd.  */
    rc = getFullpathname(pDb->pEnv, zFilename, &zFull);
    assert( rc==LSM_OK || zFull==0 );

    /* Connect to the database. */
    if( rc==LSM_OK ){
      rc = lsmDbDatabaseConnect(pDb, zFull);
    }

    if( pDb->bReadonly==0 ){
      /* Configure the file-system connection with the page-size and block-size
      ** of this database. Even if the database file is zero bytes in size
      ** on disk, these values have been set in shared-memory by now, and so 
      ** are guaranteed not to change during the lifetime of this connection.  
      */
      if( rc==LSM_OK && LSM_OK==(rc = lsmCheckpointLoad(pDb, 0)) ){
        lsmFsSetPageSize(pDb->pFS, lsmCheckpointPgsz(pDb->aSnapshot));
        lsmFsSetBlockSize(pDb->pFS, lsmCheckpointBlksz(pDb->aSnapshot));
      }
    }

    lsmFree(pDb->pEnv, zFull);
    assertRwclientLockValue(pDb);
  }

  assert( pDb->bReadonly==0 || pDb->bReadonly==1 );
  assert( rc!=LSM_OK || (pDb->pShmhdr==0)==(pDb->bReadonly==1) );

  return rc;
}

int lsm_close(lsm_db *pDb){
  int rc = LSM_OK;
  if( pDb ){
    assert_db_state(pDb);
    if( pDb->pCsr || pDb->nTransOpen ){
      rc = LSM_MISUSE_BKPT;
    }else{
      lsmMCursorFreeCache(pDb);
      lsmFreeSnapshot(pDb->pEnv, pDb->pClient);
      pDb->pClient = 0;

      assertRwclientLockValue(pDb);

      lsmDbDatabaseRelease(pDb);
      lsmLogClose(pDb);
      lsmFsClose(pDb->pFS);
      /* assert( pDb->mLock==0 ); */
      
      /* Invoke any destructors registered for the compression or 
      ** compression factory callbacks.  */
      if( pDb->factory.xFree ) pDb->factory.xFree(pDb->factory.pCtx);
      if( pDb->compress.xFree ) pDb->compress.xFree(pDb->compress.pCtx);

      lsmFree(pDb->pEnv, pDb->rollback.aArray);
      lsmFree(pDb->pEnv, pDb->aTrans);
      lsmFree(pDb->pEnv, pDb->apShm);
      lsmFree(pDb->pEnv, pDb);
    }
  }
  return rc;
}

int lsm_config(lsm_db *pDb, int eParam, ...){
  int rc = LSM_OK;
  va_list ap;
  va_start(ap, eParam);

  switch( eParam ){
    case LSM_CONFIG_AUTOFLUSH: {
      /* This parameter is read and written in KB. But all internal 
      ** processing is done in bytes.  */
      int *piVal = va_arg(ap, int *);
      int iVal = *piVal;
      if( iVal>=0 && iVal<=(1024*1024) ){
        pDb->nTreeLimit = iVal*1024;
      }
      *piVal = (pDb->nTreeLimit / 1024);
      break;
    }

    case LSM_CONFIG_AUTOWORK: {
      int *piVal = va_arg(ap, int *);
      if( *piVal>=0 ){
        pDb->bAutowork = *piVal;
      }
      *piVal = pDb->bAutowork;
      break;
    }

    case LSM_CONFIG_AUTOCHECKPOINT: {
      /* This parameter is read and written in KB. But all internal processing
      ** (including the lsm_db.nAutockpt variable) is done in bytes.  */
      int *piVal = va_arg(ap, int *);
      if( *piVal>=0 ){
        int iVal = *piVal;
        pDb->nAutockpt = (i64)iVal * 1024;
      }
      *piVal = (int)(pDb->nAutockpt / 1024);
      break;
    }

    case LSM_CONFIG_PAGE_SIZE: {
      int *piVal = va_arg(ap, int *);
      if( pDb->pDatabase ){
        /* If lsm_open() has been called, this is a read-only parameter. 
        ** Set the output variable to the page-size according to the 
        ** FileSystem object.  */
        *piVal = lsmFsPageSize(pDb->pFS);
      }else{
        if( *piVal>=256 && *piVal<=65536 && ((*piVal-1) & *piVal)==0 ){
          pDb->nDfltPgsz = *piVal;
        }else{
          *piVal = pDb->nDfltPgsz;
        }
      }
      break;
    }

    case LSM_CONFIG_BLOCK_SIZE: {
      /* This parameter is read and written in KB. But all internal 
      ** processing is done in bytes.  */
      int *piVal = va_arg(ap, int *);
      if( pDb->pDatabase ){
        /* If lsm_open() has been called, this is a read-only parameter. 
        ** Set the output variable to the block-size in KB according to the 
        ** FileSystem object.  */
        *piVal = lsmFsBlockSize(pDb->pFS) / 1024;
      }else{
        int iVal = *piVal;
        if( iVal>=64 && iVal<=65536 && ((iVal-1) & iVal)==0 ){
          pDb->nDfltBlksz = iVal * 1024;
        }else{
          *piVal = pDb->nDfltBlksz / 1024;
        }
      }
      break;
    }

    case LSM_CONFIG_SAFETY: {
      int *piVal = va_arg(ap, int *);
      if( *piVal>=0 && *piVal<=2 ){
        pDb->eSafety = *piVal;
      }
      *piVal = pDb->eSafety;
      break;
    }

    case LSM_CONFIG_MMAP: {
      int *piVal = va_arg(ap, int *);
      if( pDb->iReader<0 && *piVal>=0 ){
        pDb->iMmap = *piVal;
        rc = lsmFsConfigure(pDb);
      }
      *piVal = pDb->iMmap;
      break;
    }

    case LSM_CONFIG_USE_LOG: {
      int *piVal = va_arg(ap, int *);
      if( pDb->nTransOpen==0 && (*piVal==0 || *piVal==1) ){
        pDb->bUseLog = *piVal;
      }
      *piVal = pDb->bUseLog;
      break;
    }

    case LSM_CONFIG_AUTOMERGE: {
      int *piVal = va_arg(ap, int *);
      if( *piVal>1 ) pDb->nMerge = *piVal;
      *piVal = pDb->nMerge;
      break;
    }

    case LSM_CONFIG_MAX_FREELIST: {
      int *piVal = va_arg(ap, int *);
      if( *piVal>=2 && *piVal<=LSM_MAX_FREELIST_ENTRIES ){
        pDb->nMaxFreelist = *piVal;
      }
      *piVal = pDb->nMaxFreelist;
      break;
    }

    case LSM_CONFIG_MULTIPLE_PROCESSES: {
      int *piVal = va_arg(ap, int *);
      if( pDb->pDatabase ){
        /* If lsm_open() has been called, this is a read-only parameter. 
        ** Set the output variable to true if this connection is currently
        ** in multi-process mode.  */
        *piVal = lsmDbMultiProc(pDb);
      }else{
        pDb->bMultiProc = *piVal = (*piVal!=0);
      }
      break;
    }

    case LSM_CONFIG_READONLY: {
      int *piVal = va_arg(ap, int *);
      /* If lsm_open() has been called, this is a read-only parameter. */
      if( pDb->pDatabase==0 && *piVal>=0 ){
        pDb->bReadonly = *piVal = (*piVal!=0);
      }
      *piVal = pDb->bReadonly;
      break;
    }

    case LSM_CONFIG_SET_COMPRESSION: {
      lsm_compress *p = va_arg(ap, lsm_compress *);
      if( pDb->iReader>=0 && pDb->bInFactory==0 ){
        /* May not change compression schemes with an open transaction */
        rc = LSM_MISUSE_BKPT;
      }else{
        if( pDb->compress.xFree ){
          /* Invoke any destructor belonging to the current compression. */
          pDb->compress.xFree(pDb->compress.pCtx);
        }
        if( p->xBound==0 ){
          memset(&pDb->compress, 0, sizeof(lsm_compress));
          pDb->compress.iId = LSM_COMPRESSION_NONE;
        }else{
          memcpy(&pDb->compress, p, sizeof(lsm_compress));
        }
        rc = lsmFsConfigure(pDb);
      }
      break;
    }

    case LSM_CONFIG_SET_COMPRESSION_FACTORY: {
      lsm_compress_factory *p = va_arg(ap, lsm_compress_factory *);
      if( pDb->factory.xFree ){
        /* Invoke any destructor belonging to the current factory. */
        pDb->factory.xFree(pDb->factory.pCtx);
      }
      memcpy(&pDb->factory, p, sizeof(lsm_compress_factory));
      break;
    }

    case LSM_CONFIG_GET_COMPRESSION: {
      lsm_compress *p = va_arg(ap, lsm_compress *);
      memcpy(p, &pDb->compress, sizeof(lsm_compress));
      break;
    }

    default:
      rc = LSM_MISUSE;
      break;
  }

  va_end(ap);
  return rc;
}

void lsmAppendSegmentList(LsmString *pStr, char *zPre, Segment *pSeg){
  lsmStringAppendf(pStr, "%s{%d %d %d %d}", zPre, 
        pSeg->iFirst, pSeg->iLastPg, pSeg->iRoot, pSeg->nSize
  );
}

static int infoGetWorker(lsm_db *pDb, Snapshot **pp, int *pbUnlock){
  int rc = LSM_OK;

  assert( *pbUnlock==0 );
  if( !pDb->pWorker ){
    rc = lsmBeginWork(pDb);
    if( rc!=LSM_OK ) return rc;
    *pbUnlock = 1;
  }
  if( pp ) *pp = pDb->pWorker;
  return rc;
}

static void infoFreeWorker(lsm_db *pDb, int bUnlock){
  if( bUnlock ){
    int rcdummy = LSM_BUSY;
    lsmFinishWork(pDb, 0, &rcdummy);
  }
}

int lsmStructList(
  lsm_db *pDb,                    /* Database handle */
  char **pzOut                    /* OUT: Nul-terminated string (tcl list) */
){
  Level *pTopLevel = 0;           /* Top level of snapshot to report on */
  int rc = LSM_OK;
  Level *p;
  LsmString s;
  Snapshot *pWorker;              /* Worker snapshot */
  int bUnlock = 0;

  /* Obtain the worker snapshot */
  rc = infoGetWorker(pDb, &pWorker, &bUnlock);
  if( rc!=LSM_OK ) return rc;

  /* Format the contents of the snapshot as text */
  pTopLevel = lsmDbSnapshotLevel(pWorker);
  lsmStringInit(&s, pDb->pEnv);
  for(p=pTopLevel; rc==LSM_OK && p; p=p->pNext){
    int i;
    lsmStringAppendf(&s, "%s{%d", (s.n ? " " : ""), (int)p->iAge);
    lsmAppendSegmentList(&s, " ", &p->lhs);
    for(i=0; rc==LSM_OK && i<p->nRight; i++){
      lsmAppendSegmentList(&s, " ", &p->aRhs[i]);
    }
    lsmStringAppend(&s, "}", 1);
  }
  rc = s.n>=0 ? LSM_OK : LSM_NOMEM;

  /* Release the snapshot and return */
  infoFreeWorker(pDb, bUnlock);
  *pzOut = s.z;
  return rc;
}

static int infoFreelistCb(void *pCtx, int iBlk, i64 iSnapshot){
  LsmString *pStr = (LsmString *)pCtx;
  lsmStringAppendf(pStr, "%s{%d %lld}", (pStr->n?" ":""), iBlk, iSnapshot);
  return 0;
}

int lsmInfoFreelist(lsm_db *pDb, char **pzOut){
  Snapshot *pWorker;              /* Worker snapshot */
  int bUnlock = 0;
  LsmString s;
  int rc;

  /* Obtain the worker snapshot */
  rc = infoGetWorker(pDb, &pWorker, &bUnlock);
  if( rc!=LSM_OK ) return rc;

  lsmStringInit(&s, pDb->pEnv);
  rc = lsmWalkFreelist(pDb, 0, infoFreelistCb, &s);
  if( rc!=LSM_OK ){
    lsmFree(pDb->pEnv, s.z);
  }else{
    *pzOut = s.z;
  }

  /* Release the snapshot and return */
  infoFreeWorker(pDb, bUnlock);
  return rc;
}

static int infoTreeSize(lsm_db *db, int *pnOldKB, int *pnNewKB){
  ShmHeader *pShm = db->pShmhdr;
  TreeHeader *p = &pShm->hdr1;

  /* The following code suffers from two race conditions, as it accesses and
  ** trusts the contents of shared memory without verifying checksums:
  **
  **   * The two values read - TreeHeader.root.nByte and oldroot.nByte - are 
  **     32-bit fields. It is assumed that reading from one of these
  **     is atomic - that it is not possible to read a partially written
  **     garbage value. However the two values may be mutually inconsistent. 
  **
  **   * TreeHeader.iLogOff is a 64-bit value. And lsmCheckpointLogOffset()
  **     reads a 64-bit value from a snapshot stored in shared memory. It
  **     is assumed that in each case it is possible to read a partially
  **     written garbage value. If this occurs, then the value returned
  **     for the size of the "old" tree may reflect the size of an "old"
  **     tree that was recently flushed to disk.
  **
  ** Given the context in which this function is called (as a result of an
  ** lsm_info(LSM_INFO_TREE_SIZE) request), neither of these are considered to
  ** be problems.
  */
  *pnNewKB = ((int)p->root.nByte + 1023) / 1024;
  if( p->iOldShmid ){
    if( p->iOldLog==lsmCheckpointLogOffset(pShm->aSnap1) ){
      *pnOldKB = 0;
    }else{
      *pnOldKB = ((int)p->oldroot.nByte + 1023) / 1024;
    }
  }else{
    *pnOldKB = 0;
  }

  return LSM_OK;
}

int lsm_info(lsm_db *pDb, int eParam, ...){
  int rc = LSM_OK;
  va_list ap;
  va_start(ap, eParam);

  switch( eParam ){
    case LSM_INFO_NWRITE: {
      int *piVal = va_arg(ap, int *);
      *piVal = lsmFsNWrite(pDb->pFS);
      break;
    }

    case LSM_INFO_NREAD: {
      int *piVal = va_arg(ap, int *);
      *piVal = lsmFsNRead(pDb->pFS);
      break;
    }

    case LSM_INFO_DB_STRUCTURE: {
      char **pzVal = va_arg(ap, char **);
      rc = lsmStructList(pDb, pzVal);
      break;
    }

    case LSM_INFO_ARRAY_STRUCTURE: {
      LsmPgno pgno = va_arg(ap, LsmPgno);
      char **pzVal = va_arg(ap, char **);
      rc = lsmInfoArrayStructure(pDb, 0, pgno, pzVal);
      break;
    }

    case LSM_INFO_ARRAY_PAGES: {
      LsmPgno pgno = va_arg(ap, LsmPgno);
      char **pzVal = va_arg(ap, char **);
      rc = lsmInfoArrayPages(pDb, pgno, pzVal);
      break;
    }

    case LSM_INFO_PAGE_HEX_DUMP:
    case LSM_INFO_PAGE_ASCII_DUMP: {
      LsmPgno pgno = va_arg(ap, LsmPgno);
      char **pzVal = va_arg(ap, char **);
      int bUnlock = 0;
      rc = infoGetWorker(pDb, 0, &bUnlock);
      if( rc==LSM_OK ){
        int bHex = (eParam==LSM_INFO_PAGE_HEX_DUMP);
        rc = lsmInfoPageDump(pDb, pgno, bHex, pzVal);
      }
      infoFreeWorker(pDb, bUnlock);
      break;
    }

    case LSM_INFO_LOG_STRUCTURE: {
      char **pzVal = va_arg(ap, char **);
      rc = lsmInfoLogStructure(pDb, pzVal);
      break;
    }

    case LSM_INFO_FREELIST: {
      char **pzVal = va_arg(ap, char **);
      rc = lsmInfoFreelist(pDb, pzVal);
      break;
    }

    case LSM_INFO_CHECKPOINT_SIZE: {
      int *pnKB = va_arg(ap, int *);
      rc = lsmCheckpointSize(pDb, pnKB);
      break;
    }

    case LSM_INFO_TREE_SIZE: {
      int *pnOld = va_arg(ap, int *);
      int *pnNew = va_arg(ap, int *);
      rc = infoTreeSize(pDb, pnOld, pnNew);
      break;
    }

    case LSM_INFO_COMPRESSION_ID: {
      unsigned int *piOut = va_arg(ap, unsigned int *);
      if( pDb->pClient ){
        *piOut = pDb->pClient->iCmpId;
      }else{
        rc = lsmInfoCompressionId(pDb, piOut);
      }
      break;
    }

    default:
      rc = LSM_MISUSE;
      break;
  }

  va_end(ap);
  return rc;
}

static int doWriteOp(
  lsm_db *pDb,
  int bDeleteRange,
  const void *pKey, int nKey,     /* Key to write or delete */
  const void *pVal, int nVal      /* Value to write. Or nVal==-1 for a delete */
){
  int rc = LSM_OK;                /* Return code */
  int bCommit = 0;                /* True to commit before returning */

  if( pDb->nTransOpen==0 ){
    bCommit = 1;
    rc = lsm_begin(pDb, 1);
  }

  if( rc==LSM_OK ){
    int eType = (bDeleteRange ? LSM_DRANGE : (nVal>=0?LSM_WRITE:LSM_DELETE));
    rc = lsmLogWrite(pDb, eType, (void *)pKey, nKey, (void *)pVal, nVal);
  }

  lsmSortedSaveTreeCursors(pDb);

  if( rc==LSM_OK ){
    int pgsz = lsmFsPageSize(pDb->pFS);
    int nQuant = LSM_AUTOWORK_QUANT * pgsz;
    int nBefore;
    int nAfter;
    int nDiff;

    if( nQuant>pDb->nTreeLimit ){
      nQuant = LSM_MAX(pDb->nTreeLimit, pgsz);
    }

    nBefore = lsmTreeSize(pDb);
    if( bDeleteRange ){
      rc = lsmTreeDelete(pDb, (void *)pKey, nKey, (void *)pVal, nVal);
    }else{
      rc = lsmTreeInsert(pDb, (void *)pKey, nKey, (void *)pVal, nVal);
    }

    nAfter = lsmTreeSize(pDb);
    nDiff = (nAfter/nQuant) - (nBefore/nQuant);
    if( rc==LSM_OK && pDb->bAutowork && nDiff!=0 ){
      rc = lsmSortedAutoWork(pDb, nDiff * LSM_AUTOWORK_QUANT);
    }
  }

  /* If a transaction was opened at the start of this function, commit it. 
  ** Or, if an error has occurred, roll it back.  */
  if( bCommit ){
    if( rc==LSM_OK ){
      rc = lsm_commit(pDb, 0);
    }else{
      lsm_rollback(pDb, 0);
    }
  }

  return rc;
}

/* 
** Write a new value into the database.
*/
int lsm_insert(
  lsm_db *db,                     /* Database connection */
  const void *pKey, int nKey,     /* Key to write or delete */
  const void *pVal, int nVal      /* Value to write. Or nVal==-1 for a delete */
){
  return doWriteOp(db, 0, pKey, nKey, pVal, nVal);
}

/*
** Delete a value from the database. 
*/
int lsm_delete(lsm_db *db, const void *pKey, int nKey){
  return doWriteOp(db, 0, pKey, nKey, 0, -1);
}

/*
** Delete a range of database keys.
*/
int lsm_delete_range(
  lsm_db *db,                     /* Database handle */
  const void *pKey1, int nKey1,   /* Lower bound of range to delete */
  const void *pKey2, int nKey2    /* Upper bound of range to delete */
){
  int rc = LSM_OK;
  if( db->xCmp((void *)pKey1, nKey1, (void *)pKey2, nKey2)<0 ){
    rc = doWriteOp(db, 1, pKey1, nKey1, pKey2, nKey2);
  }
  return rc;
}

/*
** Open a new cursor handle. 
**
** If there are currently no other open cursor handles, and no open write
** transaction, open a read transaction here.
*/
int lsm_csr_open(lsm_db *pDb, lsm_cursor **ppCsr){
  int rc = LSM_OK;                /* Return code */
  MultiCursor *pCsr = 0;          /* New cursor object */

  /* Open a read transaction if one is not already open. */
  assert_db_state(pDb);

  if( pDb->pShmhdr==0 ){
    assert( pDb->bReadonly );
    rc = lsmBeginRoTrans(pDb);
  }else if( pDb->iReader<0 ){
    rc = lsmBeginReadTrans(pDb);
  }

  /* Allocate the multi-cursor. */
  if( rc==LSM_OK ){
    rc = lsmMCursorNew(pDb, &pCsr);
  }

  /* If an error has occured, set the output to NULL and delete any partially
  ** allocated cursor. If this means there are no open cursors, release the
  ** client snapshot.  */
  if( rc!=LSM_OK ){
    lsmMCursorClose(pCsr, 0);
    dbReleaseClientSnapshot(pDb);
  }

  assert_db_state(pDb);
  *ppCsr = (lsm_cursor *)pCsr;
  return rc;
}

/*
** Close a cursor opened using lsm_csr_open().
*/
int lsm_csr_close(lsm_cursor *p){
  if( p ){
    lsm_db *pDb = lsmMCursorDb((MultiCursor *)p);
    assert_db_state(pDb);
    lsmMCursorClose((MultiCursor *)p, 1);
    dbReleaseClientSnapshot(pDb);
    assert_db_state(pDb);
  }
  return LSM_OK;
}

/*
** Attempt to seek the cursor to the database entry specified by pKey/nKey.
** If an error occurs (e.g. an OOM or IO error), return an LSM error code.
** Otherwise, return LSM_OK.
*/
int lsm_csr_seek(lsm_cursor *pCsr, const void *pKey, int nKey, int eSeek){
  return lsmMCursorSeek((MultiCursor *)pCsr, 0, (void *)pKey, nKey, eSeek);
}

int lsm_csr_next(lsm_cursor *pCsr){
  return lsmMCursorNext((MultiCursor *)pCsr);
}

int lsm_csr_prev(lsm_cursor *pCsr){
  return lsmMCursorPrev((MultiCursor *)pCsr);
}

int lsm_csr_first(lsm_cursor *pCsr){
  return lsmMCursorFirst((MultiCursor *)pCsr);
}

int lsm_csr_last(lsm_cursor *pCsr){
  return lsmMCursorLast((MultiCursor *)pCsr);
}

int lsm_csr_valid(lsm_cursor *pCsr){
  return lsmMCursorValid((MultiCursor *)pCsr);
}

int lsm_csr_key(lsm_cursor *pCsr, const void **ppKey, int *pnKey){
  return lsmMCursorKey((MultiCursor *)pCsr, (void **)ppKey, pnKey);
}

int lsm_csr_value(lsm_cursor *pCsr, const void **ppVal, int *pnVal){
  return lsmMCursorValue((MultiCursor *)pCsr, (void **)ppVal, pnVal);
}

void lsm_config_log(
  lsm_db *pDb, 
  void (*xLog)(void *, int, const char *), 
  void *pCtx
){
  pDb->xLog = xLog;
  pDb->pLogCtx = pCtx;
}

void lsm_config_work_hook(
  lsm_db *pDb, 
  void (*xWork)(lsm_db *, void *), 
  void *pCtx
){
  pDb->xWork = xWork;
  pDb->pWorkCtx = pCtx;
}

void lsmLogMessage(lsm_db *pDb, int rc, const char *zFormat, ...){
  if( pDb->xLog ){
    LsmString s;
    va_list ap, ap2;
    lsmStringInit(&s, pDb->pEnv);
    va_start(ap, zFormat);
    va_start(ap2, zFormat);
    lsmStringVAppendf(&s, zFormat, ap, ap2);
    va_end(ap);
    va_end(ap2);
    pDb->xLog(pDb->pLogCtx, rc, s.z);
    lsmStringClear(&s);
  }
}

int lsm_begin(lsm_db *pDb, int iLevel){
  int rc;

  assert_db_state( pDb );
  rc = (pDb->bReadonly ? LSM_READONLY : LSM_OK);

  /* A value less than zero means open one more transaction. */
  if( iLevel<0 ) iLevel = pDb->nTransOpen + 1;
  if( iLevel>pDb->nTransOpen ){
    int i;

    /* Extend the pDb->aTrans[] array if required. */
    if( rc==LSM_OK && pDb->nTransAlloc<iLevel ){
      TransMark *aNew;            /* New allocation */
      int nByte = sizeof(TransMark) * (iLevel+1);
      aNew = (TransMark *)lsmRealloc(pDb->pEnv, pDb->aTrans, nByte);
      if( !aNew ){
        rc = LSM_NOMEM;
      }else{
        nByte = sizeof(TransMark) * (iLevel+1 - pDb->nTransAlloc);
        memset(&aNew[pDb->nTransAlloc], 0, nByte);
        pDb->nTransAlloc = iLevel+1;
        pDb->aTrans = aNew;
      }
    }

    if( rc==LSM_OK && pDb->nTransOpen==0 ){
      rc = lsmBeginWriteTrans(pDb);
    }

    if( rc==LSM_OK ){
      for(i=pDb->nTransOpen; i<iLevel; i++){
        lsmTreeMark(pDb, &pDb->aTrans[i].tree);
        lsmLogTell(pDb, &pDb->aTrans[i].log);
      }
      pDb->nTransOpen = iLevel;
    }
  }

  return rc;
}

int lsm_commit(lsm_db *pDb, int iLevel){
  int rc = LSM_OK;

  assert_db_state( pDb );

  /* A value less than zero means close the innermost nested transaction. */
  if( iLevel<0 ) iLevel = LSM_MAX(0, pDb->nTransOpen - 1);

  if( iLevel<pDb->nTransOpen ){
    if( iLevel==0 ){
      int rc2;
      /* Commit the transaction to disk. */
      if( rc==LSM_OK ) rc = lsmLogCommit(pDb);
      if( rc==LSM_OK && pDb->eSafety==LSM_SAFETY_FULL ){
        rc = lsmFsSyncLog(pDb->pFS);
      }
      rc2 = lsmFinishWriteTrans(pDb, (rc==LSM_OK));
      if( rc==LSM_OK ) rc = rc2;
    }
    pDb->nTransOpen = iLevel;
  }
  dbReleaseClientSnapshot(pDb);
  return rc;
}

int lsm_rollback(lsm_db *pDb, int iLevel){
  int rc = LSM_OK;
  assert_db_state( pDb );

  if( pDb->nTransOpen ){
    /* A value less than zero means close the innermost nested transaction. */
    if( iLevel<0 ) iLevel = LSM_MAX(0, pDb->nTransOpen - 1);

    if( iLevel<=pDb->nTransOpen ){
      TransMark *pMark = &pDb->aTrans[(iLevel==0 ? 0 : iLevel-1)];
      lsmTreeRollback(pDb, &pMark->tree);
      if( iLevel ) lsmLogSeek(pDb, &pMark->log);
      pDb->nTransOpen = iLevel;
    }

    if( pDb->nTransOpen==0 ){
      lsmFinishWriteTrans(pDb, 0);
    }
    dbReleaseClientSnapshot(pDb);
  }

  return rc;
}

int lsm_get_user_version(lsm_db *pDb, unsigned int *piUsr){
  int rc = LSM_OK;                /* Return code */

  /* Open a read transaction if one is not already open. */
  assert_db_state(pDb);
  if( pDb->pShmhdr==0 ){
    assert( pDb->bReadonly );
    rc = lsmBeginRoTrans(pDb);
  }else if( pDb->iReader<0 ){
    rc = lsmBeginReadTrans(pDb);
  }

  /* Allocate the multi-cursor. */
  if( rc==LSM_OK ){
    *piUsr = pDb->treehdr.iUsrVersion;
  }

  dbReleaseClientSnapshot(pDb);
  assert_db_state(pDb);
  return rc;
}

int lsm_set_user_version(lsm_db *pDb, unsigned int iUsr){
  int rc = LSM_OK;                /* Return code */
  int bCommit = 0;                /* True to commit before returning */

  if( pDb->nTransOpen==0 ){
    bCommit = 1;
    rc = lsm_begin(pDb, 1);
  }

  if( rc==LSM_OK ){
    pDb->treehdr.iUsrVersion = iUsr;
  }

  /* If a transaction was opened at the start of this function, commit it. 
  ** Or, if an error has occurred, roll it back.  */
  if( bCommit ){
    if( rc==LSM_OK ){
      rc = lsm_commit(pDb, 0);
    }else{
      lsm_rollback(pDb, 0);
    }
  }

  return rc;
}
