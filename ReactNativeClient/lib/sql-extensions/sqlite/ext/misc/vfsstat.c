/*
** 2016-05-27
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
** This file contains the implementation of an SQLite vfs shim that
** tracks I/O.  Access to the accumulated status counts is provided using
** an eponymous virtual table.
*/
#include <sqlite3ext.h>
SQLITE_EXTENSION_INIT1

/*
** This module contains code for a wrapper VFS that cause stats for
** most VFS calls to be recorded.
**
** To use this module, first compile it as a loadable extension.  See
** https://www.sqlite.org/loadext.html#build for compilations instructions.
**
** After compliing, load this extension, then open database connections to be
** measured.  Query usages status using the vfsstat virtual table:
**
**         SELECT * FROM vfsstat;
**
** Reset counters using UPDATE statements against vfsstat:
**
**         UPDATE vfsstat SET count=0;
**
** EXAMPLE SCRIPT:
**
**      .load ./vfsstat
**      .open test.db
**      DROP TABLE IF EXISTS t1;
**      CREATE TABLE t1(x,y);
**      INSERT INTO t1 VALUES(123, randomblob(5000));
**      CREATE INDEX t1x ON t1(x);
**      DROP TABLE t1;
**      VACUUM;
**      SELECT * FROM vfsstat WHERE count>0;
**
** LIMITATIONS:
** 
** This module increments counters without using mutex protection.  So if
** two or more threads try to use this module at the same time, race conditions
** may occur which mess up the counts.  This is harmless, other than giving
** incorrect statistics.
*/
#include <string.h>
#include <stdlib.h>
#include <assert.h>

/*
** File types
*/
#define VFSSTAT_MAIN         0   /* Main database file */
#define VFSSTAT_JOURNAL      1   /* Rollback journal */
#define VFSSTAT_WAL          2   /* Write-ahead log file */
#define VFSSTAT_MASTERJRNL   3   /* Master journal */
#define VFSSTAT_SUBJRNL      4   /* Subjournal */
#define VFSSTAT_TEMPDB       5   /* TEMP database */
#define VFSSTAT_TEMPJRNL     6   /* Journal for TEMP database */
#define VFSSTAT_TRANSIENT    7   /* Transient database */
#define VFSSTAT_ANY          8   /* Unspecified file type */
#define VFSSTAT_nFile        9   /* This many file types */

/* Names of the file types.  These are allowed values for the
** first column of the vfsstat virtual table.
*/
static const char *azFile[] = {
  "database", "journal", "wal", "master-journal", "sub-journal",
  "temp-database", "temp-journal", "transient-db", "*"
};

/*
** Stat types
*/
#define VFSSTAT_BYTESIN      0   /* Bytes read in */
#define VFSSTAT_BYTESOUT     1   /* Bytes written out */   
#define VFSSTAT_READ         2   /* Read requests */
#define VFSSTAT_WRITE        3   /* Write requests */
#define VFSSTAT_SYNC         4   /* Syncs */
#define VFSSTAT_OPEN         5   /* File opens */
#define VFSSTAT_LOCK         6   /* Lock requests */
#define VFSSTAT_ACCESS       0   /* xAccess calls.  filetype==ANY only */
#define VFSSTAT_DELETE       1   /* xDelete calls.  filetype==ANY only */
#define VFSSTAT_FULLPATH     2   /* xFullPathname calls.  ANY only */
#define VFSSTAT_RANDOM       3   /* xRandomness calls.    ANY only */
#define VFSSTAT_SLEEP        4   /* xSleep calls.         ANY only */
#define VFSSTAT_CURTIME      5   /* xCurrentTime calls.   ANY only */
#define VFSSTAT_nStat        7   /* This many stat types */


/* Names for the second column of the vfsstat virtual table for all
** cases except when the first column is "*" or VFSSTAT_ANY. */
static const char *azStat[] = {
  "bytes-in", "bytes-out", "read", "write", "sync", "open", "lock",
};
static const char *azStatAny[] = {
  "access", "delete", "fullpathname", "randomness", "sleep", "currenttimestamp",
  "not-used"
};

