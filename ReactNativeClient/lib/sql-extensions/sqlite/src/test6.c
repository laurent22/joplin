/*
** 2004 May 22
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
** This file contains code that modified the OS layer in order to simulate
** the effect on the database file of an OS crash or power failure.  This
** is used to test the ability of SQLite to recover from those situations.
*/
#if SQLITE_TEST          /* This file is used for testing only */
#include "sqliteInt.h"
#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#endif

#ifndef SQLITE_OMIT_DISKIO  /* This file is a no-op if disk I/O is disabled */

/* #define TRACE_CRASHTEST */

typedef struct CrashFile CrashFile;
typedef struct CrashGlobal CrashGlobal;
typedef struct WriteBuffer WriteBuffer;

/*
** Method:
**
**   This layer is implemented as a wrapper around the "real" 
**   sqlite3_file object for the host system. Each time data is 
**   written to the file object, instead of being written to the
**   underlying file, the write operation is stored in an in-memory 
**   structure (type WriteBuffer). This structure is placed at the
**   end of a global ordered list (the write-list).
**
**   When data is read from a file object, the requested region is
**   first retrieved from the real file. The write-list is then 
**   traversed and data copied from any overlapping WriteBuffer 
**   structures to the output buffer. i.e. a read() operation following
**   one or more write() operations works as expected, even if no
**   data has actually been written out to the real file.
**
**   When a fsync() operation is performed, an operating system crash 
**   may be simulated, in which case exit(-1) is called (the call to 
**   xSync() never returns). Whether or not a crash is simulated,
**   the data associated with a subset of the WriteBuffer structures 
**   stored in the write-list is written to the real underlying files 
**   and the entries removed from the write-list. If a crash is simulated,
**   a subset of the buffers may be corrupted before the data is written.
**
**   The exact subset of the write-list written and/or corrupted is
**   determined by the simulated device characteristics and sector-size.
**
** "Normal" mode:
**
**   Normal mode is used when the simulated device has none of the
**   SQLITE_IOCAP_XXX flags set.
**
**   In normal mode, if the fsync() is not a simulated crash, the 
**   write-list is traversed from beginning to end. Each WriteBuffer
**   structure associated with the file handle used to call xSync()
**   is written to the real file and removed from the write-list.
**
**   If a crash is simulated, one of the following takes place for 
**   each WriteBuffer in the write-list, regardless of which 
**   file-handle it is associated with:
**
**     1. The buffer is correctly written to the file, just as if
**        a crash were not being simulated.
**
**     2. Nothing is done.
**
**     3. Garbage data is written to all sectors of the file that 
**        overlap the region specified by the WriteBuffer. Or garbage
**        data is written to some contiguous section within the 
**        overlapped sectors.
**
** Device Characteristic flag handling:
**
**   If the IOCAP_ATOMIC flag is set, then option (3) above is 
**   never selected.
**
**   If the IOCAP_ATOMIC512 flag is set, and the WriteBuffer represents
**   an aligned write() of an integer number of 512 byte regions, then
**   option (3) above is never selected. Instead, each 512 byte region
**   is either correctly written or left completely untouched. Similar
**   logic governs the behavior if any of the other ATOMICXXX flags
**   is set.
**
**   If either the IOCAP_SAFEAPPEND or IOCAP_SEQUENTIAL flags are set
**   and a crash is being simulated, then an entry of the write-list is
**   selected at random. Everything in the list after the selected entry 
**   is discarded before processing begins.
**
**   If IOCAP_SEQUENTIAL is set and a crash is being simulated, option 
**   (1) is selected for all write-list entries except the last. If a 
**   crash is not being simulated, then all entries in the write-list
**   that occur before at least one write() on the file-handle specified
**   as part of the xSync() are written to their associated real files.
**
**   If IOCAP_SAFEAPPEND is set and the first byte written by the write()
**   operation is one byte past the current end of the file, then option
**   (1) is always selected.
*/

/*
** Each write operation in the write-list is represented by an instance
** of the following structure.
**
** If zBuf is 0, then this structure represents a call to xTruncate(), 
** not xWrite(). In that case, iOffset is the size that the file is
** truncated to.
*/
struct WriteBuffer {
  i64 iOffset;                 /* Byte offset of the start of this write() */
  int nBuf;                    /* Number of bytes written */
  u8 *zBuf;                    /* Pointer to copy of written data */
  CrashFile *pFile;            /* File this write() applies to */

  WriteBuffer *pNext;          /* Next in CrashGlobal.pWriteList */
};

struct CrashFile {
  const sqlite3_io_methods *pMethod;   /* Must be first */
  sqlite3_file *pRealFile;             /* Underlying "real" file handle */
  char *zName;
  int flags;                           /* Flags the file was opened with */

