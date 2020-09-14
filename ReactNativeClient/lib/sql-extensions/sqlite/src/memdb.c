/*
** 2016-09-07
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
** This file implements an in-memory VFS. A database is held as a contiguous
** block of memory.
**
** This file also implements interface sqlite3_serialize() and
** sqlite3_deserialize().
*/
#include "sqliteInt.h"
#ifdef SQLITE_ENABLE_DESERIALIZE

/*
** Forward declaration of objects used by this utility
*/
typedef struct sqlite3_vfs MemVfs;
typedef struct MemFile MemFile;

/* Access to a lower-level VFS that (might) implement dynamic loading,
** access to randomness, etc.
*/
#define ORIGVFS(p) ((sqlite3_vfs*)((p)->pAppData))

/* An open file */
struct MemFile {
  sqlite3_file base;              /* IO methods */
  sqlite3_int64 sz;               /* Size of the file */
  sqlite3_int64 szAlloc;          /* Space allocated to aData */
  sqlite3_int64 szMax;            /* Maximum allowed size of the file */
  unsigned char *aData;           /* content of the file */
  int nMmap;                      /* Number of memory mapped pages */
  unsigned mFlags;                /* Flags */
  int eLock;                      /* Most recent lock against this file */
};

/*
** Methods for MemFile
*/
static int memdbClose(sqlite3_file*);
static int memdbRead(sqlite3_file*, void*, int iAmt, sqlite3_int64 iOfst);
static int memdbWrite(sqlite3_file*,const void*,int iAmt, sqlite3_int64 iOfst);
static int memdbTruncate(sqlite3_file*, sqlite3_int64 size);
static int memdbSync(sqlite3_file*, int flags);
static int memdbFileSize(sqlite3_file*, sqlite3_int64 *pSize);
static int memdbLock(sqlite3_file*, int);
/* static int memdbCheckReservedLock(sqlite3_file*, int *pResOut);// not used */
static int memdbFileControl(sqlite3_file*, int op, void *pArg);
/* static int memdbSectorSize(sqlite3_file*); // not used */
static int memdbDeviceCharacteristics(sqlite3_file*);
static int memdbFetch(sqlite3_file*, sqlite3_int64 iOfst, int iAmt, void **pp);
static int memdbUnfetch(sqlite3_file*, sqlite3_int64 iOfst, void *p);

/*
** Methods for MemVfs
*/
static int memdbOpen(sqlite3_vfs*, const char *, sqlite3_file*, int , int *);
/* static int memdbDelete(sqlite3_vfs*, const char *zName, int syncDir); */
static int memdbAccess(sqlite3_vfs*, const char *zName, int flags, int *);
static int memdbFullPathname(sqlite3_vfs*, const char *zName, int, char *zOut);
static void *memdbDlOpen(sqlite3_vfs*, const char *zFilename);
static void memdbDlError(sqlite3_vfs*, int nByte, char *zErrMsg);
static void (*memdbDlSym(sqlite3_vfs *pVfs, void *p, const char*zSym))(void);
static void memdbDlClose(sqlite3_vfs*, void*);
static int memdbRandomness(sqlite3_vfs*, int nByte, char *zOut);
static int memdbSleep(sqlite3_vfs*, int microseconds);
/* static int memdbCurrentTime(sqlite3_vfs*, double*); */
static int memdbGetLastError(sqlite3_vfs*, int, char *);
static int memdbCurrentTimeInt64(sqlite3_vfs*, sqlite3_int64*);