/* Total number of counters */
#define VFSSTAT_MXCNT  (VFSSTAT_nStat*VFSSTAT_nFile)

/*
** Performance stats are collected in an instance of the following
** global array.
*/
static sqlite3_uint64 aVfsCnt[VFSSTAT_MXCNT];

/*
** Access to a specific counter
*/
#define STATCNT(filetype,stat) (aVfsCnt[(filetype)*VFSSTAT_nStat+(stat)])

/*
** Forward declaration of objects used by this utility
*/
typedef struct VStatVfs VStatVfs;
typedef struct VStatFile VStatFile;

/* An instance of the VFS */
struct VStatVfs {
  sqlite3_vfs base;               /* VFS methods */
  sqlite3_vfs *pVfs;              /* Parent VFS */
};

/* An open file */
struct VStatFile {
  sqlite3_file base;              /* IO methods */
  sqlite3_file *pReal;            /* Underlying file handle */
  unsigned char eFiletype;        /* What type of file is this */
};

#define REALVFS(p) (((VStatVfs*)(p))->pVfs)

/*
** Methods for VStatFile
*/
static int vstatClose(sqlite3_file*);
static int vstatRead(sqlite3_file*, void*, int iAmt, sqlite3_int64 iOfst);
static int vstatWrite(sqlite3_file*,const void*,int iAmt, sqlite3_int64 iOfst);
static int vstatTruncate(sqlite3_file*, sqlite3_int64 size);
static int vstatSync(sqlite3_file*, int flags);
static int vstatFileSize(sqlite3_file*, sqlite3_int64 *pSize);
static int vstatLock(sqlite3_file*, int);
static int vstatUnlock(sqlite3_file*, int);
static int vstatCheckReservedLock(sqlite3_file*, int *pResOut);
static int vstatFileControl(sqlite3_file*, int op, void *pArg);
static int vstatSectorSize(sqlite3_file*);
static int vstatDeviceCharacteristics(sqlite3_file*);
static int vstatShmMap(sqlite3_file*, int iPg, int pgsz, int, void volatile**);
static int vstatShmLock(sqlite3_file*, int offset, int n, int flags);
static void vstatShmBarrier(sqlite3_file*);
static int vstatShmUnmap(sqlite3_file*, int deleteFlag);
static int vstatFetch(sqlite3_file*, sqlite3_int64 iOfst, int iAmt, void **pp);
static int vstatUnfetch(sqlite3_file*, sqlite3_int64 iOfst, void *p);

/*
** Methods for VStatVfs
*/
static int vstatOpen(sqlite3_vfs*, const char *, sqlite3_file*, int , int *);
static int vstatDelete(sqlite3_vfs*, const char *zName, int syncDir);
static int vstatAccess(sqlite3_vfs*, const char *zName, int flags, int *);
static int vstatFullPathname(sqlite3_vfs*, const char *zName, int, char *zOut);
static void *vstatDlOpen(sqlite3_vfs*, const char *zFilename);
static void vstatDlError(sqlite3_vfs*, int nByte, char *zErrMsg);
static void (*vstatDlSym(sqlite3_vfs *pVfs, void *p, const char*zSym))(void);
static void vstatDlClose(sqlite3_vfs*, void*);
static int vstatRandomness(sqlite3_vfs*, int nByte, char *zOut);
static int vstatSleep(sqlite3_vfs*, int microseconds);
static int vstatCurrentTime(sqlite3_vfs*, double*);
static int vstatGetLastError(sqlite3_vfs*, int, char *);
static int vstatCurrentTimeInt64(sqlite3_vfs*, sqlite3_int64*);

static VStatVfs vstat_vfs = {
  {
    2,                            /* iVersion */
    0,                            /* szOsFile (set by register_vstat()) */
    1024,                         /* mxPathname */
    0,                            /* pNext */
    "vfslog",                     /* zName */
    0,                            /* pAppData */
    vstatOpen,                     /* xOpen */
    vstatDelete,                   /* xDelete */
    vstatAccess,                   /* xAccess */
    vstatFullPathname,             /* xFullPathname */
    vstatDlOpen,                   /* xDlOpen */
    vstatDlError,                  /* xDlError */
    vstatDlSym,                    /* xDlSym */
    vstatDlClose,                  /* xDlClose */
    vstatRandomness,               /* xRandomness */
    vstatSleep,                    /* xSleep */
    vstatCurrentTime,              /* xCurrentTime */
    vstatGetLastError,             /* xGetLastError */
    vstatCurrentTimeInt64          /* xCurrentTimeInt64 */
  },
  0
};