  /* Cache of the entire file. This is used to speed up OsRead() and 
  ** OsFileSize() calls. Although both could be done by traversing the
  ** write-list, in practice this is impractically slow.
  */
  u8 *zData;                           /* Buffer containing file contents */
  int nData;                           /* Size of buffer allocated at zData */
  i64 iSize;                           /* Size of file in bytes */
};

struct CrashGlobal {
  WriteBuffer *pWriteList;     /* Head of write-list */
  WriteBuffer *pWriteListEnd;  /* End of write-list */

  int iSectorSize;             /* Value of simulated sector size */
  int iDeviceCharacteristics;  /* Value of simulated device characteristics */

  int iCrash;                  /* Crash on the iCrash'th call to xSync() */
  char zCrashFile[500];        /* Crash during an xSync() on this file */ 
};

static CrashGlobal g = {0, 0, SQLITE_DEFAULT_SECTOR_SIZE, 0, 0};

/*
** Set this global variable to 1 to enable crash testing.
*/
static int sqlite3CrashTestEnable = 0;

static void *crash_malloc(int nByte){
  return (void *)Tcl_AttemptAlloc((size_t)nByte);
}
static void crash_free(void *p){
  Tcl_Free(p);
}
static void *crash_realloc(void *p, int n){
  return (void *)Tcl_AttemptRealloc(p, (size_t)n);
}

/*
** Wrapper around the sqlite3OsWrite() function that avoids writing to the
** 512 byte block begining at offset PENDING_BYTE.
*/
static int writeDbFile(CrashFile *p, u8 *z, i64 iAmt, i64 iOff){
  int rc = SQLITE_OK;
  int iSkip = 0;
  if( (iAmt-iSkip)>0 ){
    rc = sqlite3OsWrite(p->pRealFile, &z[iSkip], (int)(iAmt-iSkip), iOff+iSkip);
  }
  return rc;
}

