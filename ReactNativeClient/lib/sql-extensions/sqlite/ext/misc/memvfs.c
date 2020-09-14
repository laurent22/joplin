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
** This is an in-memory VFS implementation.  The application supplies
** a chunk of memory to hold the database file.
**
** Because there is place to store a rollback or wal journal, the database
** must use one of journal_mode=MEMORY or journal_mode=NONE.
**
** USAGE:
**
**    sqlite3_open_v2("file:/whatever?ptr=0xf05538&sz=14336&max=65536", &db,
**                    SQLITE_OPEN_READWRITE | SQLITE_OPEN_URI,
**                    "memvfs");
**
** These are the query parameters:
**
**    ptr=          The address of the memory buffer that holds the database.
**
**    sz=           The current size the database file
**
**    maxsz=        The maximum size of the database.  In other words, the
**                  amount of space allocated for the ptr= buffer.
**
**    freeonclose=  If true, then sqlite3_free() is called on the ptr=
**                  value when the connection closes.
**
** The ptr= and sz= query parameters are required.  If maxsz= is omitted,
** then it defaults to the sz= value.  Parameter values can be in either
** decimal or hexadecimal.  The filename in the URI is ignored.
*/
#include <sqlite3ext.h>
SQLITE_EXTENSION_INIT1
#include <string.h>
#include <assert.h>


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
  sqlite3_int64 szMax;            /* Space allocated to aData */
  unsigned char *aData;           /* content of the file */
  int bFreeOnClose;               /* Invoke sqlite3_free() on aData at close */
};

/*
** Methods for MemFile
*/
static int memClose(sqlite3_file*);
static int memRead(sqlite3_file*, void*, int iAmt, sqlite3_int64 iOfst);
static int memWrite(sqlite3_file*,const void*,int iAmt, sqlite3_int64 iOfst);
static int memTruncate(sqlite3_file*, sqlite3_int64 size);
static int memSync(sqlite3_file*, int flags);
static int memFileSize(sqlite3_file*, sqlite3_int64 *pSize);
static int memLock(sqlite3_file*, int);
static int memUnlock(sqlite3_file*, int);
static int memCheckReservedLock(sqlite3_file*, int *pResOut);
static int memFileControl(sqlite3_file*, int op, void *pArg);
static int memSectorSize(sqlite3_file*);
static int memDeviceCharacteristics(sqlite3_file*);
static int memShmMap(sqlite3_file*, int iPg, int pgsz, int, void volatile**);
static int memShmLock(sqlite3_file*, int offset, int n, int flags);
static void memShmBarrier(sqlite3_file*);
static int memShmUnmap(sqlite3_file*, int deleteFlag);
static int memFetch(sqlite3_file*, sqlite3_int64 iOfst, int iAmt, void **pp);
static int memUnfetch(sqlite3_file*, sqlite3_int64 iOfst, void *p);

/*
** Methods for MemVfs
*/
static int memOpen(sqlite3_vfs*, const char *, sqlite3_file*, int , int *);
static int memDelete(sqlite3_vfs*, const char *zName, int syncDir);
static int memAccess(sqlite3_vfs*, const char *zName, int flags, int *);
static int memFullPathname(sqlite3_vfs*, const char *zName, int, char *zOut);
static void *memDlOpen(sqlite3_vfs*, const char *zFilename);
static void memDlError(sqlite3_vfs*, int nByte, char *zErrMsg);
static void (*memDlSym(sqlite3_vfs *pVfs, void *p, const char*zSym))(void);
static void memDlClose(sqlite3_vfs*, void*);
static int memRandomness(sqlite3_vfs*, int nByte, char *zOut);
static int memSleep(sqlite3_vfs*, int microseconds);
static int memCurrentTime(sqlite3_vfs*, double*);
static int memGetLastError(sqlite3_vfs*, int, char *);
static int memCurrentTimeInt64(sqlite3_vfs*, sqlite3_int64*);

static sqlite3_vfs mem_vfs = {
  2,                           /* iVersion */
  0,                           /* szOsFile (set when registered) */
  1024,                        /* mxPathname */
  0,                           /* pNext */
  "memvfs",                    /* zName */
  0,                           /* pAppData (set when registered) */ 
  memOpen,                     /* xOpen */
  memDelete,                   /* xDelete */
  memAccess,                   /* xAccess */
  memFullPathname,             /* xFullPathname */
  memDlOpen,                   /* xDlOpen */
  memDlError,                  /* xDlError */
  memDlSym,                    /* xDlSym */
  memDlClose,                  /* xDlClose */
  memRandomness,               /* xRandomness */
  memSleep,                    /* xSleep */
  memCurrentTime,              /* xCurrentTime */
  memGetLastError,             /* xGetLastError */
  memCurrentTimeInt64          /* xCurrentTimeInt64 */
};

