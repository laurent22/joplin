/*
** 2011-12-03
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
** Win32-specific run-time environment implementation for LSM.
*/

#ifdef _WIN32

#include <assert.h>
#include <string.h>

#include <stdlib.h>
#include <stdarg.h>
#include <stdio.h>
#include <ctype.h>

#include "windows.h"

#include "lsmInt.h"

/*
** An open file is an instance of the following object
*/
typedef struct Win32File Win32File;
struct Win32File {
  lsm_env *pEnv;                  /* The run-time environment */
  const char *zName;              /* Full path to file */

  HANDLE hFile;                   /* Open file handle */
  HANDLE hShmFile;                /* File handle for *-shm file */

  SYSTEM_INFO sysInfo;            /* Operating system information */
  HANDLE hMap;                    /* File handle for mapping */
  LPVOID pMap;                    /* Pointer to mapping of file fd */
  size_t nMap;                    /* Size of mapping at pMap in bytes */
  int nShm;                       /* Number of entries in ahShm[]/apShm[] */
  LPHANDLE ahShm;                 /* Array of handles for shared mappings */
  LPVOID *apShm;                  /* Array of 32K shared memory segments */
};

static char *win32ShmFile(Win32File *pWin32File){
  char *zShm;
  int nName = strlen(pWin32File->zName);
  zShm = (char *)lsmMallocZero(pWin32File->pEnv, nName+4+1);
  if( zShm ){
    memcpy(zShm, pWin32File->zName, nName);
    memcpy(&zShm[nName], "-shm", 5);
  }
  return zShm;
}

static int win32Sleep(int us){
  Sleep((us + 999) / 1000);
  return LSM_OK;
}

/*
** The number of times that an I/O operation will be retried following a
** locking error - probably caused by antivirus software.  Also the initial
** delay before the first retry.  The delay increases linearly with each
** retry.
*/
#ifndef LSM_WIN32_IOERR_RETRY
# define LSM_WIN32_IOERR_RETRY 10
#endif
#ifndef LSM_WIN32_IOERR_RETRY_DELAY
# define LSM_WIN32_IOERR_RETRY_DELAY 25000
#endif
static int win32IoerrRetry = LSM_WIN32_IOERR_RETRY;
static int win32IoerrRetryDelay = LSM_WIN32_IOERR_RETRY_DELAY;

/*
** The "win32IoerrCanRetry1" macro is used to determine if a particular
** I/O error code obtained via GetLastError() is eligible to be retried.
** It must accept the error code DWORD as its only argument and should
** return non-zero if the error code is transient in nature and the
** operation responsible for generating the original error might succeed
** upon being retried.  The argument to this macro should be a variable.
**
** Additionally, a macro named "win32IoerrCanRetry2" may be defined.  If
** it is defined, it will be consulted only when the macro
** "win32IoerrCanRetry1" returns zero.  The "win32IoerrCanRetry2" macro
** is completely optional and may be used to include additional error
** codes in the set that should result in the failing I/O operation being
** retried by the caller.  If defined, the "win32IoerrCanRetry2" macro
** must exhibit external semantics identical to those of the
** "win32IoerrCanRetry1" macro.
*/
#if !defined(win32IoerrCanRetry1)
#define win32IoerrCanRetry1(a) (((a)==ERROR_ACCESS_DENIED)        || \
                                ((a)==ERROR_SHARING_VIOLATION)    || \
                                ((a)==ERROR_LOCK_VIOLATION)       || \
                                ((a)==ERROR_DEV_NOT_EXIST)        || \
                                ((a)==ERROR_NETNAME_DELETED)      || \
                                ((a)==ERROR_SEM_TIMEOUT)          || \
                                ((a)==ERROR_NETWORK_UNREACHABLE))
#endif

/*
** If an I/O error occurs, invoke this routine to see if it should be
** retried.  Return TRUE to retry.  Return FALSE to give up with an
** error.
*/
static int win32RetryIoerr(
  lsm_env *pEnv,
  int *pnRetry
){
  DWORD lastErrno;
  if( *pnRetry>=win32IoerrRetry ){
    return 0;
  }
  lastErrno = GetLastError();
  if( win32IoerrCanRetry1(lastErrno) ){
    win32Sleep(win32IoerrRetryDelay*(1+*pnRetry));
    ++*pnRetry;
    return 1;
  }
#if defined(win32IoerrCanRetry2)
  else if( win32IoerrCanRetry2(lastErrno) ){
    win32Sleep(win32IoerrRetryDelay*(1+*pnRetry));
    ++*pnRetry;
    return 1;
  }
#endif
  return 0;
}

/*
** Convert a UTF-8 string to Microsoft Unicode.
**
** Space to hold the returned string is obtained from lsmMalloc().
*/
static LPWSTR win32Utf8ToUnicode(lsm_env *pEnv, const char *zText){
  int nChar;
  LPWSTR zWideText;

  nChar = MultiByteToWideChar(CP_UTF8, 0, zText, -1, NULL, 0);
  if( nChar==0 ){
    return 0;
  }
  zWideText = lsmMallocZero(pEnv, nChar * sizeof(WCHAR));
  if( zWideText==0 ){
    return 0;
  }
  nChar = MultiByteToWideChar(CP_UTF8, 0, zText, -1, zWideText, nChar);
  if( nChar==0 ){
    lsmFree(pEnv, zWideText);
    zWideText = 0;
  }
  return zWideText;
}