/*
** Flush the write-list as if xSync() had been called on file handle
** pFile. If isCrash is true, simulate a crash.
*/
static int writeListSync(CrashFile *pFile, int isCrash){
  int rc = SQLITE_OK;
  int iDc = g.iDeviceCharacteristics;

  WriteBuffer *pWrite;
  WriteBuffer **ppPtr;

  /* If this is not a crash simulation, set pFinal to point to the 
  ** last element of the write-list that is associated with file handle
  ** pFile.
  **
  ** If this is a crash simulation, set pFinal to an arbitrarily selected
  ** element of the write-list.
  */
  WriteBuffer *pFinal = 0;
  if( !isCrash ){
    for(pWrite=g.pWriteList; pWrite; pWrite=pWrite->pNext){
      if( pWrite->pFile==pFile ){
        pFinal = pWrite;
      }
    }
  }else if( iDc&(SQLITE_IOCAP_SEQUENTIAL|SQLITE_IOCAP_SAFE_APPEND) ){
    int nWrite = 0;
    int iFinal;
    for(pWrite=g.pWriteList; pWrite; pWrite=pWrite->pNext) nWrite++;
    sqlite3_randomness(sizeof(int), &iFinal);
    iFinal = ((iFinal<0)?-1*iFinal:iFinal)%nWrite;
    for(pWrite=g.pWriteList; iFinal>0; pWrite=pWrite->pNext) iFinal--;
    pFinal = pWrite;
  }

#ifdef TRACE_CRASHTEST
  if( pFile ){
    printf("Sync %s (is %s crash)\n", pFile->zName, (isCrash?"a":"not a"));
  }
#endif

  ppPtr = &g.pWriteList;
  for(pWrite=*ppPtr; rc==SQLITE_OK && pWrite; pWrite=*ppPtr){
    sqlite3_file *pRealFile = pWrite->pFile->pRealFile;

    /* (eAction==1)      -> write block out normally,
    ** (eAction==2)      -> do nothing,
    ** (eAction==3)      -> trash sectors.
    */
    int eAction = 0;
    if( !isCrash ){
      eAction = 2;
      if( (pWrite->pFile==pFile || iDc&SQLITE_IOCAP_SEQUENTIAL) ){
        eAction = 1;
      }
    }else{
      char random;
      sqlite3_randomness(1, &random);

      /* Do not select option 3 (sector trashing) if the IOCAP_ATOMIC flag 
      ** is set or this is an OsTruncate(), not an Oswrite().
      */
      if( (iDc&SQLITE_IOCAP_ATOMIC) || (pWrite->zBuf==0) ){
        random &= 0x01;
      }

      /* If IOCAP_SEQUENTIAL is set and this is not the final entry
      ** in the truncated write-list, always select option 1 (write
      ** out correctly).
      */
      if( (iDc&SQLITE_IOCAP_SEQUENTIAL && pWrite!=pFinal) ){
        random = 0;
      }

      /* If IOCAP_SAFE_APPEND is set and this OsWrite() operation is
      ** an append (first byte of the written region is 1 byte past the
      ** current EOF), always select option 1 (write out correctly).
      */
      if( iDc&SQLITE_IOCAP_SAFE_APPEND && pWrite->zBuf ){
        i64 iSize;
        sqlite3OsFileSize(pRealFile, &iSize);
        if( iSize==pWrite->iOffset ){
          random = 0;
        }
      }

      if( (random&0x06)==0x06 ){
        eAction = 3;
      }else{
        eAction = ((random&0x01)?2:1);
      }
    }

    switch( eAction ){
      case 1: {               /* Write out correctly */
        if( pWrite->zBuf ){
          rc = writeDbFile(
              pWrite->pFile, pWrite->zBuf, pWrite->nBuf, pWrite->iOffset
          );
        }else{
          rc = sqlite3OsTruncate(pRealFile, pWrite->iOffset);
        }
        *ppPtr = pWrite->pNext;
#ifdef TRACE_CRASHTEST
        if( isCrash ){
          printf("Writing %d bytes @ %d (%s)\n", 
            pWrite->nBuf, (int)pWrite->iOffset, pWrite->pFile->zName
          );
        }
#endif
        crash_free(pWrite);
        break;
      }
      case 2: {               /* Do nothing */
        ppPtr = &pWrite->pNext;
#ifdef TRACE_CRASHTEST
        if( isCrash ){
          printf("Omiting %d bytes @ %d (%s)\n", 
            pWrite->nBuf, (int)pWrite->iOffset, pWrite->pFile->zName
          );
        }
#endif
        break;
      }
      case 3: {               /* Trash sectors */
        u8 *zGarbage;
        int iFirst = (int)(pWrite->iOffset/g.iSectorSize);
        int iLast = (int)((pWrite->iOffset+pWrite->nBuf-1)/g.iSectorSize);

        assert(pWrite->zBuf);

#ifdef TRACE_CRASHTEST
        printf("Trashing %d sectors (%d bytes) @ %lld (sector %d) (%s)\n", 
            1+iLast-iFirst, (1+iLast-iFirst)*g.iSectorSize,
            pWrite->iOffset, iFirst, pWrite->pFile->zName
        );
#endif

        zGarbage = crash_malloc(g.iSectorSize);
        if( zGarbage ){
          sqlite3_int64 i;
          for(i=iFirst; rc==SQLITE_OK && i<=iLast; i++){
            sqlite3_randomness(g.iSectorSize, zGarbage); 
            rc = writeDbFile(
              pWrite->pFile, zGarbage, g.iSectorSize, i*g.iSectorSize
            );
          }
          crash_free(zGarbage);
        }else{
          rc = SQLITE_NOMEM;
        }

        ppPtr = &pWrite->pNext;
        break;
      }

      default:
        assert(!"Cannot happen");
    }

    if( pWrite==pFinal ) break;
  }

  if( rc==SQLITE_OK && isCrash ){
    exit(-1);
  }

  for(pWrite=g.pWriteList; pWrite && pWrite->pNext; pWrite=pWrite->pNext);
  g.pWriteListEnd = pWrite;

  return rc;
}

/*
** Add an entry to the end of the write-list.
*/
static int writeListAppend(
  sqlite3_file *pFile,
  sqlite3_int64 iOffset,
  const u8 *zBuf,
  int nBuf
){
  WriteBuffer *pNew;

  assert((zBuf && nBuf) || (!nBuf && !zBuf));

  pNew = (WriteBuffer *)crash_malloc(sizeof(WriteBuffer) + nBuf);
  if( pNew==0 ){
    fprintf(stderr, "out of memory in the crash simulator\n");
  }
  memset(pNew, 0, sizeof(WriteBuffer)+nBuf);
  pNew->iOffset = iOffset;
  pNew->nBuf = nBuf;
  pNew->pFile = (CrashFile *)pFile;
  if( zBuf ){
    pNew->zBuf = (u8 *)&pNew[1];
    memcpy(pNew->zBuf, zBuf, nBuf);
  }

  if( g.pWriteList ){
    assert(g.pWriteListEnd);
    g.pWriteListEnd->pNext = pNew;
  }else{
    g.pWriteList = pNew;
  }
  g.pWriteListEnd = pNew;
  
  return SQLITE_OK;
}

/*
** Close a crash-file.
*/
static int cfClose(sqlite3_file *pFile){
  CrashFile *pCrash = (CrashFile *)pFile;
  writeListSync(pCrash, 0);
  sqlite3OsClose(pCrash->pRealFile);
  return SQLITE_OK;
}