static sqlite3_vfs memdb_vfs = {
  2,                           /* iVersion */
  0,                           /* szOsFile (set when registered) */
  1024,                        /* mxPathname */
  0,                           /* pNext */
  "memdb",                     /* zName */
  0,                           /* pAppData (set when registered) */ 
  memdbOpen,                   /* xOpen */
  0, /* memdbDelete, */        /* xDelete */
  memdbAccess,                 /* xAccess */
  memdbFullPathname,           /* xFullPathname */
  memdbDlOpen,                 /* xDlOpen */
  memdbDlError,                /* xDlError */
  memdbDlSym,                  /* xDlSym */
  memdbDlClose,                /* xDlClose */
  memdbRandomness,             /* xRandomness */
  memdbSleep,                  /* xSleep */
  0, /* memdbCurrentTime, */   /* xCurrentTime */
  memdbGetLastError,           /* xGetLastError */
  memdbCurrentTimeInt64        /* xCurrentTimeInt64 */
};

static const sqlite3_io_methods memdb_io_methods = {
  3,                              /* iVersion */
  memdbClose,                      /* xClose */
  memdbRead,                       /* xRead */
  memdbWrite,                      /* xWrite */
  memdbTruncate,                   /* xTruncate */
  memdbSync,                       /* xSync */
  memdbFileSize,                   /* xFileSize */
  memdbLock,                       /* xLock */
  memdbLock,                       /* xUnlock - same as xLock in this case */ 
  0, /* memdbCheckReservedLock, */ /* xCheckReservedLock */
  memdbFileControl,                /* xFileControl */
  0, /* memdbSectorSize,*/         /* xSectorSize */
  memdbDeviceCharacteristics,      /* xDeviceCharacteristics */
  0,                               /* xShmMap */
  0,                               /* xShmLock */
  0,                               /* xShmBarrier */
  0,                               /* xShmUnmap */
  memdbFetch,                      /* xFetch */
  memdbUnfetch                     /* xUnfetch */
};



/*
** Close an memdb-file.
**
** The pData pointer is owned by the application, so there is nothing
** to free.
*/
static int memdbClose(sqlite3_file *pFile){
  MemFile *p = (MemFile *)pFile;
  if( p->mFlags & SQLITE_DESERIALIZE_FREEONCLOSE ) sqlite3_free(p->aData);
  return SQLITE_OK;
}

/*
** Read data from an memdb-file.
*/
static int memdbRead(
  sqlite3_file *pFile, 
  void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  MemFile *p = (MemFile *)pFile;
  if( iOfst+iAmt>p->sz ){
    memset(zBuf, 0, iAmt);
    if( iOfst<p->sz ) memcpy(zBuf, p->aData+iOfst, p->sz - iOfst);
    return SQLITE_IOERR_SHORT_READ;
  }
  memcpy(zBuf, p->aData+iOfst, iAmt);
  return SQLITE_OK;
}

/*
** Try to enlarge the memory allocation to hold at least sz bytes
*/
static int memdbEnlarge(MemFile *p, sqlite3_int64 newSz){
  unsigned char *pNew;
  if( (p->mFlags & SQLITE_DESERIALIZE_RESIZEABLE)==0 || p->nMmap>0 ){
    return SQLITE_FULL;
  }
  if( newSz>p->szMax ){
    return SQLITE_FULL;
  }
  newSz *= 2;
  if( newSz>p->szMax ) newSz = p->szMax;
  pNew = sqlite3Realloc(p->aData, newSz);
  if( pNew==0 ) return SQLITE_NOMEM;
  p->aData = pNew;
  p->szAlloc = newSz;
  return SQLITE_OK;
}

/*
** Write data to an memdb-file.
*/
static int memdbWrite(
  sqlite3_file *pFile,
  const void *z,
  int iAmt,
  sqlite_int64 iOfst
){
  MemFile *p = (MemFile *)pFile;
  if( NEVER(p->mFlags & SQLITE_DESERIALIZE_READONLY) ) return SQLITE_READONLY;
  if( iOfst+iAmt>p->sz ){
    int rc;
    if( iOfst+iAmt>p->szAlloc
     && (rc = memdbEnlarge(p, iOfst+iAmt))!=SQLITE_OK
    ){
      return rc;
    }
    if( iOfst>p->sz ) memset(p->aData+p->sz, 0, iOfst-p->sz);
    p->sz = iOfst+iAmt;
  }
  memcpy(p->aData+iOfst, z, iAmt);
  return SQLITE_OK;
}