/*
** Convert a Microsoft Unicode string to UTF-8.
**
** Space to hold the returned string is obtained from lsmMalloc().
*/
static char *win32UnicodeToUtf8(lsm_env *pEnv, LPCWSTR zWideText){
  int nByte;
  char *zText;

  nByte = WideCharToMultiByte(CP_UTF8, 0, zWideText, -1, 0, 0, 0, 0);
  if( nByte == 0 ){
    return 0;
  }
  zText = lsmMallocZero(pEnv, nByte);
  if( zText==0 ){
    return 0;
  }
  nByte = WideCharToMultiByte(CP_UTF8, 0, zWideText, -1, zText, nByte, 0, 0);
  if( nByte == 0 ){
    lsmFree(pEnv, zText);
    zText = 0;
  }
  return zText;
}

#if !defined(win32IsNotFound)
#define win32IsNotFound(a) (((a)==ERROR_FILE_NOT_FOUND)  || \
                            ((a)==ERROR_PATH_NOT_FOUND))
#endif

static int win32Open(
  lsm_env *pEnv,
  const char *zFile,
  int flags,
  LPHANDLE phFile
){
  int rc;
  LPWSTR zConverted;

  zConverted = win32Utf8ToUnicode(pEnv, zFile);
  if( zConverted==0 ){
    rc = LSM_NOMEM_BKPT;
  }else{
    int bReadonly = (flags & LSM_OPEN_READONLY);
    DWORD dwDesiredAccess;
    DWORD dwShareMode = FILE_SHARE_READ | FILE_SHARE_WRITE;
    DWORD dwCreationDisposition;
    DWORD dwFlagsAndAttributes = FILE_ATTRIBUTE_NORMAL;
    HANDLE hFile;
    int nRetry = 0;
    if( bReadonly ){
      dwDesiredAccess = GENERIC_READ;
      dwCreationDisposition = OPEN_EXISTING;
    }else{
      dwDesiredAccess = GENERIC_READ | GENERIC_WRITE;
      dwCreationDisposition = OPEN_ALWAYS;
    }
    while( (hFile = CreateFileW((LPCWSTR)zConverted,
                                dwDesiredAccess,
                                dwShareMode, NULL,
                                dwCreationDisposition,
                                dwFlagsAndAttributes,
                                NULL))==INVALID_HANDLE_VALUE &&
                                win32RetryIoerr(pEnv, &nRetry) ){
      /* Noop */
    }
    lsmFree(pEnv, zConverted);
    if( hFile!=INVALID_HANDLE_VALUE ){
      *phFile = hFile;
      rc = LSM_OK;
    }else{
      if( win32IsNotFound(GetLastError()) ){
        rc = lsmErrorBkpt(LSM_IOERR_NOENT);
      }else{
        rc = LSM_IOERR_BKPT;
      }
    }
  }
  return rc;
}

static int lsmWin32OsOpen(
  lsm_env *pEnv,
  const char *zFile,
  int flags,
  lsm_file **ppFile
){
  int rc = LSM_OK;
  Win32File *pWin32File;

  pWin32File = lsmMallocZero(pEnv, sizeof(Win32File));
  if( pWin32File==0 ){
    rc = LSM_NOMEM_BKPT;
  }else{
    HANDLE hFile = NULL;

    rc = win32Open(pEnv, zFile, flags, &hFile);
    if( rc==LSM_OK ){
      memset(&pWin32File->sysInfo, 0, sizeof(SYSTEM_INFO));
      GetSystemInfo(&pWin32File->sysInfo);
      pWin32File->pEnv = pEnv;
      pWin32File->zName = zFile;
      pWin32File->hFile = hFile;
    }else{
      lsmFree(pEnv, pWin32File);
      pWin32File = 0;
    }
  }
  *ppFile = (lsm_file *)pWin32File;
  return rc;
}

static int lsmWin32OsWrite(
  lsm_file *pFile, /* File to write to */
  lsm_i64 iOff,    /* Offset to write to */
  void *pData,     /* Write data from this buffer */
  int nData        /* Bytes of data to write */
){
  Win32File *pWin32File = (Win32File *)pFile;
  OVERLAPPED overlapped;  /* The offset for WriteFile. */
  u8 *aRem = (u8 *)pData; /* Data yet to be written */
  int nRem = nData;       /* Number of bytes yet to be written */
  int nRetry = 0;         /* Number of retrys */

  memset(&overlapped, 0, sizeof(OVERLAPPED));
  overlapped.Offset = (LONG)(iOff & 0XFFFFFFFF);
  overlapped.OffsetHigh = (LONG)((iOff>>32) & 0x7FFFFFFF);
  while( nRem>0 ){
    DWORD nWrite = 0; /* Bytes written using WriteFile */
    if( !WriteFile(pWin32File->hFile, aRem, nRem, &nWrite, &overlapped) ){
      if( win32RetryIoerr(pWin32File->pEnv, &nRetry) ) continue;
      break;
    }
    assert( nWrite==0 || nWrite<=(DWORD)nRem );
    if( nWrite==0 || nWrite>(DWORD)nRem ){
      break;
    }
    iOff += nWrite;
    overlapped.Offset = (LONG)(iOff & 0xFFFFFFFF);
    overlapped.OffsetHigh = (LONG)((iOff>>32) & 0x7FFFFFFF);
    aRem += nWrite;
    nRem -= nWrite;
  }
  if( nRem!=0 ) return LSM_IOERR_BKPT;
  return LSM_OK;
}

