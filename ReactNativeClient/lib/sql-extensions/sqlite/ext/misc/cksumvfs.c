/*
** 2020-04-20
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
** This file implements a VFS shim that writes a checksum on each page
** of an SQLite database file.  When reading pages, the checksum is verified
** and an error is raised if the checksum is incorrect.
**
** COMPILING
**
** This extension requires SQLite 3.32.0 or later.  It uses the
** sqlite3_database_file_object() interface which was added in
** version 3.32.0, so it will not link with an earlier version of
** SQLite.
**
** To build this extension as a separately loaded shared library or
** DLL, use compiler command-lines similar to the following:
**
**   (linux)    gcc -fPIC -shared cksumvfs.c -o cksumvfs.so
**   (mac)      clang -fPIC -dynamiclib cksumvfs.c -o cksumvfs.dylib
**   (windows)  cl cksumvfs.c -link -dll -out:cksumvfs.dll
**
** You may want to add additional compiler options, of course,
** according to the needs of your project.
**
** If you want to statically link this extension with your product,
** then compile it like any other C-language module but add the
** "-DSQLITE_CKSUMVFS_STATIC" option so that this module knows that
** it is being statically linked rather than dynamically linked
**
** LOADING
**
** To load this extension as a shared library, you first have to
** bring up a dummy SQLite database connection to use as the argument
** to the sqlite3_load_extension() API call.  Then you invoke the
** sqlite3_load_extension() API and shutdown the dummy database
** connection.  All subsequent database connections that are opened
** will include this extension.  For example:
**
**     sqlite3 *db;
**     sqlite3_open(":memory:", &db);
**     sqlite3_load_extention(db, "./cksumvfs");
**     sqlite3_close(db);
**
** If this extension is compiled with -DSQLITE_CKSUMVFS_STATIC and
** statically linked against the application, initialize it using
** a single API call as follows:
**
**     sqlite3_cksumvfs_init();
**
** Cksumvfs is a VFS Shim. When loaded, "cksmvfs" becomes the new
** default VFS and it uses the prior default VFS as the next VFS
** down in the stack.  This is normally what you want.  However, it
** complex situations where multiple VFS shims are being loaded,
** it might be important to ensure that cksumvfs is loaded in the
** correct order so that it sequences itself into the default VFS
** Shim stack in the right order.
**
** USING
**
** Open database connections using the sqlite3_open() or 
** sqlite3_open_v2() interfaces, as normal.  Ordinary database files
** (without a checksum) will operate normally.  Databases with 
** checksums will return an SQLITE_IOERR_DATA error if a page is
** encountered that contains an invalid checksum.
**
** Checksumming only works on databases that have a reserve-bytes
** value of exactly 8.  The default value for reserve-bytes is 0.
** Hence, newly created database files will omit the checksum by
** default.  To create a database that includes a checksum, change
** the reserve-bytes value to 8 by runing:
**
**    int n = 8;
**    sqlite3_file_control(db, 0, SQLITE_FCNTL_RESERVED_BYTES, &n);
**
** If you do this immediately after creating a new database file,
** before anything else has been written into the file, then that
** might be all that you need to do.  Otherwise, the API call
** above should be followed by:
**
**    sqlite3_exec(db, "VACUUM", 0, 0, 0);
**
** It never hurts to run the VACUUM, even if you don't need it.
** If the database is in WAL mode, you should shutdown and
** reopen all database connections before continuing.
**
** From the CLI, use the ".filectrl reserve_bytes 8" command, 
** followed by "VACUUM;".
**
** Note that SQLite allows the number of reserve-bytes to be
** increased but not decreased.  So if a database file already
** has a reserve-bytes value greater than 8, there is no way to
** activate checksumming on that database, other than to dump
** and restore the database file.  Note also that other extensions
** might also make use of the reserve-bytes.  Checksumming will
** be incompatible with those other extensions.
**
** VERIFICATION OF CHECKSUMS
**
** If any checksum is incorrect, the "PRAGMA quick_check" command
** will find it.  To verify that checksums are actually enabled
** and running, use the following query:
**
**   SELECT count(*), verify_checksum(data)
**     FROM sqlite_dbpage
**    GROUP BY 2;
**
** There are three possible outputs form the verify_checksum()
** function: 1, 0, and NULL.  1 is returned if the checksum is
** correct.  0 is returned if the checksum is incorrect.  NULL
** is returned if the page is unreadable.  If checksumming is
** enabled, the read will fail if the checksum is wrong, so the
** usual result from verify_checksum() on a bad checksum is NULL.
**
** If everything is OK, the query above should return a single
** row where the second column is 1.  Any other result indicates
** either that there is a checksum error, or checksum validation
** is disabled.
**
** CONTROLLING CHECKSUM VERIFICATION
**
** The cksumvfs extension implements a new PRAGMA statement that can
** be used to disable, re-enable, or query the status of checksum
** verification:
**
**    PRAGMA checksum_verification;          -- query status
**    PRAGMA checksum_verification=OFF;      -- disable verification
**    PRAGMA checksum_verification=ON;       -- re-enable verification
**
** The "checksum_verification" pragma will return "1" (true) or "0"
** (false) if checksum verification is enabled or disabled, respectively.
** "Verification" in this context means the feature that causes
** SQLITE_IOERR_DATA errors if a checksum mismatch is detected while
** reading.  Checksums are always kept up-to-date as long as the
** reserve-bytes value of the database is 8, regardless of the setting
** of this pragma.  Checksum verification can be disabled (for example)
** to do forensic analysis of a database that has previously reported
** a checksum error.
**
** The "checksum_verification" pragma will always respond with "0" if
** the database file does not have a reserve-bytes value of 8.  The
** pragma will return no rows at all if the cksumvfs extension is
** not loaded.
**
** IMPLEMENTATION NOTES
**
** The checksum is stored in the last 8 bytes of each page.  This
** module only operates if the "bytes of reserved space on each page"
** value at offset 20 the SQLite database header is exactly 8.  If
** the reserved-space value is not 8, this module is a no-op.
*/
#ifdef SQLITE_CKSUMVFS_STATIC
# include "sqlite3.h"
#else
# include "sqlite3ext.h"
  SQLITE_EXTENSION_INIT1