static const sqlite3_io_methods vstat_io_methods = {
  3,                              /* iVersion */
  vstatClose,                      /* xClose */
  vstatRead,                       /* xRead */
  vstatWrite,                      /* xWrite */
  vstatTruncate,                   /* xTruncate */
  vstatSync,                       /* xSync */
  vstatFileSize,                   /* xFileSize */
  vstatLock,                       /* xLock */
  vstatUnlock,                     /* xUnlock */
  vstatCheckReservedLock,          /* xCheckReservedLock */
  vstatFileControl,                /* xFileControl */
  vstatSectorSize,                 /* xSectorSize */
  vstatDeviceCharacteristics,      /* xDeviceCharacteristics */
  vstatShmMap,                     /* xShmMap */
  vstatShmLock,                    /* xShmLock */
  vstatShmBarrier,                 /* xShmBarrier */
  vstatShmUnmap,                   /* xShmUnmap */
  vstatFetch,                      /* xFetch */
  vstatUnfetch                     /* xUnfetch */
};



/*
** Close an vstat-file.
*/
static int vstatClose(sqlite3_file *pFile){
  VStatFile *p = (VStatFile *)pFile;
  int rc = SQLITE_OK;

  if( p->pReal->pMethods ){
    rc = p->pReal->pMethods->xClose(p->pReal);
  }
  return rc;
}


/*
** Read data from an vstat-file.
*/
static int vstatRead(
  sqlite3_file *pFile, 
  void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  int rc;
  VStatFile *p = (VStatFile *)pFile;

  rc = p->pReal->pMethods->xRead(p->pReal, zBuf, iAmt, iOfst);
  STATCNT(p->eFiletype,VFSSTAT_READ)++;
  if( rc==SQLITE_OK ){
    STATCNT(p->eFiletype,VFSSTAT_BYTESIN) += iAmt;
  }
  return rc;
}

/*
** Write data to an vstat-file.
*/
static int vstatWrite(
  sqlite3_file *pFile,
  const void *z,
  int iAmt,
  sqlite_int64 iOfst
){
  int rc;
  VStatFile *p = (VStatFile *)pFile;

  rc = p->pReal->pMethods->xWrite(p->pReal, z, iAmt, iOfst);
  STATCNT(p->eFiletype,VFSSTAT_WRITE)++;
  if( rc==SQLITE_OK ){
    STATCNT(p->eFiletype,VFSSTAT_BYTESOUT) += iAmt;
  }
  return rc;
}

/*
** Truncate an vstat-file.
*/
static int vstatTruncate(sqlite3_file *pFile, sqlite_int64 size){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xTruncate(p->pReal, size);
  return rc;
}

/*
** Sync an vstat-file.
*/
static int vstatSync(sqlite3_file *pFile, int flags){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xSync(p->pReal, flags);
  STATCNT(p->eFiletype,VFSSTAT_SYNC)++;
  return rc;
}

/*
** Return the current file-size of an vstat-file.
*/
static int vstatFileSize(sqlite3_file *pFile, sqlite_int64 *pSize){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xFileSize(p->pReal, pSize);
  return rc;
}

/*
** Lock an vstat-file.
*/
static int vstatLock(sqlite3_file *pFile, int eLock){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xLock(p->pReal, eLock);
  STATCNT(p->eFiletype,VFSSTAT_LOCK)++;
  return rc;
}

/*
** Unlock an vstat-file.
*/
static int vstatUnlock(sqlite3_file *pFile, int eLock){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xUnlock(p->pReal, eLock);
  STATCNT(p->eFiletype,VFSSTAT_LOCK)++;
  return rc;
}