static int win32Truncate(
  HANDLE hFile,
  lsm_i64 nSize
){
  LARGE_INTEGER offset;
  offset.QuadPart = nSize;
  if( !SetFilePointerEx(hFile, offset, 0, FILE_BEGIN) ){
    return LSM_IOERR_BKPT;
  }
  if (!SetEndOfFile(hFile) ){
    return LSM_IOERR_BKPT;
  }
  return LSM_OK;
}

static int lsmWin32OsTruncate(
  lsm_file *pFile, /* File to write to */
  lsm_i64 nSize    /* Size to truncate file to */
){
  Win32File *pWin32File = (Win32File *)pFile;
  return win32Truncate(pWin32File->hFile, nSize);
}

static int lsmWin32OsRead(
  lsm_file *pFile, /* File to read from */
  lsm_i64 iOff,    /* Offset to read from */
  void *pData,     /* Read data into this buffer */
  int nData        /* Bytes of data to read */
){
  Win32File *pWin32File = (Win32File *)pFile;
  OVERLAPPED overlapped; /* The offset for ReadFile */
  DWORD nRead = 0;       /* Bytes read using ReadFile */
  int nRetry = 0;        /* Number of retrys */

  memset(&overlapped, 0, sizeof(OVERLAPPED));
  overlapped.Offset = (LONG)(iOff & 0XFFFFFFFF);
  overlapped.OffsetHigh = (LONG)((iOff>>32) & 0X7FFFFFFF);
  while( !ReadFile(pWin32File->hFile, pData, nData, &nRead, &overlapped) &&
         GetLastError()!=ERROR_HANDLE_EOF ){
    if( win32RetryIoerr(pWin32File->pEnv, &nRetry) ) continue;
    return LSM_IOERR_BKPT;
  }
  if( nRead<(DWORD)nData ){
    /* Unread parts of the buffer must be zero-filled */
    memset(&((char*)pData)[nRead], 0, nData - nRead);
  }
  return LSM_OK;
}

static int lsmWin32OsSync(lsm_file *pFile){
  int rc = LSM_OK;

#ifndef LSM_NO_SYNC
  Win32File *pWin32File = (Win32File *)pFile;

  if( pWin32File->pMap!=NULL ){
    if( !FlushViewOfFile(pWin32File->pMap, 0) ){
      rc = LSM_IOERR_BKPT;
    }
  }
  if( rc==LSM_OK && !FlushFileBuffers(pWin32File->hFile) ){
    rc = LSM_IOERR_BKPT;
  }
#else
  unused_parameter(pFile);
#endif

  return rc;
}

static int lsmWin32OsSectorSize(lsm_file *pFile){
  return 512;
}

static void win32Unmap(Win32File *pWin32File){
  if( pWin32File->pMap!=NULL ){
    UnmapViewOfFile(pWin32File->pMap);
    pWin32File->pMap = NULL;
    pWin32File->nMap = 0;
  }
  if( pWin32File->hMap!=NULL ){
    CloseHandle(pWin32File->hMap);
    pWin32File->hMap = NULL;
  }
}