#endif
#include <string.h>
#include <assert.h>


/*
** Forward declaration of objects used by this utility
*/
typedef struct sqlite3_vfs CksmVfs;
typedef struct CksmFile CksmFile;

/*
** Useful datatype abbreviations
*/
#if !defined(SQLITE_CORE)
  typedef unsigned char u8;
  typedef unsigned int u32;
#endif

/* Access to a lower-level VFS that (might) implement dynamic loading,
** access to randomness, etc.
*/
#define ORIGVFS(p)  ((sqlite3_vfs*)((p)->pAppData))
#define ORIGFILE(p) ((sqlite3_file*)(((CksmFile*)(p))+1))

/* An open file */
struct CksmFile {
  sqlite3_file base;    /* IO methods */
  const char *zFName;   /* Original name of the file */
  char computeCksm;     /* True to compute checksums.
                        ** Always true if reserve size is 8. */
  char verifyCksm;      /* True to verify checksums */
  char isWal;           /* True if processing a WAL file */
  char inCkpt;          /* Currently doing a checkpoint */
  CksmFile *pPartner;   /* Ptr from WAL to main-db, or from main-db to WAL */
};

/*
** Methods for CksmFile
*/
static int cksmClose(sqlite3_file*);
static int cksmRead(sqlite3_file*, void*, int iAmt, sqlite3_int64 iOfst);
static int cksmWrite(sqlite3_file*,const void*,int iAmt, sqlite3_int64 iOfst);
static int cksmTruncate(sqlite3_file*, sqlite3_int64 size);
static int cksmSync(sqlite3_file*, int flags);
static int cksmFileSize(sqlite3_file*, sqlite3_int64 *pSize);
static int cksmLock(sqlite3_file*, int);
static int cksmUnlock(sqlite3_file*, int);
static int cksmCheckReservedLock(sqlite3_file*, int *pResOut);
static int cksmFileControl(sqlite3_file*, int op, void *pArg);
static int cksmSectorSize(sqlite3_file*);
static int cksmDeviceCharacteristics(sqlite3_file*);
static int cksmShmMap(sqlite3_file*, int iPg, int pgsz, int, void volatile**);
static int cksmShmLock(sqlite3_file*, int offset, int n, int flags);
static void cksmShmBarrier(sqlite3_file*);
static int cksmShmUnmap(sqlite3_file*, int deleteFlag);
static int cksmFetch(sqlite3_file*, sqlite3_int64 iOfst, int iAmt, void **pp);
static int cksmUnfetch(sqlite3_file*, sqlite3_int64 iOfst, void *p);