/*
** Check if another file-handle holds a RESERVED lock on an vstat-file.
*/
static int vstatCheckReservedLock(sqlite3_file *pFile, int *pResOut){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xCheckReservedLock(p->pReal, pResOut);
  STATCNT(p->eFiletype,VFSSTAT_LOCK)++;
  return rc;
}

/*
** File control method. For custom operations on an vstat-file.
*/
static int vstatFileControl(sqlite3_file *pFile, int op, void *pArg){
  VStatFile *p = (VStatFile *)pFile;
  int rc;
  rc = p->pReal->pMethods->xFileControl(p->pReal, op, pArg);
  if( op==SQLITE_FCNTL_VFSNAME && rc==SQLITE_OK ){
    *(char**)pArg = sqlite3_mprintf("vstat/%z", *(char**)pArg);
  }
  return rc;
}

/*
** Return the sector-size in bytes for an vstat-file.
*/
static int vstatSectorSize(sqlite3_file *pFile){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xSectorSize(p->pReal);
  return rc;
}

/*
** Return the device characteristic flags supported by an vstat-file.
*/
static int vstatDeviceCharacteristics(sqlite3_file *pFile){
  int rc;
  VStatFile *p = (VStatFile *)pFile;
  rc = p->pReal->pMethods->xDeviceCharacteristics(p->pReal);
  return rc;
}

/* Create a shared memory file mapping */
static int vstatShmMap(
  sqlite3_file *pFile,
  int iPg,
  int pgsz,
  int bExtend,
  void volatile **pp
){
  VStatFile *p = (VStatFile *)pFile;
  return p->pReal->pMethods->xShmMap(p->pReal, iPg, pgsz, bExtend, pp);
}

/* Perform locking on a shared-memory segment */
static int vstatShmLock(sqlite3_file *pFile, int offset, int n, int flags){
  VStatFile *p = (VStatFile *)pFile;
  return p->pReal->pMethods->xShmLock(p->pReal, offset, n, flags);
}

/* Memory barrier operation on shared memory */
static void vstatShmBarrier(sqlite3_file *pFile){
  VStatFile *p = (VStatFile *)pFile;
  p->pReal->pMethods->xShmBarrier(p->pReal);
}

/* Unmap a shared memory segment */
static int vstatShmUnmap(sqlite3_file *pFile, int deleteFlag){
  VStatFile *p = (VStatFile *)pFile;
  return p->pReal->pMethods->xShmUnmap(p->pReal, deleteFlag);
}

/* Fetch a page of a memory-mapped file */
static int vstatFetch(
  sqlite3_file *pFile,
  sqlite3_int64 iOfst,
  int iAmt,
  void **pp
){
  VStatFile *p = (VStatFile *)pFile;
  return p->pReal->pMethods->xFetch(p->pReal, iOfst, iAmt, pp);
}

/* Release a memory-mapped page */
static int vstatUnfetch(sqlite3_file *pFile, sqlite3_int64 iOfst, void *pPage){
  VStatFile *p = (VStatFile *)pFile;
  return p->pReal->pMethods->xUnfetch(p->pReal, iOfst, pPage);
}

/*
** Open an vstat file handle.
*/
static int vstatOpen(
  sqlite3_vfs *pVfs,
  const char *zName,
  sqlite3_file *pFile,
  int flags,
  int *pOutFlags
){
  int rc;
  VStatFile *p = (VStatFile*)pFile;

  p->pReal = (sqlite3_file*)&p[1];
  rc = REALVFS(pVfs)->xOpen(REALVFS(pVfs), zName, p->pReal, flags, pOutFlags);
  if( flags & SQLITE_OPEN_MAIN_DB ){
    p->eFiletype = VFSSTAT_MAIN;
  }else if( flags & SQLITE_OPEN_MAIN_JOURNAL ){
    p->eFiletype = VFSSTAT_JOURNAL;
  }else if( flags & SQLITE_OPEN_WAL ){
    p->eFiletype = VFSSTAT_WAL;
  }else if( flags & SQLITE_OPEN_MASTER_JOURNAL ){
    p->eFiletype = VFSSTAT_MASTERJRNL;
  }else if( flags & SQLITE_OPEN_SUBJOURNAL ){
    p->eFiletype = VFSSTAT_SUBJRNL;
  }else if( flags & SQLITE_OPEN_TEMP_DB ){
    p->eFiletype = VFSSTAT_TEMPDB;
  }else if( flags & SQLITE_OPEN_TEMP_JOURNAL ){
    p->eFiletype = VFSSTAT_TEMPJRNL;
  }else{
    p->eFiletype = VFSSTAT_TRANSIENT;
  }
  STATCNT(p->eFiletype,VFSSTAT_OPEN)++;
  pFile->pMethods = rc ? 0 : &vstat_io_methods;
  return rc;
}