/*
** Truncate an memdb-file.
**
** In rollback mode (which is always the case for memdb, as it does not
** support WAL mode) the truncate() method is only used to reduce
** the size of a file, never to increase the size.
*/
static int memdbTruncate(sqlite3_file *pFile, sqlite_int64 size){
  MemFile *p = (MemFile *)pFile;
  if( NEVER(size>p->sz) ) return SQLITE_FULL;
  p->sz = size; 
  return SQLITE_OK;
}

/*
** Sync an memdb-file.
*/
static int memdbSync(sqlite3_file *pFile, int flags){
  return SQLITE_OK;
}

/*
** Return the current file-size of an memdb-file.
*/
static int memdbFileSize(sqlite3_file *pFile, sqlite_int64 *pSize){
  MemFile *p = (MemFile *)pFile;
  *pSize = p->sz;
  return SQLITE_OK;
}

/*
** Lock an memdb-file.
*/
static int memdbLock(sqlite3_file *pFile, int eLock){
  MemFile *p = (MemFile *)pFile;
  if( eLock>SQLITE_LOCK_SHARED 
   && (p->mFlags & SQLITE_DESERIALIZE_READONLY)!=0
  ){
    return SQLITE_READONLY;
  }
  p->eLock = eLock;
  return SQLITE_OK;
}

#if 0 /* Never used because memdbAccess() always returns false */
/*
** Check if another file-handle holds a RESERVED lock on an memdb-file.
*/
static int memdbCheckReservedLock(sqlite3_file *pFile, int *pResOut){
  *pResOut = 0;
  return SQLITE_OK;
}
#endif

/*
** File control method. For custom operations on an memdb-file.
*/
static int memdbFileControl(sqlite3_file *pFile, int op, void *pArg){
  MemFile *p = (MemFile *)pFile;
  int rc = SQLITE_NOTFOUND;
  if( op==SQLITE_FCNTL_VFSNAME ){
    *(char**)pArg = sqlite3_mprintf("memdb(%p,%lld)", p->aData, p->sz);
    rc = SQLITE_OK;
  }
  if( op==SQLITE_FCNTL_SIZE_LIMIT ){
    sqlite3_int64 iLimit = *(sqlite3_int64*)pArg;
    if( iLimit<p->sz ){
      if( iLimit<0 ){
        iLimit = p->szMax;
      }else{
        iLimit = p->sz;
      }
    }
    p->szMax = iLimit;
    *(sqlite3_int64*)pArg = iLimit;
    rc = SQLITE_OK;
  }
  return rc;
}

#if 0  /* Not used because of SQLITE_IOCAP_POWERSAFE_OVERWRITE */
/*
** Return the sector-size in bytes for an memdb-file.
*/
static int memdbSectorSize(sqlite3_file *pFile){
  return 1024;
}
#endif

/*
** Return the device characteristic flags supported by an memdb-file.
*/
static int memdbDeviceCharacteristics(sqlite3_file *pFile){
  return SQLITE_IOCAP_ATOMIC | 
         SQLITE_IOCAP_POWERSAFE_OVERWRITE |
         SQLITE_IOCAP_SAFE_APPEND |
         SQLITE_IOCAP_SEQUENTIAL;
}

/* Fetch a page of a memory-mapped file */
static int memdbFetch(
  sqlite3_file *pFile,
  sqlite3_int64 iOfst,
  int iAmt,
  void **pp
){
  MemFile *p = (MemFile *)pFile;
  if( iOfst+iAmt>p->sz ){
    *pp = 0;
  }else{
    p->nMmap++;
    *pp = (void*)(p->aData + iOfst);
  }
  return SQLITE_OK;
}