/*
** Read data from a crash-file.
*/
static int cfRead(
  sqlite3_file *pFile, 
  void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  CrashFile *pCrash = (CrashFile *)pFile;
  int nCopy = (int)MIN((i64)iAmt, (pCrash->iSize - iOfst));

  if( nCopy>0 ){
    memcpy(zBuf, &pCrash->zData[iOfst], nCopy);
  }

  /* Check the file-size to see if this is a short-read */
  if( nCopy<iAmt ){
    return SQLITE_IOERR_SHORT_READ;
  }

  return SQLITE_OK;
}

/*
** Write data to a crash-file.
*/
static int cfWrite(
  sqlite3_file *pFile, 
  const void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  CrashFile *pCrash = (CrashFile *)pFile;
  if( iAmt+iOfst>pCrash->iSize ){
    pCrash->iSize = (int)(iAmt+iOfst);
  }
  while( pCrash->iSize>pCrash->nData ){
    u8 *zNew;
    int nNew = (pCrash->nData*2) + 4096;
    zNew = crash_realloc(pCrash->zData, nNew);
    if( !zNew ){
      return SQLITE_NOMEM;
    }
    memset(&zNew[pCrash->nData], 0, nNew-pCrash->nData);
    pCrash->nData = nNew;
    pCrash->zData = zNew;
  }
  memcpy(&pCrash->zData[iOfst], zBuf, iAmt);
  return writeListAppend(pFile, iOfst, zBuf, iAmt);
}

/*
** Truncate a crash-file.
*/
static int cfTruncate(sqlite3_file *pFile, sqlite_int64 size){
  CrashFile *pCrash = (CrashFile *)pFile;
  assert(size>=0);
  if( pCrash->iSize>size ){
    pCrash->iSize = (int)size;
  }
  return writeListAppend(pFile, size, 0, 0);
}

/*
** Sync a crash-file.
*/
static int cfSync(sqlite3_file *pFile, int flags){
  CrashFile *pCrash = (CrashFile *)pFile;
  int isCrash = 0;

  const char *zName = pCrash->zName;
  const char *zCrashFile = g.zCrashFile;
  int nName = (int)strlen(zName);
  int nCrashFile = (int)strlen(zCrashFile);

  if( nCrashFile>0 && zCrashFile[nCrashFile-1]=='*' ){
    nCrashFile--;
    if( nName>nCrashFile ) nName = nCrashFile;
  }

#ifdef TRACE_CRASHTEST
  printf("cfSync(): nName = %d, nCrashFile = %d, zName = %s, zCrashFile = %s\n",
         nName, nCrashFile, zName, zCrashFile);
#endif

  if( nName==nCrashFile && 0==memcmp(zName, zCrashFile, nName) ){
#ifdef TRACE_CRASHTEST
    printf("cfSync(): name matched, g.iCrash = %d\n", g.iCrash);
#endif
    if( (--g.iCrash)==0 ) isCrash = 1;
  }

  return writeListSync(pCrash, isCrash);
}

/*
** Return the current file-size of the crash-file.
*/
static int cfFileSize(sqlite3_file *pFile, sqlite_int64 *pSize){
  CrashFile *pCrash = (CrashFile *)pFile;
  *pSize = (i64)pCrash->iSize;
  return SQLITE_OK;
}

/*
** Calls related to file-locks are passed on to the real file handle.
*/
static int cfLock(sqlite3_file *pFile, int eLock){
  return sqlite3OsLock(((CrashFile *)pFile)->pRealFile, eLock);
}
static int cfUnlock(sqlite3_file *pFile, int eLock){
  return sqlite3OsUnlock(((CrashFile *)pFile)->pRealFile, eLock);
}
static int cfCheckReservedLock(sqlite3_file *pFile, int *pResOut){
  return sqlite3OsCheckReservedLock(((CrashFile *)pFile)->pRealFile, pResOut);
}
static int cfFileControl(sqlite3_file *pFile, int op, void *pArg){
  if( op==SQLITE_FCNTL_SIZE_HINT ){
    CrashFile *pCrash = (CrashFile *)pFile;
    i64 nByte = *(i64 *)pArg;
    if( nByte>pCrash->iSize ){
      if( SQLITE_OK==writeListAppend(pFile, nByte, 0, 0) ){
        pCrash->iSize = (int)nByte;
      }
    }
    return SQLITE_OK;
  }
  return sqlite3OsFileControl(((CrashFile *)pFile)->pRealFile, op, pArg);
}