/*
** Delete the file located at zPath. If the dirSync argument is true,
** ensure the file-system modifications are synced to disk before
** returning.
*/
static int vstatDelete(sqlite3_vfs *pVfs, const char *zPath, int dirSync){
  int rc;
  rc = REALVFS(pVfs)->xDelete(REALVFS(pVfs), zPath, dirSync);
  STATCNT(VFSSTAT_ANY,VFSSTAT_DELETE)++;
  return rc;
}

/*
** Test for access permissions. Return true if the requested permission
** is available, or false otherwise.
*/
static int vstatAccess(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int flags, 
  int *pResOut
){
  int rc;
  rc = REALVFS(pVfs)->xAccess(REALVFS(pVfs), zPath, flags, pResOut);
  STATCNT(VFSSTAT_ANY,VFSSTAT_ACCESS)++;
  return rc;
}

/*
** Populate buffer zOut with the full canonical pathname corresponding
** to the pathname in zPath. zOut is guaranteed to point to a buffer
** of at least (INST_MAX_PATHNAME+1) bytes.
*/
static int vstatFullPathname(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int nOut, 
  char *zOut
){
  STATCNT(VFSSTAT_ANY,VFSSTAT_FULLPATH)++;
  return REALVFS(pVfs)->xFullPathname(REALVFS(pVfs), zPath, nOut, zOut);
}

/*
** Open the dynamic library located at zPath and return a handle.
*/
static void *vstatDlOpen(sqlite3_vfs *pVfs, const char *zPath){
  return REALVFS(pVfs)->xDlOpen(REALVFS(pVfs), zPath);
}

/*
** Populate the buffer zErrMsg (size nByte bytes) with a human readable
** utf-8 string describing the most recent error encountered associated 
** with dynamic libraries.
*/
static void vstatDlError(sqlite3_vfs *pVfs, int nByte, char *zErrMsg){
  REALVFS(pVfs)->xDlError(REALVFS(pVfs), nByte, zErrMsg);
}

/*
** Return a pointer to the symbol zSymbol in the dynamic library pHandle.
*/
static void (*vstatDlSym(sqlite3_vfs *pVfs, void *p, const char *zSym))(void){
  return REALVFS(pVfs)->xDlSym(REALVFS(pVfs), p, zSym);
}

/*
** Close the dynamic library handle pHandle.
*/
static void vstatDlClose(sqlite3_vfs *pVfs, void *pHandle){
  REALVFS(pVfs)->xDlClose(REALVFS(pVfs), pHandle);
}

/*
** Populate the buffer pointed to by zBufOut with nByte bytes of 
** random data.
*/
static int vstatRandomness(sqlite3_vfs *pVfs, int nByte, char *zBufOut){
  STATCNT(VFSSTAT_ANY,VFSSTAT_RANDOM)++;
  return REALVFS(pVfs)->xRandomness(REALVFS(pVfs), nByte, zBufOut);
}

/*
** Sleep for nMicro microseconds. Return the number of microseconds 
** actually slept.
*/
static int vstatSleep(sqlite3_vfs *pVfs, int nMicro){
  STATCNT(VFSSTAT_ANY,VFSSTAT_SLEEP)++;
  return REALVFS(pVfs)->xSleep(REALVFS(pVfs), nMicro);
}