/* Release a memory-mapped page */
static int memdbUnfetch(sqlite3_file *pFile, sqlite3_int64 iOfst, void *pPage){
  MemFile *p = (MemFile *)pFile;
  p->nMmap--;
  return SQLITE_OK;
}

/*
** Open an mem file handle.
*/
static int memdbOpen(
  sqlite3_vfs *pVfs,
  const char *zName,
  sqlite3_file *pFile,
  int flags,
  int *pOutFlags
){
  MemFile *p = (MemFile*)pFile;
  if( (flags & SQLITE_OPEN_MAIN_DB)==0 ){
    return ORIGVFS(pVfs)->xOpen(ORIGVFS(pVfs), zName, pFile, flags, pOutFlags);
  }
  memset(p, 0, sizeof(*p));
  p->mFlags = SQLITE_DESERIALIZE_RESIZEABLE | SQLITE_DESERIALIZE_FREEONCLOSE;
  assert( pOutFlags!=0 );  /* True because flags==SQLITE_OPEN_MAIN_DB */
  *pOutFlags = flags | SQLITE_OPEN_MEMORY;
  pFile->pMethods = &memdb_io_methods;
  p->szMax = sqlite3GlobalConfig.mxMemdbSize;
  return SQLITE_OK;
}

#if 0 /* Only used to delete rollback journals, super-journals, and WAL
      ** files, none of which exist in memdb.  So this routine is never used */
/*
** Delete the file located at zPath. If the dirSync argument is true,
** ensure the file-system modifications are synced to disk before
** returning.
*/
static int memdbDelete(sqlite3_vfs *pVfs, const char *zPath, int dirSync){
  return SQLITE_IOERR_DELETE;
}
#endif

/*
** Test for access permissions. Return true if the requested permission
** is available, or false otherwise.
**
** With memdb, no files ever exist on disk.  So always return false.
*/
static int memdbAccess(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int flags, 
  int *pResOut
){
  *pResOut = 0;
  return SQLITE_OK;
}

/*
** Populate buffer zOut with the full canonical pathname corresponding
** to the pathname in zPath. zOut is guaranteed to point to a buffer
** of at least (INST_MAX_PATHNAME+1) bytes.
*/
static int memdbFullPathname(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int nOut, 
  char *zOut
){
  sqlite3_snprintf(nOut, zOut, "%s", zPath);
  return SQLITE_OK;
}

/*
** Open the dynamic library located at zPath and return a handle.
*/
static void *memdbDlOpen(sqlite3_vfs *pVfs, const char *zPath){
  return ORIGVFS(pVfs)->xDlOpen(ORIGVFS(pVfs), zPath);
}

/*
** Populate the buffer zErrMsg (size nByte bytes) with a human readable
** utf-8 string describing the most recent error encountered associated 
** with dynamic libraries.
*/
static void memdbDlError(sqlite3_vfs *pVfs, int nByte, char *zErrMsg){
  ORIGVFS(pVfs)->xDlError(ORIGVFS(pVfs), nByte, zErrMsg);
}

/*
** Return a pointer to the symbol zSymbol in the dynamic library pHandle.
*/
static void (*memdbDlSym(sqlite3_vfs *pVfs, void *p, const char *zSym))(void){
  return ORIGVFS(pVfs)->xDlSym(ORIGVFS(pVfs), p, zSym);
}

/*
** Close the dynamic library handle pHandle.
*/
static void memdbDlClose(sqlite3_vfs *pVfs, void *pHandle){
  ORIGVFS(pVfs)->xDlClose(ORIGVFS(pVfs), pHandle);
}

/*
** Populate the buffer pointed to by zBufOut with nByte bytes of 
** random data.
*/
static int memdbRandomness(sqlite3_vfs *pVfs, int nByte, char *zBufOut){
  return ORIGVFS(pVfs)->xRandomness(ORIGVFS(pVfs), nByte, zBufOut);
}