static int lsmWin32OsRemap(
  lsm_file *pFile,
  lsm_i64 iMin,
  void **ppOut,
  lsm_i64 *pnOut
){
  Win32File *pWin32File = (Win32File *)pFile;

  /* If the file is between 0 and 2MB in size, extend it in chunks of 256K.
  ** Thereafter, in chunks of 1MB at a time.  */
  const int aIncrSz[] = {256*1024, 1024*1024};
  int nIncrSz = aIncrSz[iMin>(2*1024*1024)];

  *ppOut = NULL;
  *pnOut = 0;

  win32Unmap(pWin32File);
  if( iMin>=0 ){
    LARGE_INTEGER fileSize;
    DWORD dwSizeHigh;
    DWORD dwSizeLow;
    HANDLE hMap;
    LPVOID pMap;
    memset(&fileSize, 0, sizeof(LARGE_INTEGER));
    if( !GetFileSizeEx(pWin32File->hFile, &fileSize) ){
      return LSM_IOERR_BKPT;
    }
    assert( fileSize.QuadPart>=0 );
    if( fileSize.QuadPart<iMin ){
      int rc;
      fileSize.QuadPart = ((iMin + nIncrSz-1) / nIncrSz) * nIncrSz;
      rc = lsmWin32OsTruncate(pFile, fileSize.QuadPart);
      if( rc!=LSM_OK ){
        return rc;
      }
    }
    dwSizeLow = (DWORD)(fileSize.QuadPart & 0xFFFFFFFF);
    dwSizeHigh = (DWORD)((fileSize.QuadPart & 0x7FFFFFFFFFFFFFFF) >> 32);
    hMap = CreateFileMappingW(pWin32File->hFile, NULL, PAGE_READWRITE,
                              dwSizeHigh, dwSizeLow, NULL);
    if( hMap==NULL ){
      return LSM_IOERR_BKPT;
    }
    pWin32File->hMap = hMap;
    assert( fileSize.QuadPart<=0xFFFFFFFF );
    pMap = MapViewOfFile(hMap, FILE_MAP_WRITE | FILE_MAP_READ, 0, 0,
                         (SIZE_T)fileSize.QuadPart);
    if( pMap==NULL ){
      return LSM_IOERR_BKPT;
    }
    pWin32File->pMap = pMap;
    pWin32File->nMap = (SIZE_T)fileSize.QuadPart;
  }
  *ppOut = pWin32File->pMap;
  *pnOut = pWin32File->nMap;
  return LSM_OK;
}

static BOOL win32IsDriveLetterAndColon(
  const char *zPathname
){
  return ( isalpha(zPathname[0]) && zPathname[1]==':' );
}

static int lsmWin32OsFullpath(
  lsm_env *pEnv,
  const char *zName,
  char *zOut,
  int *pnOut
){
  DWORD nByte;
  void *zConverted;
  LPWSTR zTempWide;
  char *zTempUtf8;

  if( zName[0]=='/' && win32IsDriveLetterAndColon(zName+1) ){
    zName++;
  }
  zConverted = win32Utf8ToUnicode(pEnv, zName);
  if( zConverted==0 ){
    return LSM_NOMEM_BKPT;
  }
  nByte = GetFullPathNameW((LPCWSTR)zConverted, 0, 0, 0);
  if( nByte==0 ){
    lsmFree(pEnv, zConverted);
    return LSM_IOERR_BKPT;
  }
  nByte += 3;
  zTempWide = lsmMallocZero(pEnv, nByte * sizeof(zTempWide[0]));
  if( zTempWide==0 ){
    lsmFree(pEnv, zConverted);
    return LSM_NOMEM_BKPT;
  }
  nByte = GetFullPathNameW((LPCWSTR)zConverted, nByte, zTempWide, 0);
  if( nByte==0 ){
    lsmFree(pEnv, zConverted);
    lsmFree(pEnv, zTempWide);
    return LSM_IOERR_BKPT;
  }
  lsmFree(pEnv, zConverted);
  zTempUtf8 = win32UnicodeToUtf8(pEnv, zTempWide);
  lsmFree(pEnv, zTempWide);
  if( zTempUtf8 ){
    int nOut = *pnOut;
    int nLen = strlen(zTempUtf8) + 1;
    if( nLen<=nOut ){
      snprintf(zOut, nOut, "%s", zTempUtf8);
    }
    lsmFree(pEnv, zTempUtf8);
    *pnOut = nLen;
    return LSM_OK;
  }else{
    return LSM_NOMEM_BKPT;
  }
}

static int lsmWin32OsFileid(
  lsm_file *pFile,
  void *pBuf,
  int *pnBuf
){
  int nBuf;
  int nReq;
  u8 *pBuf2 = (u8 *)pBuf;
  Win32File *pWin32File = (Win32File *)pFile;
  BY_HANDLE_FILE_INFORMATION fileInfo;

  nBuf = *pnBuf;
  nReq = (sizeof(fileInfo.dwVolumeSerialNumber) +
          sizeof(fileInfo.nFileIndexHigh) +
          sizeof(fileInfo.nFileIndexLow));
  *pnBuf = nReq;
  if( nReq>nBuf ) return LSM_OK;
  memset(&fileInfo, 0, sizeof(BY_HANDLE_FILE_INFORMATION));
  if( !GetFileInformationByHandle(pWin32File->hFile, &fileInfo) ){
    return LSM_IOERR_BKPT;
  }
  nReq = sizeof(fileInfo.dwVolumeSerialNumber);
  memcpy(pBuf2, &fileInfo.dwVolumeSerialNumber, nReq);
  pBuf2 += nReq;
  nReq = sizeof(fileInfo.nFileIndexHigh);
  memcpy(pBuf, &fileInfo.nFileIndexHigh, nReq);
  pBuf2 += nReq;
  nReq = sizeof(fileInfo.nFileIndexLow);
  memcpy(pBuf2, &fileInfo.nFileIndexLow, nReq);
  return LSM_OK;
}