/*
** Methods for CksmVfs
*/
static int cksmOpen(sqlite3_vfs*, const char *, sqlite3_file*, int , int *);
static int cksmDelete(sqlite3_vfs*, const char *zName, int syncDir);
static int cksmAccess(sqlite3_vfs*, const char *zName, int flags, int *);
static int cksmFullPathname(sqlite3_vfs*, const char *zName, int, char *zOut);
static void *cksmDlOpen(sqlite3_vfs*, const char *zFilename);
static void cksmDlError(sqlite3_vfs*, int nByte, char *zErrMsg);
static void (*cksmDlSym(sqlite3_vfs *pVfs, void *p, const char*zSym))(void);
static void cksmDlClose(sqlite3_vfs*, void*);
static int cksmRandomness(sqlite3_vfs*, int nByte, char *zOut);
static int cksmSleep(sqlite3_vfs*, int microseconds);
static int cksmCurrentTime(sqlite3_vfs*, double*);
static int cksmGetLastError(sqlite3_vfs*, int, char *);
static int cksmCurrentTimeInt64(sqlite3_vfs*, sqlite3_int64*);
static int cksmSetSystemCall(sqlite3_vfs*, const char*,sqlite3_syscall_ptr);
static sqlite3_syscall_ptr cksmGetSystemCall(sqlite3_vfs*, const char *z);
static const char *cksmNextSystemCall(sqlite3_vfs*, const char *zName);

static sqlite3_vfs cksm_vfs = {
  3,                            /* iVersion (set when registered) */
  0,                            /* szOsFile (set when registered) */
  1024,                         /* mxPathname */
  0,                            /* pNext */
  "cksmvfs",                    /* zName */
  0,                            /* pAppData (set when registered) */ 
  cksmOpen,                     /* xOpen */
  cksmDelete,                   /* xDelete */
  cksmAccess,                   /* xAccess */
  cksmFullPathname,             /* xFullPathname */
  cksmDlOpen,                   /* xDlOpen */
  cksmDlError,                  /* xDlError */
  cksmDlSym,                    /* xDlSym */
  cksmDlClose,                  /* xDlClose */
  cksmRandomness,               /* xRandomness */
  cksmSleep,                    /* xSleep */
  cksmCurrentTime,              /* xCurrentTime */
  cksmGetLastError,             /* xGetLastError */
  cksmCurrentTimeInt64,         /* xCurrentTimeInt64 */
  cksmSetSystemCall,            /* xSetSystemCall */
  cksmGetSystemCall,            /* xGetSystemCall */
  cksmNextSystemCall            /* xNextSystemCall */
};

static const sqlite3_io_methods cksm_io_methods = {
  3,                              /* iVersion */
  cksmClose,                      /* xClose */
  cksmRead,                       /* xRead */
  cksmWrite,                      /* xWrite */
  cksmTruncate,                   /* xTruncate */
  cksmSync,                       /* xSync */
  cksmFileSize,                   /* xFileSize */
  cksmLock,                       /* xLock */
  cksmUnlock,                     /* xUnlock */
  cksmCheckReservedLock,          /* xCheckReservedLock */
  cksmFileControl,                /* xFileControl */
  cksmSectorSize,                 /* xSectorSize */
  cksmDeviceCharacteristics,      /* xDeviceCharacteristics */
  cksmShmMap,                     /* xShmMap */
  cksmShmLock,                    /* xShmLock */
  cksmShmBarrier,                 /* xShmBarrier */
  cksmShmUnmap,                   /* xShmUnmap */
  cksmFetch,                      /* xFetch */
  cksmUnfetch                     /* xUnfetch */
};

/* Do byte swapping on a unsigned 32-bit integer */
#define BYTESWAP32(x) ( \
    (((x)&0x000000FF)<<24) + (((x)&0x0000FF00)<<8)  \
  + (((x)&0x00FF0000)>>8)  + (((x)&0xFF000000)>>24) \
)