/*
** The xSectorSize() and xDeviceCharacteristics() functions return
** the global values configured by the [sqlite_crashparams] tcl
*  interface.
*/
static int cfSectorSize(sqlite3_file *pFile){
  return g.iSectorSize;
}
static int cfDeviceCharacteristics(sqlite3_file *pFile){
  return g.iDeviceCharacteristics;
}

/*
** Pass-throughs for WAL support.
*/
static int cfShmLock(sqlite3_file *pFile, int ofst, int n, int flags){
  return sqlite3OsShmLock(((CrashFile*)pFile)->pRealFile, ofst, n, flags);
}
static void cfShmBarrier(sqlite3_file *pFile){
  sqlite3OsShmBarrier(((CrashFile*)pFile)->pRealFile);
}
static int cfShmUnmap(sqlite3_file *pFile, int delFlag){
  return sqlite3OsShmUnmap(((CrashFile*)pFile)->pRealFile, delFlag);
}
static int cfShmMap(
  sqlite3_file *pFile,            /* Handle open on database file */
  int iRegion,                    /* Region to retrieve */
  int sz,                         /* Size of regions */
  int w,                          /* True to extend file if necessary */
  void volatile **pp              /* OUT: Mapped memory */
){
  return sqlite3OsShmMap(((CrashFile*)pFile)->pRealFile, iRegion, sz, w, pp);
}

static const sqlite3_io_methods CrashFileVtab = {
  2,                            /* iVersion */
  cfClose,                      /* xClose */
  cfRead,                       /* xRead */
  cfWrite,                      /* xWrite */
  cfTruncate,                   /* xTruncate */
  cfSync,                       /* xSync */
  cfFileSize,                   /* xFileSize */
  cfLock,                       /* xLock */
  cfUnlock,                     /* xUnlock */
  cfCheckReservedLock,          /* xCheckReservedLock */
  cfFileControl,                /* xFileControl */
  cfSectorSize,                 /* xSectorSize */
  cfDeviceCharacteristics,      /* xDeviceCharacteristics */
  cfShmMap,                     /* xShmMap */
  cfShmLock,                    /* xShmLock */
  cfShmBarrier,                 /* xShmBarrier */
  cfShmUnmap                    /* xShmUnmap */
};

/*
** Application data for the crash VFS
*/
struct crashAppData {
  sqlite3_vfs *pOrig;                   /* Wrapped vfs structure */
};

/*
** Open a crash-file file handle.
**
** The caller will have allocated pVfs->szOsFile bytes of space
** at pFile. This file uses this space for the CrashFile structure
** and allocates space for the "real" file structure using 
** sqlite3_malloc(). The assumption here is (pVfs->szOsFile) is
** equal or greater than sizeof(CrashFile).
*/
static int cfOpen(
  sqlite3_vfs *pCfVfs,
  const char *zName,
  sqlite3_file *pFile,
  int flags,
  int *pOutFlags
){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  int rc;
  CrashFile *pWrapper = (CrashFile *)pFile;
  sqlite3_file *pReal = (sqlite3_file*)&pWrapper[1];

  memset(pWrapper, 0, sizeof(CrashFile));
  rc = sqlite3OsOpen(pVfs, zName, pReal, flags, pOutFlags);

  if( rc==SQLITE_OK ){
    i64 iSize;
    pWrapper->pMethod = &CrashFileVtab;
    pWrapper->zName = (char *)zName;
    pWrapper->pRealFile = pReal;
    rc = sqlite3OsFileSize(pReal, &iSize);
    pWrapper->iSize = (int)iSize;
    pWrapper->flags = flags;
  }
  if( rc==SQLITE_OK ){
    pWrapper->nData = (int)(4096 + pWrapper->iSize);
    pWrapper->zData = crash_malloc(pWrapper->nData);
    if( pWrapper->zData ){
      /* os_unix.c contains an assert() that fails if the caller attempts
      ** to read data from the 512-byte locking region of a file opened
      ** with the SQLITE_OPEN_MAIN_DB flag. This region of a database file
      ** never contains valid data anyhow. So avoid doing such a read here.
      **
      ** UPDATE: It also contains an assert() verifying that each call
      ** to the xRead() method reads less than 128KB of data.
      */
      i64 iOff;

      memset(pWrapper->zData, 0, pWrapper->nData);
      for(iOff=0; iOff<pWrapper->iSize; iOff += 512){
        int nRead = (int)(pWrapper->iSize - iOff);
        if( nRead>512 ) nRead = 512;
        rc = sqlite3OsRead(pReal, &pWrapper->zData[iOff], nRead, iOff);
      }
    }else{
      rc = SQLITE_NOMEM;
    }
  }
  if( rc!=SQLITE_OK && pWrapper->pMethod ){
    sqlite3OsClose(pFile);
  }
  return rc;
}