/*
** Return the current time as a Julian Day number in *pTimeOut.
*/
static int vstatCurrentTime(sqlite3_vfs *pVfs, double *pTimeOut){
  STATCNT(VFSSTAT_ANY,VFSSTAT_CURTIME)++;
  return REALVFS(pVfs)->xCurrentTime(REALVFS(pVfs), pTimeOut);
}

static int vstatGetLastError(sqlite3_vfs *pVfs, int a, char *b){
  return REALVFS(pVfs)->xGetLastError(REALVFS(pVfs), a, b);
}
static int vstatCurrentTimeInt64(sqlite3_vfs *pVfs, sqlite3_int64 *p){
  STATCNT(VFSSTAT_ANY,VFSSTAT_CURTIME)++;
  return REALVFS(pVfs)->xCurrentTimeInt64(REALVFS(pVfs), p);
}

/*
** A virtual table for accessing the stats collected by this VFS shim
*/
static int vstattabConnect(sqlite3*, void*, int, const char*const*, 
                           sqlite3_vtab**,char**);
static int vstattabBestIndex(sqlite3_vtab*,sqlite3_index_info*);
static int vstattabDisconnect(sqlite3_vtab*);
static int vstattabOpen(sqlite3_vtab*, sqlite3_vtab_cursor**);
static int vstattabClose(sqlite3_vtab_cursor*);
static int vstattabFilter(sqlite3_vtab_cursor*, int idxNum, const char *idxStr,
                          int argc, sqlite3_value **argv);
static int vstattabNext(sqlite3_vtab_cursor*);
static int vstattabEof(sqlite3_vtab_cursor*);
static int vstattabColumn(sqlite3_vtab_cursor*,sqlite3_context*,int);
static int vstattabRowid(sqlite3_vtab_cursor*,sqlite3_int64*);
static int vstattabUpdate(sqlite3_vtab*,int,sqlite3_value**,sqlite3_int64*);

/* A cursor for the vfsstat virtual table */
typedef struct VfsStatCursor {
  sqlite3_vtab_cursor base;       /* Base class.  Must be first */
  int i;                          /* Pointing to this aVfsCnt[] value */
} VfsStatCursor;


static int vstattabConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  sqlite3_vtab *pNew;
  int rc;

/* Column numbers */
#define VSTAT_COLUMN_FILE  0 
#define VSTAT_COLUMN_STAT  1
#define VSTAT_COLUMN_COUNT 2

  rc = sqlite3_declare_vtab(db,"CREATE TABLE x(file,stat,count)");
  if( rc==SQLITE_OK ){
    pNew = *ppVtab = sqlite3_malloc( sizeof(*pNew) );
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, sizeof(*pNew));
  }
  return rc;
}

/*
** This method is the destructor for vstat table object.
*/
static int vstattabDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** Constructor for a new vstat table cursor object.
*/
static int vstattabOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  VfsStatCursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}


/*
** Destructor for a VfsStatCursor.
*/
static int vstattabClose(sqlite3_vtab_cursor *cur){
  sqlite3_free(cur);
  return SQLITE_OK;
}


/*
** Advance a VfsStatCursor to its next row of output.
*/
static int vstattabNext(sqlite3_vtab_cursor *cur){
  ((VfsStatCursor*)cur)->i++;
  return SQLITE_OK;
}

/*
** Return values of columns for the row at which the VfsStatCursor
** is currently pointing.
*/
static int vstattabColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  VfsStatCursor *pCur = (VfsStatCursor*)cur;
  switch( i ){
    case VSTAT_COLUMN_FILE: {
      sqlite3_result_text(ctx, azFile[pCur->i/VFSSTAT_nStat], -1, SQLITE_STATIC);
      break;
    }
    case VSTAT_COLUMN_STAT: {
      const char **az;
      az = (pCur->i/VFSSTAT_nStat)==VFSSTAT_ANY ? azStatAny : azStat;
      sqlite3_result_text(ctx, az[pCur->i%VFSSTAT_nStat], -1, SQLITE_STATIC);
      break;
    }
    case VSTAT_COLUMN_COUNT: {
      sqlite3_result_int64(ctx, aVfsCnt[pCur->i]);
      break;
    }
  }
  return SQLITE_OK;
}