/* Compute a checksum on a buffer */
static void cksmCompute(
  u8 *a,           /* Content to be checksummed */
  int nByte,       /* Bytes of content in a[].  Must be a multiple of 8. */
  u8 *aOut         /* OUT: Final 8-byte checksum value output */
){
  u32 s1 = 0, s2 = 0;
  u32 *aData = (u32*)a;
  u32 *aEnd = (u32*)&a[nByte];
  u32 x = 1;

  assert( nByte>=8 );
  assert( (nByte&0x00000007)==0 );
  assert( nByte<=65536 );

  if( 1 == *(u8*)&x ){
    /* Little-endian */
    do {
      s1 += *aData++ + s2;
      s2 += *aData++ + s1;
    }while( aData<aEnd );
  }else{
    /* Big-endian */
    do {
      s1 += BYTESWAP32(aData[0]) + s2;
      s2 += BYTESWAP32(aData[1]) + s1;
      aData += 2;
    }while( aData<aEnd );
    s1 = BYTESWAP32(s1);
    s2 = BYTESWAP32(s2);
  }
  memcpy(aOut, &s1, 4);
  memcpy(aOut+4, &s2, 4);
}

/*
** SQL function:    verify_checksum(BLOB)
**
** Return 0 or 1 if the checksum is invalid or valid.  Or return
** NULL if the input is not a BLOB that is the right size for a
** database page.
*/
static void cksmVerifyFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  int nByte;
  u8 *data;
  u8 cksum[8];
  data = (u8*)sqlite3_value_blob(argv[0]);
  if( data==0 ) return;
  if( sqlite3_value_type(argv[0])!=SQLITE_BLOB ) return;
  nByte = sqlite3_value_bytes(argv[0]);
  if( nByte<512 || nByte>65536 || (nByte & (nByte-1))!=0 ) return;
  cksmCompute(data, nByte-8, cksum);
  sqlite3_result_int(context, memcmp(data+nByte-8,cksum,8)==0);
}

/*
** Close a cksm-file.
*/
static int cksmClose(sqlite3_file *pFile){
  CksmFile *p = (CksmFile *)pFile;
  if( p->pPartner ){
    assert( p->pPartner->pPartner==p );
    p->pPartner->pPartner = 0;
    p->pPartner = 0;
  }
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xClose(pFile);
}

/*
** Set the computeCkSm and verifyCksm flags, if they need to be
** changed.
*/
static void cksmSetFlags(CksmFile *p, int hasCorrectReserveSize){
  if( hasCorrectReserveSize!=p->computeCksm ){
    p->computeCksm = p->verifyCksm = hasCorrectReserveSize;
    if( p->pPartner ){
      p->pPartner->verifyCksm = hasCorrectReserveSize;
      p->pPartner->computeCksm = hasCorrectReserveSize;
    }
  }
}

/*
** Read data from a cksm-file.
*/
static int cksmRead(
  sqlite3_file *pFile, 
  void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  int rc;
  CksmFile *p = (CksmFile *)pFile;
  pFile = ORIGFILE(pFile);
  rc = pFile->pMethods->xRead(pFile, zBuf, iAmt, iOfst);
  if( rc==SQLITE_OK ){
    if( iOfst==0 && iAmt>=100 && memcmp(zBuf,"SQLite format 3",16)==0 ){
      u8 *d = (u8*)zBuf;
      char hasCorrectReserveSize = (d[20]==8);
      cksmSetFlags(p, hasCorrectReserveSize);
    }
    /* Verify the checksum if
    **    (1) the size indicates that we are dealing with a complete
    **        database page
    **    (2) checksum verification is enabled
    **    (3) we are not in the middle of checkpoint
    */
    if( iAmt>=512           /* (1) */
     && p->verifyCksm       /* (2) */
     && !p->inCkpt          /* (3) */
    ){
      u8 cksum[8];
      cksmCompute((u8*)zBuf, iAmt-8, cksum);
      if( memcmp((u8*)zBuf+iAmt-8, cksum, 8)!=0 ){
        sqlite3_log(SQLITE_IOERR_DATA,
           "checksum fault offset %lld of \"%s\"",
           iOfst, p->zFName);
        rc = SQLITE_IOERR_DATA;
      }
    }
  }
  return rc;
}