static int cfDelete(sqlite3_vfs *pCfVfs, const char *zPath, int dirSync){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xDelete(pVfs, zPath, dirSync);
}
static int cfAccess(
  sqlite3_vfs *pCfVfs, 
  const char *zPath, 
  int flags, 
  int *pResOut
){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xAccess(pVfs, zPath, flags, pResOut);
}
static int cfFullPathname(
  sqlite3_vfs *pCfVfs, 
  const char *zPath, 
  int nPathOut,
  char *zPathOut
){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xFullPathname(pVfs, zPath, nPathOut, zPathOut);
}
static void *cfDlOpen(sqlite3_vfs *pCfVfs, const char *zPath){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xDlOpen(pVfs, zPath);
}
static void cfDlError(sqlite3_vfs *pCfVfs, int nByte, char *zErrMsg){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  pVfs->xDlError(pVfs, nByte, zErrMsg);
}
static void (*cfDlSym(sqlite3_vfs *pCfVfs, void *pH, const char *zSym))(void){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xDlSym(pVfs, pH, zSym);
}
static void cfDlClose(sqlite3_vfs *pCfVfs, void *pHandle){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  pVfs->xDlClose(pVfs, pHandle);
}
static int cfRandomness(sqlite3_vfs *pCfVfs, int nByte, char *zBufOut){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xRandomness(pVfs, nByte, zBufOut);
}
static int cfSleep(sqlite3_vfs *pCfVfs, int nMicro){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xSleep(pVfs, nMicro);
}
static int cfCurrentTime(sqlite3_vfs *pCfVfs, double *pTimeOut){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xCurrentTime(pVfs, pTimeOut);
}
static int cfGetLastError(sqlite3_vfs *pCfVfs, int n, char *z){
  sqlite3_vfs *pVfs = (sqlite3_vfs *)pCfVfs->pAppData;
  return pVfs->xGetLastError(pVfs, n, z);
}

static int processDevSymArgs(
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[],
  int *piDeviceChar,
  int *piSectorSize
){
  struct DeviceFlag {
    char *zName;
    int iValue;
  } aFlag[] = {
    { "atomic",              SQLITE_IOCAP_ATOMIC                },
    { "atomic512",           SQLITE_IOCAP_ATOMIC512             },
    { "atomic1k",            SQLITE_IOCAP_ATOMIC1K              },
    { "atomic2k",            SQLITE_IOCAP_ATOMIC2K              },
    { "atomic4k",            SQLITE_IOCAP_ATOMIC4K              },
    { "atomic8k",            SQLITE_IOCAP_ATOMIC8K              },
    { "atomic16k",           SQLITE_IOCAP_ATOMIC16K             },
    { "atomic32k",           SQLITE_IOCAP_ATOMIC32K             },
    { "atomic64k",           SQLITE_IOCAP_ATOMIC64K             },
    { "sequential",          SQLITE_IOCAP_SEQUENTIAL            },
    { "safe_append",         SQLITE_IOCAP_SAFE_APPEND           },
    { "powersafe_overwrite", SQLITE_IOCAP_POWERSAFE_OVERWRITE   },
    { "batch-atomic",        SQLITE_IOCAP_BATCH_ATOMIC          },
    { 0, 0 }
  };

  int i;
  int iDc = 0;
  int iSectorSize = 0;
  int setSectorsize = 0;
  int setDeviceChar = 0;

  for(i=0; i<objc; i+=2){
    int nOpt;
    char *zOpt = Tcl_GetStringFromObj(objv[i], &nOpt);

    if( (nOpt>11 || nOpt<2 || strncmp("-sectorsize", zOpt, nOpt)) 
     && (nOpt>16 || nOpt<2 || strncmp("-characteristics", zOpt, nOpt))
    ){
      Tcl_AppendResult(interp, 
        "Bad option: \"", zOpt, 
        "\" - must be \"-characteristics\" or \"-sectorsize\"", 0
      );
      return TCL_ERROR;
    }
    if( i==objc-1 ){
      Tcl_AppendResult(interp, "Option requires an argument: \"", zOpt, "\"",0);
      return TCL_ERROR;
    }

    if( zOpt[1]=='s' ){
      if( Tcl_GetIntFromObj(interp, objv[i+1], &iSectorSize) ){
        return TCL_ERROR;
      }
      setSectorsize = 1;
    }else{
      int j;
      Tcl_Obj **apObj;
      int nObj;
      if( Tcl_ListObjGetElements(interp, objv[i+1], &nObj, &apObj) ){
        return TCL_ERROR;
      }
      for(j=0; j<nObj; j++){
        int rc;
        int iChoice;
        Tcl_Obj *pFlag = Tcl_DuplicateObj(apObj[j]);
        Tcl_IncrRefCount(pFlag);
        Tcl_UtfToLower(Tcl_GetString(pFlag));
 
        rc = Tcl_GetIndexFromObjStruct(
            interp, pFlag, aFlag, sizeof(aFlag[0]), "no such flag", 0, &iChoice
        );
        Tcl_DecrRefCount(pFlag);
        if( rc ){
          return TCL_ERROR;
        }

        iDc |= aFlag[iChoice].iValue;
      }
      setDeviceChar = 1;
    }
  }

  if( setDeviceChar ){
    *piDeviceChar = iDc;
  }
  if( setSectorsize ){
    *piSectorSize = iSectorSize;
  }

  return TCL_OK;
}