/*
** Return the rowid for the current row.
*/
static int vstattabRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  VfsStatCursor *pCur = (VfsStatCursor*)cur;
  *pRowid = pCur->i;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int vstattabEof(sqlite3_vtab_cursor *cur){
  VfsStatCursor *pCur = (VfsStatCursor*)cur;
  return pCur->i >= VFSSTAT_MXCNT;
}

/*
** Only a full table scan is supported.  So xFilter simply rewinds to
** the beginning.
*/
static int vstattabFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  VfsStatCursor *pCur = (VfsStatCursor*)pVtabCursor;
  pCur->i = 0;
  return SQLITE_OK;
}

/*
** Only a forwards full table scan is supported.  xBestIndex is a no-op.
*/
static int vstattabBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  return SQLITE_OK;
}

/*
** Any VSTAT_COLUMN_COUNT can be changed to a positive integer.
** No deletions or insertions are allowed.  No changes to other
** columns are allowed.
*/
static int vstattabUpdate(
  sqlite3_vtab *tab,
  int argc, sqlite3_value **argv,
  sqlite3_int64 *pRowid
){
  sqlite3_int64 iRowid, x;
  if( argc==1 ) return SQLITE_ERROR;
  if( sqlite3_value_type(argv[0])!=SQLITE_INTEGER ) return SQLITE_ERROR;
  iRowid = sqlite3_value_int64(argv[0]);
  if( iRowid!=sqlite3_value_int64(argv[1]) ) return SQLITE_ERROR;
  if( iRowid<0 || iRowid>=VFSSTAT_MXCNT ) return SQLITE_ERROR;
  if( sqlite3_value_type(argv[VSTAT_COLUMN_COUNT+2])!=SQLITE_INTEGER ){
    return SQLITE_ERROR;
  }
  x = sqlite3_value_int64(argv[VSTAT_COLUMN_COUNT+2]);
  if( x<0 ) return SQLITE_ERROR;
  aVfsCnt[iRowid] = x;
  return SQLITE_OK;
}

static sqlite3_module VfsStatModule = {
  0,                         /* iVersion */
  0,                         /* xCreate */
  vstattabConnect,           /* xConnect */
  vstattabBestIndex,         /* xBestIndex */
  vstattabDisconnect,        /* xDisconnect */
  0,                         /* xDestroy */
  vstattabOpen,              /* xOpen - open a cursor */
  vstattabClose,             /* xClose - close a cursor */
  vstattabFilter,            /* xFilter - configure scan constraints */
  vstattabNext,              /* xNext - advance a cursor */
  vstattabEof,               /* xEof - check for end of scan */
  vstattabColumn,            /* xColumn - read data */
  vstattabRowid,             /* xRowid - read data */
  vstattabUpdate,            /* xUpdate */
  0,                         /* xBegin */
  0,                         /* xSync */
  0,                         /* xCommit */
  0,                         /* xRollback */
  0,                         /* xFindMethod */
  0,                         /* xRename */
};

/*
** This routine is an sqlite3_auto_extension() callback, invoked to register
** the vfsstat virtual table for all new database connections.
*/
static int vstatRegister(
  sqlite3 *db,
  char **pzErrMsg,
  const sqlite3_api_routines *pThunk
){
  return sqlite3_create_module(db, "vfsstat", &VfsStatModule, 0);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
/* 
** This routine is called when the extension is loaded.
**
** Register the new VFS.  Make arrangement to register the virtual table
** for each new database connection.
*/
int sqlite3_vfsstat_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  vstat_vfs.pVfs = sqlite3_vfs_find(0);
  vstat_vfs.base.szOsFile = sizeof(VStatFile) + vstat_vfs.pVfs->szOsFile;
  rc = sqlite3_vfs_register(&vstat_vfs.base, 1);
  if( rc==SQLITE_OK ){
    rc = vstatRegister(db, pzErrMsg, pApi);
    if( rc==SQLITE_OK ){
      rc = sqlite3_auto_extension((void(*)(void))vstatRegister);
    }
  }
  if( rc==SQLITE_OK ) rc = SQLITE_OK_LOAD_PERMANENTLY;
  return rc;
}