/*
** Write data to a cksm-file.
*/
static int cksmWrite(
  sqlite3_file *pFile,
  const void *zBuf,
  int iAmt,
  sqlite_int64 iOfst
){
  CksmFile *p = (CksmFile *)pFile;
  pFile = ORIGFILE(pFile);
  if( iOfst==0 && iAmt>=100 && memcmp(zBuf,"SQLite format 3",16)==0 ){
    u8 *d = (u8*)zBuf;
    char hasCorrectReserveSize = (d[20]==8);
    cksmSetFlags(p, hasCorrectReserveSize);
  }
  /* If the write size is appropriate for a database page and if
  ** checksums where ever enabled, then it will be safe to compute
  ** the checksums.  The reserve byte size might have increased, but
  ** it will never decrease.  And because it cannot decrease, the
  ** checksum will not overwrite anything.
  */
  if( iAmt>=512
   && p->computeCksm
   && !p->inCkpt
  ){
    cksmCompute((u8*)zBuf, iAmt-8, ((u8*)zBuf)+iAmt-8);
  }
  return pFile->pMethods->xWrite(pFile, zBuf, iAmt, iOfst);
}

/*
** Truncate a cksm-file.
*/
static int cksmTruncate(sqlite3_file *pFile, sqlite_int64 size){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xTruncate(pFile, size);
}

/*
** Sync a cksm-file.
*/
static int cksmSync(sqlite3_file *pFile, int flags){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xSync(pFile, flags);
}

/*
** Return the current file-size of a cksm-file.
*/
static int cksmFileSize(sqlite3_file *pFile, sqlite_int64 *pSize){
  CksmFile *p = (CksmFile *)pFile;
  pFile = ORIGFILE(p);
  return pFile->pMethods->xFileSize(pFile, pSize);
}

/*
** Lock a cksm-file.
*/
static int cksmLock(sqlite3_file *pFile, int eLock){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xLock(pFile, eLock);
}

/*
** Unlock a cksm-file.
*/
static int cksmUnlock(sqlite3_file *pFile, int eLock){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xUnlock(pFile, eLock);
}

/*
** Check if another file-handle holds a RESERVED lock on a cksm-file.
*/
static int cksmCheckReservedLock(sqlite3_file *pFile, int *pResOut){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xCheckReservedLock(pFile, pResOut);
}

/*
** File control method. For custom operations on a cksm-file.
*/
static int cksmFileControl(sqlite3_file *pFile, int op, void *pArg){
  int rc;
  CksmFile *p = (CksmFile*)pFile;
  pFile = ORIGFILE(pFile);
  if( op==SQLITE_FCNTL_PRAGMA ){
    char **azArg = (char**)pArg;
    assert( azArg[1]!=0 );
    if( sqlite3_stricmp(azArg[1],"checksum_verification")==0 ){
      char *zArg = azArg[2];
      if( zArg!=0 ){
        if( (zArg[0]>='1' && zArg[0]<='9')
         || sqlite3_strlike("enable%",zArg,0)==0
         || sqlite3_stricmp("yes",zArg)==0
         || sqlite3_stricmp("on",zArg)==0
        ){
          p->verifyCksm = p->computeCksm;
        }else{
          p->verifyCksm = 0;
        }
        if( p->pPartner ) p->pPartner->verifyCksm = p->verifyCksm;
      }
      azArg[0] = sqlite3_mprintf("%d",p->verifyCksm);
      return SQLITE_OK;
    }else if( p->computeCksm && azArg[2]!=0
           && sqlite3_stricmp(azArg[1], "page_size")==0 ){
      /* Do not allow page size changes on a checksum database */
      return SQLITE_OK;
    }
  }else if( op==SQLITE_FCNTL_CKPT_START || op==SQLITE_FCNTL_CKPT_DONE ){
    p->inCkpt = op==SQLITE_FCNTL_CKPT_START;
    if( p->pPartner ) p->pPartner->inCkpt = p->inCkpt;
  }
  rc = pFile->pMethods->xFileControl(pFile, op, pArg);
  if( rc==SQLITE_OK && op==SQLITE_FCNTL_VFSNAME ){
    *(char**)pArg = sqlite3_mprintf("cksm/%z", *(char**)pArg);
  }
  return rc;
}

/*
** Return the sector-size in bytes for a cksm-file.
*/
static int cksmSectorSize(sqlite3_file *pFile){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xSectorSize(pFile);
}

/*
** Return the device characteristic flags supported by a cksm-file.
*/
static int cksmDeviceCharacteristics(sqlite3_file *pFile){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xDeviceCharacteristics(pFile);
}