static int win32Delete(
  lsm_env *pEnv,
  const char *zFile
){
  int rc;
  LPWSTR zConverted;

  zConverted = win32Utf8ToUnicode(pEnv, zFile);
  if( zConverted==0 ){
    rc = LSM_NOMEM_BKPT;
  }else{
    int nRetry = 0;
    DWORD attr;

    do {
      attr = GetFileAttributesW(zConverted);
      if ( attr==INVALID_FILE_ATTRIBUTES ){
        rc = LSM_IOERR_BKPT;
        break;
      }
      if ( attr&FILE_ATTRIBUTE_DIRECTORY ){
        rc = LSM_IOERR_BKPT; /* Files only. */
        break;
      }
      if ( DeleteFileW(zConverted) ){
        rc = LSM_OK; /* Deleted OK. */
        break;
      }
      if ( !win32RetryIoerr(pEnv, &nRetry) ){
        rc = LSM_IOERR_BKPT; /* No more retries. */
        break;
      }
    }while( 1 );
  }
  lsmFree(pEnv, zConverted);
  return rc;
}

static int lsmWin32OsUnlink(lsm_env *pEnv, const char *zFile){
  return win32Delete(pEnv, zFile);
}

#if !defined(win32IsLockBusy)
#define win32IsLockBusy(a) (((a)==ERROR_LOCK_VIOLATION) || \
                            ((a)==ERROR_IO_PENDING))
#endif

static int win32LockFile(
  Win32File *pWin32File,
  int iLock,
  int nLock,
  int eType
){
  OVERLAPPED ovlp;

  assert( LSM_LOCK_UNLOCK==0 );
  assert( LSM_LOCK_SHARED==1 );
  assert( LSM_LOCK_EXCL==2 );
  assert( eType>=LSM_LOCK_UNLOCK && eType<=LSM_LOCK_EXCL );
  assert( nLock>=0 );
  assert( iLock>0 && iLock<=32 );

  memset(&ovlp, 0, sizeof(OVERLAPPED));
  ovlp.Offset = (4096-iLock-nLock+1);
  if( eType>LSM_LOCK_UNLOCK ){
    DWORD flags = LOCKFILE_FAIL_IMMEDIATELY;
    if( eType>=LSM_LOCK_EXCL ) flags |= LOCKFILE_EXCLUSIVE_LOCK;
    if( !LockFileEx(pWin32File->hFile, flags, 0, (DWORD)nLock, 0, &ovlp) ){
      if( win32IsLockBusy(GetLastError()) ){
        return LSM_BUSY;
      }else{
        return LSM_IOERR_BKPT;
      }
    }
  }else{
    if( !UnlockFileEx(pWin32File->hFile, 0, (DWORD)nLock, 0, &ovlp) ){
      return LSM_IOERR_BKPT;
    }
  }
  return LSM_OK;
}

static int lsmWin32OsLock(lsm_file *pFile, int iLock, int eType){
  Win32File *pWin32File = (Win32File *)pFile;
  return win32LockFile(pWin32File, iLock, 1, eType);
}

static int lsmWin32OsTestLock(lsm_file *pFile, int iLock, int nLock, int eType){
  int rc;
  Win32File *pWin32File = (Win32File *)pFile;
  rc = win32LockFile(pWin32File, iLock, nLock, eType);
  if( rc!=LSM_OK ) return rc;
  win32LockFile(pWin32File, iLock, nLock, LSM_LOCK_UNLOCK);
  return LSM_OK;
}