/*
** tclcmd:   sqlite3_crash_now
**
** Simulate a crash immediately. This function does not return 
** (writeListSync() calls exit(-1)).
*/
static int SQLITE_TCLAPI crashNowCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  if( objc!=1 ){
    Tcl_WrongNumArgs(interp, 1, objv, "");
    return TCL_ERROR;
  }
  writeListSync(0, 1);
  assert( 0 );
  return TCL_OK;
}

/*
** tclcmd:   sqlite_crash_enable ENABLE ?DEFAULT?
**
** Parameter ENABLE must be a boolean value. If true, then the "crash"
** vfs is added to the system. If false, it is removed.
*/
static int SQLITE_TCLAPI crashEnableCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int isEnable;
  int isDefault = 0;
  static sqlite3_vfs crashVfs = {
    2,                  /* iVersion */
    0,                  /* szOsFile */
    0,                  /* mxPathname */
    0,                  /* pNext */
    "crash",            /* zName */
    0,                  /* pAppData */
  
    cfOpen,               /* xOpen */
    cfDelete,             /* xDelete */
    cfAccess,             /* xAccess */
    cfFullPathname,       /* xFullPathname */
    cfDlOpen,             /* xDlOpen */
    cfDlError,            /* xDlError */
    cfDlSym,              /* xDlSym */
    cfDlClose,            /* xDlClose */
    cfRandomness,         /* xRandomness */
    cfSleep,              /* xSleep */
    cfCurrentTime,        /* xCurrentTime */
    cfGetLastError,       /* xGetLastError */
    0,                    /* xCurrentTimeInt64 */
  };

  if( objc!=2 && objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "ENABLE ?DEFAULT?");
    return TCL_ERROR;
  }

  if( Tcl_GetBooleanFromObj(interp, objv[1], &isEnable) ){
    return TCL_ERROR;
  }
  if( objc==3 && Tcl_GetBooleanFromObj(interp, objv[2], &isDefault) ){
    return TCL_ERROR;
  }

  if( (isEnable && crashVfs.pAppData) || (!isEnable && !crashVfs.pAppData) ){
    return TCL_OK;
  }

  if( crashVfs.pAppData==0 ){
    sqlite3_vfs *pOriginalVfs = sqlite3_vfs_find(0);
    crashVfs.mxPathname = pOriginalVfs->mxPathname;
    crashVfs.pAppData = (void *)pOriginalVfs;
    crashVfs.szOsFile = sizeof(CrashFile) + pOriginalVfs->szOsFile;
    sqlite3_vfs_register(&crashVfs, isDefault);
  }else{
    crashVfs.pAppData = 0;
    sqlite3_vfs_unregister(&crashVfs);
  }

  return TCL_OK;
}

/*
** tclcmd:   sqlite_crashparams ?OPTIONS? DELAY CRASHFILE
**
** This procedure implements a TCL command that enables crash testing
** in testfixture.  Once enabled, crash testing cannot be disabled.
**
** Available options are "-characteristics" and "-sectorsize". Both require
** an argument. For -sectorsize, this is the simulated sector size in
** bytes. For -characteristics, the argument must be a list of io-capability
** flags to simulate. Valid flags are "atomic", "atomic512", "atomic1K",
** "atomic2K", "atomic4K", "atomic8K", "atomic16K", "atomic32K", 
** "atomic64K", "sequential" and "safe_append".
**
** Example:
**
**   sqlite_crashparams -sect 1024 -char {atomic sequential} ./test.db 1
**
*/
static int SQLITE_TCLAPI crashParamsObjCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int iDelay;
  const char *zCrashFile;
  int nCrashFile, iDc, iSectorSize;

  iDc = -1;
  iSectorSize = -1;

  if( objc<3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "?OPTIONS? DELAY CRASHFILE");
    goto error;
  }

  zCrashFile = Tcl_GetStringFromObj(objv[objc-1], &nCrashFile);
  if( nCrashFile>=sizeof(g.zCrashFile) ){
    Tcl_AppendResult(interp, "Filename is too long: \"", zCrashFile, "\"", 0);
    goto error;
  }
  if( Tcl_GetIntFromObj(interp, objv[objc-2], &iDelay) ){
    goto error;
  }

  if( processDevSymArgs(interp, objc-3, &objv[1], &iDc, &iSectorSize) ){
    return TCL_ERROR;
  }

  if( iDc>=0 ){
    g.iDeviceCharacteristics = iDc;
  }
  if( iSectorSize>=0 ){
    g.iSectorSize = iSectorSize;
  }

  g.iCrash = iDelay;
  memcpy(g.zCrashFile, zCrashFile, nCrashFile+1);
  sqlite3CrashTestEnable = 1;
  return TCL_OK;