/*
** Sleep for nMicro microseconds. Return the number of microseconds 
** actually slept.
*/
static int memdbSleep(sqlite3_vfs *pVfs, int nMicro){
  return ORIGVFS(pVfs)->xSleep(ORIGVFS(pVfs), nMicro);
}

#if 0  /* Never used.  Modern cores only call xCurrentTimeInt64() */
/*
** Return the current time as a Julian Day number in *pTimeOut.
*/
static int memdbCurrentTime(sqlite3_vfs *pVfs, double *pTimeOut){
  return ORIGVFS(pVfs)->xCurrentTime(ORIGVFS(pVfs), pTimeOut);
}
#endif

static int memdbGetLastError(sqlite3_vfs *pVfs, int a, char *b){
  return ORIGVFS(pVfs)->xGetLastError(ORIGVFS(pVfs), a, b);
}
static int memdbCurrentTimeInt64(sqlite3_vfs *pVfs, sqlite3_int64 *p){
  return ORIGVFS(pVfs)->xCurrentTimeInt64(ORIGVFS(pVfs), p);
}

/*
** Translate a database connection pointer and schema name into a
** MemFile pointer.
*/
static MemFile *memdbFromDbSchema(sqlite3 *db, const char *zSchema){
  MemFile *p = 0;
  int rc = sqlite3_file_control(db, zSchema, SQLITE_FCNTL_FILE_POINTER, &p);
  if( rc ) return 0;
  if( p->base.pMethods!=&memdb_io_methods ) return 0;
  return p;
}

/*
** Return the serialization of a database
*/
unsigned char *sqlite3_serialize(
  sqlite3 *db,              /* The database connection */
  const char *zSchema,      /* Which database within the connection */
  sqlite3_int64 *piSize,    /* Write size here, if not NULL */
  unsigned int mFlags       /* Maybe SQLITE_SERIALIZE_NOCOPY */
){
  MemFile *p;
  int iDb;
  Btree *pBt;
  sqlite3_int64 sz;
  int szPage = 0;
  sqlite3_stmt *pStmt = 0;
  unsigned char *pOut;
  char *zSql;
  int rc;

#ifdef SQLITE_ENABLE_API_ARMOR
  if( !sqlite3SafetyCheckOk(db) ){
    (void)SQLITE_MISUSE_BKPT;
    return 0;
  }
#endif

  if( zSchema==0 ) zSchema = db->aDb[0].zDbSName;
  p = memdbFromDbSchema(db, zSchema);
  iDb = sqlite3FindDbName(db, zSchema);
  if( piSize ) *piSize = -1;
  if( iDb<0 ) return 0;
  if( p ){
    if( piSize ) *piSize = p->sz;
    if( mFlags & SQLITE_SERIALIZE_NOCOPY ){
      pOut = p->aData;
    }else{
      pOut = sqlite3_malloc64( p->sz );
      if( pOut ) memcpy(pOut, p->aData, p->sz);
    }
    return pOut;
  }
  pBt = db->aDb[iDb].pBt;
  if( pBt==0 ) return 0;
  szPage = sqlite3BtreeGetPageSize(pBt);
  zSql = sqlite3_mprintf("PRAGMA \"%w\".page_count", zSchema);
  rc = zSql ? sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0) : SQLITE_NOMEM;
  sqlite3_free(zSql);
  if( rc ) return 0;
  rc = sqlite3_step(pStmt);
  if( rc!=SQLITE_ROW ){
    pOut = 0;
  }else{
    sz = sqlite3_column_int64(pStmt, 0)*szPage;
    if( piSize ) *piSize = sz;
    if( mFlags & SQLITE_SERIALIZE_NOCOPY ){
      pOut = 0;
    }else{
      pOut = sqlite3_malloc64( sz );
      if( pOut ){
        int nPage = sqlite3_column_int(pStmt, 0);
        Pager *pPager = sqlite3BtreePager(pBt);
        int pgno;
        for(pgno=1; pgno<=nPage; pgno++){
          DbPage *pPage = 0;
          unsigned char *pTo = pOut + szPage*(sqlite3_int64)(pgno-1);
          rc = sqlite3PagerGet(pPager, pgno, (DbPage**)&pPage, 0);
          if( rc==SQLITE_OK ){
            memcpy(pTo, sqlite3PagerGetData(pPage), szPage);
          }else{
            memset(pTo, 0, szPage);
          }
          sqlite3PagerUnref(pPage);       
        }
      }
    }
  }
  sqlite3_finalize(pStmt);
  return pOut;
}