static const sqlite3_io_methods mem_io_methods = {
  3,                              /* iVersion */
  memClose,                      /* xClose */
  memRead,                       /* xRead */
  memWrite,                      /* xWrite */
  memTruncate,                   /* xTruncate */
  memSync,                       /* xSync */
  memFileSize,                   /* xFileSize */
  memLock,                       /* xLock */
  memUnlock,                     /* xUnlock */
  memCheckReservedLock,          /* xCheckReservedLock */
  memFileControl,                /* xFileControl */
  memSectorSize,                 /* xSectorSize */
  memDeviceCharacteristics,      /* xDeviceCharacteristics */
  memShmMap,                     /* xShmMap */
  memShmLock,                    /* xShmLock */
  memShmBarrier,                 /* xShmBarrier */
  memShmUnmap,                   /* xShmUnmap */
  memFetch,                      /* xFetch */
  memUnfetch                     /* xUnfetch */
};



/*
** Close an mem-file.
**
** The pData pointer is owned by the application, so there is nothing
** to free.
*/
static int memClose(sqlite3_file *pFile){
  MemFile *p = (MemFile *)pFile;
  if( p->bFreeOnClose ) sqlite3_free(p->aData);
  return SQLITE_OK;
}

/*
** Read data from an mem-file.
*/
static int memRead(
  sqlite3_file *pFile, 
  void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  MemFile *p = (MemFile *)pFile;
  memcpy(zBuf, p->aData+iOfst, iAmt);
  return SQLITE_OK;
}

/*
** Write data to an mem-file.
*/
static int memWrite(
  sqlite3_file *pFile,
  const void *z,
  int iAmt,
  sqlite_int64 iOfst
){
  MemFile *p = (MemFile *)pFile;
  if( iOfst+iAmt>p->sz ){
    if( iOfst+iAmt>p->szMax ) return SQLITE_FULL;
    if( iOfst>p->sz ) memset(p->aData+p->sz, 0, iOfst-p->sz);
    p->sz = iOfst+iAmt;
  }
  memcpy(p->aData+iOfst, z, iAmt);
  return SQLITE_OK;
}

/*
** Truncate an mem-file.
*/
static int memTruncate(sqlite3_file *pFile, sqlite_int64 size){
  MemFile *p = (MemFile *)pFile;
  if( size>p->sz ){
    if( size>p->szMax ) return SQLITE_FULL;
    memset(p->aData+p->sz, 0, size-p->sz);
  }
  p->sz = size; 
  return SQLITE_OK;
}

/*
** Sync an mem-file.
*/
static int memSync(sqlite3_file *pFile, int flags){
  return SQLITE_OK;
}

/*
** Return the current file-size of an mem-file.
*/
static int memFileSize(sqlite3_file *pFile, sqlite_int64 *pSize){
  MemFile *p = (MemFile *)pFile;
  *pSize = p->sz;
  return SQLITE_OK;
}

/*
** Lock an mem-file.
*/
static int memLock(sqlite3_file *pFile, int eLock){
  return SQLITE_OK;
}

/*
** Unlock an mem-file.
*/
static int memUnlock(sqlite3_file *pFile, int eLock){
  return SQLITE_OK;
}

/*
** Check if another file-handle holds a RESERVED lock on an mem-file.
*/
static int memCheckReservedLock(sqlite3_file *pFile, int *pResOut){
  *pResOut = 0;
  return SQLITE_OK;
}

/*
** File control method. For custom operations on an mem-file.
*/
static int memFileControl(sqlite3_file *pFile, int op, void *pArg){
  MemFile *p = (MemFile *)pFile;
  int rc = SQLITE_NOTFOUND;
  if( op==SQLITE_FCNTL_VFSNAME ){
    *(char**)pArg = sqlite3_mprintf("mem(%p,%lld)", p->aData, p->sz);
    rc = SQLITE_OK;
  }
  return rc;
}

/*
** Return the sector-size in bytes for an mem-file.
*/
static int memSectorSize(sqlite3_file *pFile){
  return 1024;
}

/*
** Return the device characteristic flags supported by an mem-file.
*/
static int memDeviceCharacteristics(sqlite3_file *pFile){
  return SQLITE_IOCAP_ATOMIC | 
         SQLITE_IOCAP_POWERSAFE_OVERWRITE |
         SQLITE_IOCAP_SAFE_APPEND |
         SQLITE_IOCAP_SEQUENTIAL;
}

/* Create a shared memory file mapping */
static int memShmMap(
  sqlite3_file *pFile,
  int iPg,
  int pgsz,
  int bExtend,
  void volatile **pp
){
  return SQLITE_IOERR_SHMMAP;
}