error:
  return TCL_ERROR;
}

static int SQLITE_TCLAPI devSymObjCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  void devsym_register(int iDeviceChar, int iSectorSize);

  int iDc = -1;
  int iSectorSize = -1;

  if( processDevSymArgs(interp, objc-1, &objv[1], &iDc, &iSectorSize) ){
    return TCL_ERROR;
  }
  devsym_register(iDc, iSectorSize);

  return TCL_OK;
}

/*
** tclcmd: sqlite3_crash_on_write N
*/
static int SQLITE_TCLAPI writeCrashObjCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  void devsym_crash_on_write(int);
  int nWrite = 0;

  if( objc!=2 ){
    Tcl_WrongNumArgs(interp, 1, objv, "NWRITE");
    return TCL_ERROR;
  }
  if( Tcl_GetIntFromObj(interp, objv[1], &nWrite) ){
    return TCL_ERROR;
  }

  devsym_crash_on_write(nWrite);
  return TCL_OK;
}

/*
** tclcmd: unregister_devsim
*/
static int SQLITE_TCLAPI dsUnregisterObjCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  void devsym_unregister(void);

  if( objc!=1 ){
    Tcl_WrongNumArgs(interp, 1, objv, "");
    return TCL_ERROR;
  }

  devsym_unregister();
  return TCL_OK;
}

/*
** tclcmd: register_jt_vfs ?-default? PARENT-VFS
*/
static int SQLITE_TCLAPI jtObjCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  int jt_register(char *, int);
  char *zParent = 0;

  if( objc!=2 && objc!=3 ){
    Tcl_WrongNumArgs(interp, 1, objv, "?-default? PARENT-VFS");
    return TCL_ERROR;
  }
  zParent = Tcl_GetString(objv[1]);
  if( objc==3 ){
    if( strcmp(zParent, "-default") ){
      Tcl_AppendResult(interp, 
          "bad option \"", zParent, "\": must be -default", 0
      );
      return TCL_ERROR;
    }
    zParent = Tcl_GetString(objv[2]);
  }

  if( !(*zParent) ){
    zParent = 0;
  }
  if( jt_register(zParent, objc==3) ){
    Tcl_AppendResult(interp, "Error in jt_register", 0);
    return TCL_ERROR;
  }

  return TCL_OK;
}

/*
** tclcmd: unregister_jt_vfs
*/
static int SQLITE_TCLAPI jtUnregisterObjCmd(
  void * clientData,
  Tcl_Interp *interp,
  int objc,
  Tcl_Obj *CONST objv[]
){
  void jt_unregister(void);

  if( objc!=1 ){
    Tcl_WrongNumArgs(interp, 1, objv, "");
    return TCL_ERROR;
  }

  jt_unregister();
  return TCL_OK;
}

#endif /* SQLITE_OMIT_DISKIO */

/*
** This procedure registers the TCL procedures defined in this file.
*/
int Sqlitetest6_Init(Tcl_Interp *interp){
#ifndef SQLITE_OMIT_DISKIO
  Tcl_CreateObjCommand(interp, "sqlite3_crash_enable", crashEnableCmd, 0, 0);
  Tcl_CreateObjCommand(interp, "sqlite3_crashparams", crashParamsObjCmd, 0, 0);
  Tcl_CreateObjCommand(interp, "sqlite3_crash_now", crashNowCmd, 0, 0);
  Tcl_CreateObjCommand(interp, "sqlite3_simulate_device", devSymObjCmd, 0, 0);
  Tcl_CreateObjCommand(interp, "sqlite3_crash_on_write", writeCrashObjCmd,0,0);
  Tcl_CreateObjCommand(interp, "unregister_devsim", dsUnregisterObjCmd, 0, 0);
  Tcl_CreateObjCommand(interp, "register_jt_vfs", jtObjCmd, 0, 0);
  Tcl_CreateObjCommand(interp, "unregister_jt_vfs", jtUnregisterObjCmd, 0, 0);
#endif
  return TCL_OK;
}

#endif /* SQLITE_TEST */