/* Convert zSchema to a MemDB and initialize its content.
*/
int sqlite3_deserialize(
  sqlite3 *db,            /* The database connection */
  const char *zSchema,    /* Which DB to reopen with the deserialization */
  unsigned char *pData,   /* The serialized database content */
  sqlite3_int64 szDb,     /* Number bytes in the deserialization */
  sqlite3_int64 szBuf,    /* Total size of buffer pData[] */
  unsigned mFlags         /* Zero or more SQLITE_DESERIALIZE_* flags */
){
  MemFile *p;
  char *zSql;
  sqlite3_stmt *pStmt = 0;
  int rc;
  int iDb;

#ifdef SQLITE_ENABLE_API_ARMOR
  if( !sqlite3SafetyCheckOk(db) ){
    return SQLITE_MISUSE_BKPT;
  }
  if( szDb<0 ) return SQLITE_MISUSE_BKPT;
  if( szBuf<0 ) return SQLITE_MISUSE_BKPT;
#endif

  sqlite3_mutex_enter(db->mutex);
  if( zSchema==0 ) zSchema = db->aDb[0].zDbSName;
  iDb = sqlite3FindDbName(db, zSchema);
  if( iDb<0 ){
    rc = SQLITE_ERROR;
    goto end_deserialize;
  }    
  zSql = sqlite3_mprintf("ATTACH x AS %Q", zSchema);
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  sqlite3_free(zSql);
  if( rc ) goto end_deserialize;
  db->init.iDb = (u8)iDb;
  db->init.reopenMemdb = 1;
  rc = sqlite3_step(pStmt);
  db->init.reopenMemdb = 0;
  if( rc!=SQLITE_DONE ){
    rc = SQLITE_ERROR;
    goto end_deserialize;
  }
  p = memdbFromDbSchema(db, zSchema);
  if( p==0 ){
    rc = SQLITE_ERROR;
  }else{
    p->aData = pData;
    p->sz = szDb;
    p->szAlloc = szBuf;
    p->szMax = szBuf;
    if( p->szMax<sqlite3GlobalConfig.mxMemdbSize ){
      p->szMax = sqlite3GlobalConfig.mxMemdbSize;
    }
    p->mFlags = mFlags;
    rc = SQLITE_OK;
  }

end_deserialize:
  sqlite3_finalize(pStmt);
  sqlite3_mutex_leave(db->mutex);
  return rc;
}

/* 
** This routine is called when the extension is loaded.
** Register the new VFS.
*/
int sqlite3MemdbInit(void){
  sqlite3_vfs *pLower = sqlite3_vfs_find(0);
  int sz = pLower->szOsFile;
  memdb_vfs.pAppData = pLower;
  /* The following conditional can only be true when compiled for
  ** Windows x86 and SQLITE_MAX_MMAP_SIZE=0.  We always leave
  ** it in, to be safe, but it is marked as NO_TEST since there
  ** is no way to reach it under most builds. */
  if( sz<sizeof(MemFile) ) sz = sizeof(MemFile); /*NO_TEST*/
  memdb_vfs.szOsFile = sz;
  return sqlite3_vfs_register(&memdb_vfs, 0);
}
#endif /* SQLITE_ENABLE_DESERIALIZE */