static int lsmWin32OsShmMap(lsm_file *pFile, int iChunk, int sz, void **ppShm){
  int rc;
  Win32File *pWin32File = (Win32File *)pFile;
  int iOffset = iChunk * sz;
  int iOffsetShift = iOffset % pWin32File->sysInfo.dwAllocationGranularity;
  int nNew = iChunk + 1;
  lsm_i64 nReq = nNew * sz;

  *ppShm = NULL;
  assert( sz>=0 );
  assert( sz==LSM_SHM_CHUNK_SIZE );
  if( iChunk>=pWin32File->nShm ){
    LPHANDLE ahNew;
    LPVOID *apNew;
    LARGE_INTEGER fileSize;

    /* If the shared-memory file has not been opened, open it now. */
    if( pWin32File->hShmFile==NULL ){
      char *zShm = win32ShmFile(pWin32File);
      if( !zShm ) return LSM_NOMEM_BKPT;
      rc = win32Open(pWin32File->pEnv, zShm, 0, &pWin32File->hShmFile);
      lsmFree(pWin32File->pEnv, zShm);
      if( rc!=LSM_OK ){
        return rc;
      }
    }

    /* If the shared-memory file is not large enough to contain the
    ** requested chunk, cause it to grow.  */
    memset(&fileSize, 0, sizeof(LARGE_INTEGER));
    if( !GetFileSizeEx(pWin32File->hShmFile, &fileSize) ){
      return LSM_IOERR_BKPT;
    }
    assert( fileSize.QuadPart>=0 );
    if( fileSize.QuadPart<nReq ){
      rc = win32Truncate(pWin32File->hShmFile, nReq);
      if( rc!=LSM_OK ){
        return rc;
      }
    }

    ahNew = (LPHANDLE)lsmMallocZero(pWin32File->pEnv, sizeof(HANDLE) * nNew);
    if( !ahNew ) return LSM_NOMEM_BKPT;
    apNew = (LPVOID *)lsmMallocZero(pWin32File->pEnv, sizeof(LPVOID) * nNew);
    if( !apNew ){
      lsmFree(pWin32File->pEnv, ahNew);
      return LSM_NOMEM_BKPT;
    }
    memcpy(ahNew, pWin32File->ahShm, sizeof(HANDLE) * pWin32File->nShm);
    memcpy(apNew, pWin32File->apShm, sizeof(LPVOID) * pWin32File->nShm);
    lsmFree(pWin32File->pEnv, pWin32File->ahShm);
    pWin32File->ahShm = ahNew;
    lsmFree(pWin32File->pEnv, pWin32File->apShm);
    pWin32File->apShm = apNew;
    pWin32File->nShm = nNew;
  }

  if( pWin32File->ahShm[iChunk]==NULL ){
    HANDLE hMap;
    assert( nReq<=0xFFFFFFFF );
    hMap = CreateFileMappingW(pWin32File->hShmFile, NULL, PAGE_READWRITE, 0,
                              (DWORD)nReq, NULL);
    if( hMap==NULL ){
      return LSM_IOERR_BKPT;
    }
    pWin32File->ahShm[iChunk] = hMap;
  }
  if( pWin32File->apShm[iChunk]==NULL ){
    LPVOID pMap;
    pMap = MapViewOfFile(pWin32File->ahShm[iChunk],
                         FILE_MAP_WRITE | FILE_MAP_READ, 0,
                         iOffset - iOffsetShift, sz + iOffsetShift);
    if( pMap==NULL ){
      return LSM_IOERR_BKPT;
    }
    pWin32File->apShm[iChunk] = pMap;
  }
  if( iOffsetShift!=0 ){
    char *p = (char *)pWin32File->apShm[iChunk];
    *ppShm = (void *)&p[iOffsetShift];
  }else{
    *ppShm = pWin32File->apShm[iChunk];
  }
  return LSM_OK;
}

static void lsmWin32OsShmBarrier(void){
  MemoryBarrier();
}

static int lsmWin32OsShmUnmap(lsm_file *pFile, int bDelete){
  Win32File *pWin32File = (Win32File *)pFile;

  if( pWin32File->hShmFile!=NULL ){
    int i;
    for(i=0; i<pWin32File->nShm; i++){
      if( pWin32File->apShm[i]!=NULL ){
        UnmapViewOfFile(pWin32File->apShm[i]);
        pWin32File->apShm[i] = NULL;
      }
      if( pWin32File->ahShm[i]!=NULL ){
        CloseHandle(pWin32File->ahShm[i]);
        pWin32File->ahShm[i] = NULL;
      }
    }
    CloseHandle(pWin32File->hShmFile);
    pWin32File->hShmFile = NULL;
    if( bDelete ){
      char *zShm = win32ShmFile(pWin32File);
      if( zShm ){ win32Delete(pWin32File->pEnv, zShm); }
      lsmFree(pWin32File->pEnv, zShm);
    }
  }
  return LSM_OK;
}

#define MX_CLOSE_ATTEMPT 3
static int lsmWin32OsClose(lsm_file *pFile){
  int rc;
  int nRetry = 0;
  Win32File *pWin32File = (Win32File *)pFile;
  lsmWin32OsShmUnmap(pFile, 0);
  win32Unmap(pWin32File);
  do{
    if( pWin32File->hFile==NULL ){
      rc = LSM_IOERR_BKPT;
      break;
    }
    rc = CloseHandle(pWin32File->hFile);
    if( rc ){
      pWin32File->hFile = NULL;
      rc = LSM_OK;
      break;
    }
    if( ++nRetry>=MX_CLOSE_ATTEMPT ){
      rc = LSM_IOERR_BKPT;
      break;
    }
  }while( 1 );
  lsmFree(pWin32File->pEnv, pWin32File->ahShm);
  lsmFree(pWin32File->pEnv, pWin32File->apShm);
  lsmFree(pWin32File->pEnv, pWin32File);
  return rc;
}

static int lsmWin32OsSleep(lsm_env *pEnv, int us){
  unused_parameter(pEnv);
  return win32Sleep(us);
}

/****************************************************************************
** Memory allocation routines.
*/

static void *lsmWin32OsMalloc(lsm_env *pEnv, size_t N){
  assert( HeapValidate(GetProcessHeap(), 0, NULL) );
  return HeapAlloc(GetProcessHeap(), 0, (SIZE_T)N);
}

static void lsmWin32OsFree(lsm_env *pEnv, void *p){
  assert( HeapValidate(GetProcessHeap(), 0, NULL) );
  if( p ){
    HeapFree(GetProcessHeap(), 0, p);
  }
}

static void *lsmWin32OsRealloc(lsm_env *pEnv, void *p, size_t N){
  unsigned char *m = (unsigned char *)p;
  assert( HeapValidate(GetProcessHeap(), 0, NULL) );
  if( 1>N ){
    lsmWin32OsFree(pEnv, p);
    return NULL;
  }else if( NULL==p ){
    return lsmWin32OsMalloc(pEnv, N);
  }else{
#if 0 /* arguable: don't shrink */
    SIZE_T sz = HeapSize(GetProcessHeap(), 0, m);
    if( sz>=(SIZE_T)N ){
      return p;
    }
#endif
    return HeapReAlloc(GetProcessHeap(), 0, m, N);
  }
}