/* Perform locking on a shared-memory segment */
static int memShmLock(sqlite3_file *pFile, int offset, int n, int flags){
  return SQLITE_IOERR_SHMLOCK;
}

/* Memory barrier operation on shared memory */
static void memShmBarrier(sqlite3_file *pFile){
  return;
}

/* Unmap a shared memory segment */
static int memShmUnmap(sqlite3_file *pFile, int deleteFlag){
  return SQLITE_OK;
}

/* Fetch a page of a memory-mapped file */
static int memFetch(
  sqlite3_file *pFile,
  sqlite3_int64 iOfst,
  int iAmt,
  void **pp
){
  MemFile *p = (MemFile *)pFile;
  *pp = (void*)(p->aData + iOfst);
  return SQLITE_OK;
}

/* Release a memory-mapped page */
static int memUnfetch(sqlite3_file *pFile, sqlite3_int64 iOfst, void *pPage){
  return SQLITE_OK;
}

/*
** Open an mem file handle.
*/
static int memOpen(
  sqlite3_vfs *pVfs,
  const char *zName,
  sqlite3_file *pFile,
  int flags,
  int *pOutFlags
){
  MemFile *p = (MemFile*)pFile;
  memset(p, 0, sizeof(*p));
  if( (flags & SQLITE_OPEN_MAIN_DB)==0 ) return SQLITE_CANTOPEN;
  p->aData = (unsigned char*)sqlite3_uri_int64(zName,"ptr",0);
  if( p->aData==0 ) return SQLITE_CANTOPEN;
  p->sz = sqlite3_uri_int64(zName,"sz",0);
  if( p->sz<0 ) return SQLITE_CANTOPEN;
  p->szMax = sqlite3_uri_int64(zName,"max",p->sz);
  if( p->szMax<p->sz ) return SQLITE_CANTOPEN;
  p->bFreeOnClose = sqlite3_uri_boolean(zName,"freeonclose",0);
  pFile->pMethods = &mem_io_methods;
  return SQLITE_OK;
}

/*
** Delete the file located at zPath. If the dirSync argument is true,
** ensure the file-system modifications are synced to disk before
** returning.
*/
static int memDelete(sqlite3_vfs *pVfs, const char *zPath, int dirSync){
  return SQLITE_IOERR_DELETE;
}