/* Create a shared memory file mapping */
static int cksmShmMap(
  sqlite3_file *pFile,
  int iPg,
  int pgsz,
  int bExtend,
  void volatile **pp
){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xShmMap(pFile,iPg,pgsz,bExtend,pp);
}

/* Perform locking on a shared-memory segment */
static int cksmShmLock(sqlite3_file *pFile, int offset, int n, int flags){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xShmLock(pFile,offset,n,flags);
}

/* Memory barrier operation on shared memory */
static void cksmShmBarrier(sqlite3_file *pFile){
  pFile = ORIGFILE(pFile);
  pFile->pMethods->xShmBarrier(pFile);
}

/* Unmap a shared memory segment */
static int cksmShmUnmap(sqlite3_file *pFile, int deleteFlag){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xShmUnmap(pFile,deleteFlag);
}

/* Fetch a page of a memory-mapped file */
static int cksmFetch(
  sqlite3_file *pFile,
  sqlite3_int64 iOfst,
  int iAmt,
  void **pp
){
  CksmFile *p = (CksmFile *)pFile;
  if( p->computeCksm ){
    *pp = 0;
    return SQLITE_OK;
  }
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xFetch(pFile, iOfst, iAmt, pp);
}

/* Release a memory-mapped page */
static int cksmUnfetch(sqlite3_file *pFile, sqlite3_int64 iOfst, void *pPage){
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xUnfetch(pFile, iOfst, pPage);
}

/*
** Open a cksm file handle.
*/
static int cksmOpen(
  sqlite3_vfs *pVfs,
  const char *zName,
  sqlite3_file *pFile,
  int flags,
  int *pOutFlags
){
  CksmFile *p;
  sqlite3_file *pSubFile;
  sqlite3_vfs *pSubVfs;
  int rc;
  pSubVfs = ORIGVFS(pVfs);
  if( (flags & (SQLITE_OPEN_MAIN_DB|SQLITE_OPEN_WAL))==0 ){
    return pSubVfs->xOpen(pSubVfs, zName, pFile, flags, pOutFlags);
  }
  p = (CksmFile*)pFile;
  memset(p, 0, sizeof(*p));
  pSubFile = ORIGFILE(pFile);
  pFile->pMethods = &cksm_io_methods;
  rc = pSubVfs->xOpen(pSubVfs, zName, pSubFile, flags, pOutFlags);
  if( rc ) goto cksm_open_done;
  if( flags & SQLITE_OPEN_WAL ){
    sqlite3_file *pDb = sqlite3_database_file_object(zName);
    p->pPartner = (CksmFile*)pDb;
    assert( p->pPartner->pPartner==0 );
    p->pPartner->pPartner = p;
    p->isWal = 1;
    p->computeCksm = p->pPartner->computeCksm;
  }else{
    p->isWal = 0;
    p->computeCksm = 0;
  }
  p->zFName = zName;
cksm_open_done:
  if( rc ) pFile->pMethods = 0;
  return rc;
}