static size_t lsmWin32OsMSize(lsm_env *pEnv, void *p){
  assert( HeapValidate(GetProcessHeap(), 0, NULL) );
  return (size_t)HeapSize(GetProcessHeap(), 0, p);
}


#ifdef LSM_MUTEX_WIN32
/*************************************************************************
** Mutex methods for Win32 based systems.  If LSM_MUTEX_WIN32 is
** missing then a no-op implementation of mutexes found below will be
** used instead.
*/
#include "windows.h"

typedef struct Win32Mutex Win32Mutex;
struct Win32Mutex {
  lsm_env *pEnv;
  CRITICAL_SECTION mutex;
#ifdef LSM_DEBUG
  DWORD owner;
#endif
};

#ifndef WIN32_MUTEX_INITIALIZER
# define WIN32_MUTEX_INITIALIZER { 0 }
#endif

#ifdef LSM_DEBUG
# define LSM_WIN32_STATIC_MUTEX { 0, WIN32_MUTEX_INITIALIZER, 0 }
#else
# define LSM_WIN32_STATIC_MUTEX { 0, WIN32_MUTEX_INITIALIZER }
#endif

static int lsmWin32OsMutexStatic(
  lsm_env *pEnv,
  int iMutex,
  lsm_mutex **ppStatic
){
  static volatile LONG initialized = 0;
  static Win32Mutex sMutex[2] = {
    LSM_WIN32_STATIC_MUTEX,
    LSM_WIN32_STATIC_MUTEX
  };

  assert( iMutex==LSM_MUTEX_GLOBAL || iMutex==LSM_MUTEX_HEAP );
  assert( LSM_MUTEX_GLOBAL==1 && LSM_MUTEX_HEAP==2 );

  if( InterlockedCompareExchange(&initialized, 1, 0)==0 ){
    int i;
    for(i=0; i<array_size(sMutex); i++){
      InitializeCriticalSection(&sMutex[i].mutex);
    }
  }
  *ppStatic = (lsm_mutex *)&sMutex[iMutex-1];
  return LSM_OK;
}

static int lsmWin32OsMutexNew(lsm_env *pEnv, lsm_mutex **ppNew){
  Win32Mutex *pMutex;           /* Pointer to new mutex */

  pMutex = (Win32Mutex *)lsmMallocZero(pEnv, sizeof(Win32Mutex));
  if( !pMutex ) return LSM_NOMEM_BKPT;

  pMutex->pEnv = pEnv;
  InitializeCriticalSection(&pMutex->mutex);

  *ppNew = (lsm_mutex *)pMutex;
  return LSM_OK;
}

static void lsmWin32OsMutexDel(lsm_mutex *p){
  Win32Mutex *pMutex = (Win32Mutex *)p;
  DeleteCriticalSection(&pMutex->mutex);
  lsmFree(pMutex->pEnv, pMutex);
}

static void lsmWin32OsMutexEnter(lsm_mutex *p){
  Win32Mutex *pMutex = (Win32Mutex *)p;
  EnterCriticalSection(&pMutex->mutex);

#ifdef LSM_DEBUG
  assert( pMutex->owner!=GetCurrentThreadId() );
  pMutex->owner = GetCurrentThreadId();
  assert( pMutex->owner==GetCurrentThreadId() );
#endif
}

static int lsmWin32OsMutexTry(lsm_mutex *p){
  BOOL bRet;
  Win32Mutex *pMutex = (Win32Mutex *)p;
  bRet = TryEnterCriticalSection(&pMutex->mutex);
#ifdef LSM_DEBUG
  if( bRet ){
    assert( pMutex->owner!=GetCurrentThreadId() );
    pMutex->owner = GetCurrentThreadId();
    assert( pMutex->owner==GetCurrentThreadId() );
  }
#endif
  return !bRet;
}

static void lsmWin32OsMutexLeave(lsm_mutex *p){
  Win32Mutex *pMutex = (Win32Mutex *)p;
#ifdef LSM_DEBUG
  assert( pMutex->owner==GetCurrentThreadId() );
  pMutex->owner = 0;
  assert( pMutex->owner!=GetCurrentThreadId() );
#endif
  LeaveCriticalSection(&pMutex->mutex);
}

#ifdef LSM_DEBUG
static int lsmWin32OsMutexHeld(lsm_mutex *p){
  Win32Mutex *pMutex = (Win32Mutex *)p;
  return pMutex ? pMutex->owner==GetCurrentThreadId() : 1;
}
static int lsmWin32OsMutexNotHeld(lsm_mutex *p){
  Win32Mutex *pMutex = (Win32Mutex *)p;
  return pMutex ? pMutex->owner!=GetCurrentThreadId() : 1;
}
#endif
/*
** End of Win32 mutex implementation.
*************************************************************************/
#else
/*************************************************************************
** Noop mutex implementation
*/
typedef struct NoopMutex NoopMutex;
struct NoopMutex {
  lsm_env *pEnv;                  /* Environment handle (for xFree()) */
  int bHeld;                      /* True if mutex is held */
  int bStatic;                    /* True for a static mutex */
};
static NoopMutex aStaticNoopMutex[2] = {
  {0, 0, 1},
  {0, 0, 1},
};