/*
** Test for access permissions. Return true if the requested permission
** is available, or false otherwise.
*/
static int memAccess(
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
static int memFullPathname(
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
static void *memDlOpen(sqlite3_vfs *pVfs, const char *zPath){
  return ORIGVFS(pVfs)->xDlOpen(ORIGVFS(pVfs), zPath);
}

/*
** Populate the buffer zErrMsg (size nByte bytes) with a human readable
** utf-8 string describing the most recent error encountered associated 
** with dynamic libraries.
*/
static void memDlError(sqlite3_vfs *pVfs, int nByte, char *zErrMsg){
  ORIGVFS(pVfs)->xDlError(ORIGVFS(pVfs), nByte, zErrMsg);
}

/*
** Return a pointer to the symbol zSymbol in the dynamic library pHandle.
*/
static void (*memDlSym(sqlite3_vfs *pVfs, void *p, const char *zSym))(void){
  return ORIGVFS(pVfs)->xDlSym(ORIGVFS(pVfs), p, zSym);
}

/*
** Close the dynamic library handle pHandle.
*/
static void memDlClose(sqlite3_vfs *pVfs, void *pHandle){
  ORIGVFS(pVfs)->xDlClose(ORIGVFS(pVfs), pHandle);
}

/*
** Populate the buffer pointed to by zBufOut with nByte bytes of 
** random data.
*/
static int memRandomness(sqlite3_vfs *pVfs, int nByte, char *zBufOut){
  return ORIGVFS(pVfs)->xRandomness(ORIGVFS(pVfs), nByte, zBufOut);
}

/*
** Sleep for nMicro microseconds. Return the number of microseconds 
** actually slept.
*/
static int memSleep(sqlite3_vfs *pVfs, int nMicro){
  return ORIGVFS(pVfs)->xSleep(ORIGVFS(pVfs), nMicro);
}

/*
** Return the current time as a Julian Day number in *pTimeOut.
*/
static int memCurrentTime(sqlite3_vfs *pVfs, double *pTimeOut){
  return ORIGVFS(pVfs)->xCurrentTime(ORIGVFS(pVfs), pTimeOut);
}

static int memGetLastError(sqlite3_vfs *pVfs, int a, char *b){
  return ORIGVFS(pVfs)->xGetLastError(ORIGVFS(pVfs), a, b);
}
static int memCurrentTimeInt64(sqlite3_vfs *pVfs, sqlite3_int64 *p){
  return ORIGVFS(pVfs)->xCurrentTimeInt64(ORIGVFS(pVfs), p);
}

#ifdef MEMVFS_TEST
/*
**       memvfs_from_file(FILENAME, MAXSIZE)
**
** This an SQL function used to help in testing the memvfs VFS.  The
** function reads the content of a file into memory and then returns
** a URI that can be handed to ATTACH to attach the memory buffer as
** a database.  Example:
**
**       ATTACH memvfs_from_file('test.db',1048576) AS inmem;
**
** The optional MAXSIZE argument gives the size of the memory allocation
** used to hold the database.  If omitted, it defaults to the size of the
** file on disk.
*/
#include <stdio.h>
static void memvfsFromFileFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  unsigned char *p;
  sqlite3_int64 sz;
  sqlite3_int64 szMax;
  FILE *in;
  const char *zFilename = (const char*)sqlite3_value_text(argv[0]);
  char *zUri;

  if( zFilename==0 ) return;
  in = fopen(zFilename, "rb");
  if( in==0 ) return;
  fseek(in, 0, SEEK_END);
  szMax = sz = ftell(in);
  rewind(in);
  if( argc>=2 ){
    szMax = sqlite3_value_int64(argv[1]);
    if( szMax<sz ) szMax = sz;
  }
  p = sqlite3_malloc64( szMax );
  if( p==0 ){
    fclose(in);
    sqlite3_result_error_nomem(context);
    return;
  }
  fread(p, sz, 1, in);
  fclose(in);
  zUri = sqlite3_mprintf(
           "file:/mem?vfs=memvfs&ptr=%lld&sz=%lld&max=%lld&freeonclose=1",
                         (sqlite3_int64)p, sz, szMax);
  sqlite3_result_text(context, zUri, -1, sqlite3_free);
}
#endif /* MEMVFS_TEST */

#ifdef MEMVFS_TEST
/*
**       memvfs_to_file(SCHEMA, FILENAME)
**
** The schema identified by SCHEMA must be a memvfs database.  Write
** the content of this database into FILENAME.
*/
static void memvfsToFileFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  MemFile *p = 0;
  FILE *out;
  int rc;
  sqlite3 *db = sqlite3_context_db_handle(context);
  sqlite3_vfs *pVfs = 0;
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  const char *zFilename = (const char*)sqlite3_value_text(argv[1]);

  if( zFilename==0 ) return;
  out = fopen(zFilename, "wb");
  if( out==0 ) return;
  rc = sqlite3_file_control(db, zSchema, SQLITE_FCNTL_VFS_POINTER, &pVfs);
  if( rc || pVfs==0 ) return;
  if( strcmp(pVfs->zName,"memvfs")!=0 ) return;
  rc = sqlite3_file_control(db, zSchema, SQLITE_FCNTL_FILE_POINTER, &p);
  if( rc ) return;
  fwrite(p->aData, 1, (size_t)p->sz, out);
  fclose(out);
}
#endif /* MEMVFS_TEST */

#ifdef MEMVFS_TEST
/* Called for each new database connection */
static int memvfsRegister(
  sqlite3 *db,
  char **pzErrMsg,
  const struct sqlite3_api_routines *pThunk
){
  sqlite3_create_function(db, "memvfs_from_file", 1, SQLITE_UTF8, 0,
                          memvfsFromFileFunc, 0, 0);
  sqlite3_create_function(db, "memvfs_from_file", 2, SQLITE_UTF8, 0,
                          memvfsFromFileFunc, 0, 0);
  sqlite3_create_function(db, "memvfs_to_file", 2, SQLITE_UTF8, 0,
                          memvfsToFileFunc, 0, 0);
  return SQLITE_OK;
}
#endif /* MEMVFS_TEST */

  
#ifdef _WIN32
__declspec(dllexport)
#endif
/* 
** This routine is called when the extension is loaded.
** Register the new VFS.
*/
int sqlite3_memvfs_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  mem_vfs.pAppData = sqlite3_vfs_find(0);
  mem_vfs.szOsFile = sizeof(MemFile);
  rc = sqlite3_vfs_register(&mem_vfs, 1);
#ifdef MEMVFS_TEST
  if( rc==SQLITE_OK ){
    rc = sqlite3_auto_extension((void(*)(void))memvfsRegister);
  }
  if( rc==SQLITE_OK ){
    rc = memvfsRegister(db, pzErrMsg, pApi);
  }
#endif
  if( rc==SQLITE_OK ) rc = SQLITE_OK_LOAD_PERMANENTLY;
  return rc;
}