/*
** All other VFS methods are pass-thrus.
*/
static int cksmDelete(sqlite3_vfs *pVfs, const char *zPath, int dirSync){
  return ORIGVFS(pVfs)->xDelete(ORIGVFS(pVfs), zPath, dirSync);
}
static int cksmAccess(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int flags, 
  int *pResOut
){
  return ORIGVFS(pVfs)->xAccess(ORIGVFS(pVfs), zPath, flags, pResOut);
}
static int cksmFullPathname(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int nOut, 
  char *zOut
){
  return ORIGVFS(pVfs)->xFullPathname(ORIGVFS(pVfs),zPath,nOut,zOut);
}
static void *cksmDlOpen(sqlite3_vfs *pVfs, const char *zPath){
  return ORIGVFS(pVfs)->xDlOpen(ORIGVFS(pVfs), zPath);
}
static void cksmDlError(sqlite3_vfs *pVfs, int nByte, char *zErrMsg){
  ORIGVFS(pVfs)->xDlError(ORIGVFS(pVfs), nByte, zErrMsg);
}
static void (*cksmDlSym(sqlite3_vfs *pVfs, void *p, const char *zSym))(void){
  return ORIGVFS(pVfs)->xDlSym(ORIGVFS(pVfs), p, zSym);
}
static void cksmDlClose(sqlite3_vfs *pVfs, void *pHandle){
  ORIGVFS(pVfs)->xDlClose(ORIGVFS(pVfs), pHandle);
}
static int cksmRandomness(sqlite3_vfs *pVfs, int nByte, char *zBufOut){
  return ORIGVFS(pVfs)->xRandomness(ORIGVFS(pVfs), nByte, zBufOut);
}
static int cksmSleep(sqlite3_vfs *pVfs, int nMicro){
  return ORIGVFS(pVfs)->xSleep(ORIGVFS(pVfs), nMicro);
}
static int cksmCurrentTime(sqlite3_vfs *pVfs, double *pTimeOut){
  return ORIGVFS(pVfs)->xCurrentTime(ORIGVFS(pVfs), pTimeOut);
}
static int cksmGetLastError(sqlite3_vfs *pVfs, int a, char *b){
  return ORIGVFS(pVfs)->xGetLastError(ORIGVFS(pVfs), a, b);
}
static int cksmCurrentTimeInt64(sqlite3_vfs *pVfs, sqlite3_int64 *p){
  return ORIGVFS(pVfs)->xCurrentTimeInt64(ORIGVFS(pVfs), p);
}
static int cksmSetSystemCall(
  sqlite3_vfs *pVfs,
  const char *zName,
  sqlite3_syscall_ptr pCall
){
  return ORIGVFS(pVfs)->xSetSystemCall(ORIGVFS(pVfs),zName,pCall);
}
static sqlite3_syscall_ptr cksmGetSystemCall(
  sqlite3_vfs *pVfs,
  const char *zName
){
  return ORIGVFS(pVfs)->xGetSystemCall(ORIGVFS(pVfs),zName);
}
static const char *cksmNextSystemCall(sqlite3_vfs *pVfs, const char *zName){
  return ORIGVFS(pVfs)->xNextSystemCall(ORIGVFS(pVfs), zName);
}

/* Register the verify_checksum() SQL function.
*/
static int cksmRegisterFunc(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc;
  if( db==0 ) return SQLITE_OK;
  rc = sqlite3_create_function(db, "verify_checksum", 1,
                   SQLITE_UTF8|SQLITE_INNOCUOUS|SQLITE_DETERMINISTIC,
                   0, cksmVerifyFunc, 0, 0);
  return rc;
}

/*
** Register the cksum VFS as the default VFS for the system.
** Also make arrangements to automatically register the "verify_checksum()"
** SQL function on each new database connection.
*/
static int cksmRegisterVfs(void){
  int rc = SQLITE_OK;
  sqlite3_vfs *pOrig;
  if( sqlite3_vfs_find("cksmvfs")!=0 ) return SQLITE_OK;
  pOrig = sqlite3_vfs_find(0);
  cksm_vfs.iVersion = pOrig->iVersion;
  cksm_vfs.pAppData = pOrig;
  cksm_vfs.szOsFile = pOrig->szOsFile + sizeof(CksmFile);
  rc = sqlite3_vfs_register(&cksm_vfs, 1);
  if( rc==SQLITE_OK ){
    rc = sqlite3_auto_extension((void(*)(void))cksmRegisterFunc);
  }
  return rc;
}

#if defined(SQLITE_CKSUMVFS_STATIC)
/* This variant of the initializer runs when the extension is
** statically linked.
*/
int sqlite3_register_cksumvfs(const char *NotUsed){
  (void)NotUsed;
  return cksmRegisterVfs();
}
#endif /* defined(SQLITE_CKSUMVFS_STATIC */

#if !defined(SQLITE_CKSUMVFS_STATIC)
/* This variant of the initializer function is used when the
** extension is shared library to be loaded at run-time.
*/
#ifdef _WIN32
__declspec(dllexport)
#endif
/* 
** This routine is called by sqlite3_load_extension() when the
** extension is first loaded.
***/
int sqlite3_cksumvfs_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg; /* not used */
  rc = cksmRegisterFunc(db, 0, 0);
  if( rc==SQLITE_OK ){
    
  }
  if( rc==SQLITE_OK ){
    rc = cksmRegisterVfs();
  }
  if( rc==SQLITE_OK ) rc = SQLITE_OK_LOAD_PERMANENTLY;
  return rc;
}
#endif /* !defined(SQLITE_CKSUMVFS_STATIC) */