static int lsmWin32OsMutexStatic(
  lsm_env *pEnv,
  int iMutex,
  lsm_mutex **ppStatic
){
  assert( iMutex>=1 && iMutex<=(int)array_size(aStaticNoopMutex) );
  *ppStatic = (lsm_mutex *)&aStaticNoopMutex[iMutex-1];
  return LSM_OK;
}
static int lsmWin32OsMutexNew(lsm_env *pEnv, lsm_mutex **ppNew){
  NoopMutex *p;
  p = (NoopMutex *)lsmMallocZero(pEnv, sizeof(NoopMutex));
  if( p ) p->pEnv = pEnv;
  *ppNew = (lsm_mutex *)p;
  return (p ? LSM_OK : LSM_NOMEM_BKPT);
}
static void lsmWin32OsMutexDel(lsm_mutex *pMutex)  {
  NoopMutex *p = (NoopMutex *)pMutex;
  assert( p->bStatic==0 && p->pEnv );
  lsmFree(p->pEnv, p);
}
static void lsmWin32OsMutexEnter(lsm_mutex *pMutex){
  NoopMutex *p = (NoopMutex *)pMutex;
  assert( p->bHeld==0 );
  p->bHeld = 1;
}
static int lsmWin32OsMutexTry(lsm_mutex *pMutex){
  NoopMutex *p = (NoopMutex *)pMutex;
  assert( p->bHeld==0 );
  p->bHeld = 1;
  return 0;
}
static void lsmWin32OsMutexLeave(lsm_mutex *pMutex){
  NoopMutex *p = (NoopMutex *)pMutex;
  assert( p->bHeld==1 );
  p->bHeld = 0;
}
#ifdef LSM_DEBUG
static int lsmWin32OsMutexHeld(lsm_mutex *pMutex){
  NoopMutex *p = (NoopMutex *)pMutex;
  return p ? p->bHeld : 1;
}
static int lsmWin32OsMutexNotHeld(lsm_mutex *pMutex){
  NoopMutex *p = (NoopMutex *)pMutex;
  return p ? !p->bHeld : 1;
}
#endif
/***************************************************************************/
#endif /* else LSM_MUTEX_NONE */

/* Without LSM_DEBUG, the MutexHeld tests are never called */
#ifndef LSM_DEBUG
# define lsmWin32OsMutexHeld    0
# define lsmWin32OsMutexNotHeld 0
#endif

lsm_env *lsm_default_env(void){
  static lsm_env win32_env = {
    sizeof(lsm_env),         /* nByte */
    1,                       /* iVersion */
    /***** file i/o ******************/
    0,                       /* pVfsCtx */
    lsmWin32OsFullpath,      /* xFullpath */
    lsmWin32OsOpen,          /* xOpen */
    lsmWin32OsRead,          /* xRead */
    lsmWin32OsWrite,         /* xWrite */
    lsmWin32OsTruncate,      /* xTruncate */
    lsmWin32OsSync,          /* xSync */
    lsmWin32OsSectorSize,    /* xSectorSize */
    lsmWin32OsRemap,         /* xRemap */
    lsmWin32OsFileid,        /* xFileid */
    lsmWin32OsClose,         /* xClose */
    lsmWin32OsUnlink,        /* xUnlink */
    lsmWin32OsLock,          /* xLock */
    lsmWin32OsTestLock,      /* xTestLock */
    lsmWin32OsShmMap,        /* xShmMap */
    lsmWin32OsShmBarrier,    /* xShmBarrier */
    lsmWin32OsShmUnmap,      /* xShmUnmap */
    /***** memory allocation *********/
    0,                       /* pMemCtx */
    lsmWin32OsMalloc,        /* xMalloc */
    lsmWin32OsRealloc,       /* xRealloc */
    lsmWin32OsFree,          /* xFree */
    lsmWin32OsMSize,         /* xSize */
    /***** mutexes *********************/
    0,                       /* pMutexCtx */
    lsmWin32OsMutexStatic,   /* xMutexStatic */
    lsmWin32OsMutexNew,      /* xMutexNew */
    lsmWin32OsMutexDel,      /* xMutexDel */
    lsmWin32OsMutexEnter,    /* xMutexEnter */
    lsmWin32OsMutexTry,      /* xMutexTry */
    lsmWin32OsMutexLeave,    /* xMutexLeave */
    lsmWin32OsMutexHeld,     /* xMutexHeld */
    lsmWin32OsMutexNotHeld,  /* xMutexNotHeld */
    /***** other *********************/
    lsmWin32OsSleep,         /* xSleep */
  };
  return &win32_env;
}

#endif
