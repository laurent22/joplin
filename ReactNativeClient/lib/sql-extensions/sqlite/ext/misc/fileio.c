/*
** 2014-06-13
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
** This SQLite extension implements SQL functions readfile() and
** writefile(), and eponymous virtual type "fsdir".
**
** WRITEFILE(FILE, DATA [, MODE [, MTIME]]):
**
**   If neither of the optional arguments is present, then this UDF
**   function writes blob DATA to file FILE. If successful, the number
**   of bytes written is returned. If an error occurs, NULL is returned.
**
**   If the first option argument - MODE - is present, then it must
**   be passed an integer value that corresponds to a POSIX mode
**   value (file type + permissions, as returned in the stat.st_mode
**   field by the stat() system call). Three types of files may
**   be written/created:
**
**     regular files:  (mode & 0170000)==0100000
**     symbolic links: (mode & 0170000)==0120000
**     directories:    (mode & 0170000)==0040000
**
**   For a directory, the DATA is ignored. For a symbolic link, it is
**   interpreted as text and used as the target of the link. For a
**   regular file, it is interpreted as a blob and written into the
**   named file. Regardless of the type of file, its permissions are
**   set to (mode & 0777) before returning.
**
**   If the optional MTIME argument is present, then it is interpreted
**   as an integer - the number of seconds since the unix epoch. The
**   modification-time of the target file is set to this value before
**   returning.
**
**   If three or more arguments are passed to this function and an
**   error is encountered, an exception is raised.
**
** READFILE(FILE):
**
**   Read and return the contents of file FILE (type blob) from disk.
**
** FSDIR:
**
**   Used as follows:
**
**     SELECT * FROM fsdir($path [, $dir]);
**
**   Parameter $path is an absolute or relative pathname. If the file that it
**   refers to does not exist, it is an error. If the path refers to a regular
**   file or symbolic link, it returns a single row. Or, if the path refers
**   to a directory, it returns one row for the directory, and one row for each
**   file within the hierarchy rooted at $path.
**
**   Each row has the following columns:
**
**     name:  Path to file or directory (text value).
**     mode:  Value of stat.st_mode for directory entry (an integer).
**     mtime: Value of stat.st_mtime for directory entry (an integer).
**     data:  For a regular file, a blob containing the file data. For a
**            symlink, a text value containing the text of the link. For a
**            directory, NULL.
**
**   If a non-NULL value is specified for the optional $dir parameter and
**   $path is a relative path, then $path is interpreted relative to $dir. 
**   And the paths returned in the "name" column of the table are also 
**   relative to directory $dir.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <stdio.h>
#include <string.h>
#include <assert.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#if !defined(_WIN32) && !defined(WIN32)
#  include <unistd.h>
#  include <dirent.h>
#  include <utime.h>
#  include <sys/time.h>
#else
#  include "windows.h"
#  include <io.h>
#  include <direct.h>
#  include "test_windirent.h"
#  define dirent DIRENT
#  ifndef chmod
#    define chmod _chmod
#  endif
#  ifndef stat
#    define stat _stat
#  endif
#  define mkdir(path,mode) _mkdir(path)
#  define lstat(path,buf) stat(path,buf)
#endif
#include <time.h>
#include <errno.h>


/*
** Structure of the fsdir() table-valued function
*/
                 /*    0    1    2     3    4           5             */
#define FSDIR_SCHEMA "(name,mode,mtime,data,path HIDDEN,dir HIDDEN)"
#define FSDIR_COLUMN_NAME     0     /* Name of the file */
#define FSDIR_COLUMN_MODE     1     /* Access mode */
#define FSDIR_COLUMN_MTIME    2     /* Last modification time */
#define FSDIR_COLUMN_DATA     3     /* File content */
#define FSDIR_COLUMN_PATH     4     /* Path to top of search */
#define FSDIR_COLUMN_DIR      5     /* Path is relative to this directory */


/*
** Set the result stored by context ctx to a blob containing the 
** contents of file zName.  Or, leave the result unchanged (NULL)
** if the file does not exist or is unreadable.
**
** If the file exceeds the SQLite blob size limit, through an
** SQLITE_TOOBIG error.
**
** Throw an SQLITE_IOERR if there are difficulties pulling the file
** off of disk.
*/
static void readFileContents(sqlite3_context *ctx, const char *zName){
  FILE *in;
  sqlite3_int64 nIn;
  void *pBuf;
  sqlite3 *db;
  int mxBlob;

  in = fopen(zName, "rb");
  if( in==0 ){
    /* File does not exist or is unreadable. Leave the result set to NULL. */
    return;
  }
  fseek(in, 0, SEEK_END);
  nIn = ftell(in);
  rewind(in);
  db = sqlite3_context_db_handle(ctx);
  mxBlob = sqlite3_limit(db, SQLITE_LIMIT_LENGTH, -1);
  if( nIn>mxBlob ){
    sqlite3_result_error_code(ctx, SQLITE_TOOBIG);
    fclose(in);
    return;
  }
  pBuf = sqlite3_malloc64( nIn ? nIn : 1 );
  if( pBuf==0 ){
    sqlite3_result_error_nomem(ctx);
    fclose(in);
    return;
  }
  if( nIn==(sqlite3_int64)fread(pBuf, 1, (size_t)nIn, in) ){
    sqlite3_result_blob64(ctx, pBuf, nIn, sqlite3_free);
  }else{
    sqlite3_result_error_code(ctx, SQLITE_IOERR);
    sqlite3_free(pBuf);
  }
  fclose(in);
}

/*
** Implementation of the "readfile(X)" SQL function.  The entire content
** of the file named X is read and returned as a BLOB.  NULL is returned
** if the file does not exist or is unreadable.
*/
static void readfileFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zName;
  (void)(argc);  /* Unused parameter */
  zName = (const char*)sqlite3_value_text(argv[0]);
  if( zName==0 ) return;
  readFileContents(context, zName);
}

/*
** Set the error message contained in context ctx to the results of
** vprintf(zFmt, ...).
*/
static void ctxErrorMsg(sqlite3_context *ctx, const char *zFmt, ...){
  char *zMsg = 0;
  va_list ap;
  va_start(ap, zFmt);
  zMsg = sqlite3_vmprintf(zFmt, ap);
  sqlite3_result_error(ctx, zMsg, -1);
  sqlite3_free(zMsg);
  va_end(ap);
}

#if defined(_WIN32)
/*
** This function is designed to convert a Win32 FILETIME structure into the
** number of seconds since the Unix Epoch (1970-01-01 00:00:00 UTC).
*/
static sqlite3_uint64 fileTimeToUnixTime(
  LPFILETIME pFileTime
){
  SYSTEMTIME epochSystemTime;
  ULARGE_INTEGER epochIntervals;
  FILETIME epochFileTime;
  ULARGE_INTEGER fileIntervals;

  memset(&epochSystemTime, 0, sizeof(SYSTEMTIME));
  epochSystemTime.wYear = 1970;
  epochSystemTime.wMonth = 1;
  epochSystemTime.wDay = 1;
  SystemTimeToFileTime(&epochSystemTime, &epochFileTime);
  epochIntervals.LowPart = epochFileTime.dwLowDateTime;
  epochIntervals.HighPart = epochFileTime.dwHighDateTime;

  fileIntervals.LowPart = pFileTime->dwLowDateTime;
  fileIntervals.HighPart = pFileTime->dwHighDateTime;

  return (fileIntervals.QuadPart - epochIntervals.QuadPart) / 10000000;
}

/*
** This function attempts to normalize the time values found in the stat()
** buffer to UTC.  This is necessary on Win32, where the runtime library
** appears to return these values as local times.
*/
static void statTimesToUtc(
  const char *zPath,
  struct stat *pStatBuf
){
  HANDLE hFindFile;
  WIN32_FIND_DATAW fd;
  LPWSTR zUnicodeName;
  extern LPWSTR sqlite3_win32_utf8_to_unicode(const char*);
  zUnicodeName = sqlite3_win32_utf8_to_unicode(zPath);
  if( zUnicodeName ){
    memset(&fd, 0, sizeof(WIN32_FIND_DATAW));
    hFindFile = FindFirstFileW(zUnicodeName, &fd);
    if( hFindFile!=NULL ){
      pStatBuf->st_ctime = (time_t)fileTimeToUnixTime(&fd.ftCreationTime);
      pStatBuf->st_atime = (time_t)fileTimeToUnixTime(&fd.ftLastAccessTime);
      pStatBuf->st_mtime = (time_t)fileTimeToUnixTime(&fd.ftLastWriteTime);
      FindClose(hFindFile);
    }
    sqlite3_free(zUnicodeName);
  }
}
#endif

/*
** This function is used in place of stat().  On Windows, special handling
** is required in order for the included time to be returned as UTC.  On all
** other systems, this function simply calls stat().
*/
static int fileStat(
  const char *zPath,
  struct stat *pStatBuf
){
#if defined(_WIN32)
  int rc = stat(zPath, pStatBuf);
  if( rc==0 ) statTimesToUtc(zPath, pStatBuf);
  return rc;
#else
  return stat(zPath, pStatBuf);
#endif
}

/*
** This function is used in place of lstat().  On Windows, special handling
** is required in order for the included time to be returned as UTC.  On all
** other systems, this function simply calls lstat().
*/
static int fileLinkStat(
  const char *zPath,
  struct stat *pStatBuf
){
#if defined(_WIN32)
  int rc = lstat(zPath, pStatBuf);
  if( rc==0 ) statTimesToUtc(zPath, pStatBuf);
  return rc;
#else
  return lstat(zPath, pStatBuf);
#endif
}

/*
** Argument zFile is the name of a file that will be created and/or written
** by SQL function writefile(). This function ensures that the directory
** zFile will be written to exists, creating it if required. The permissions
** for any path components created by this function are set in accordance
** with the current umask.
**
** If an OOM condition is encountered, SQLITE_NOMEM is returned. Otherwise,
** SQLITE_OK is returned if the directory is successfully created, or
** SQLITE_ERROR otherwise.
*/
static int makeDirectory(
  const char *zFile
){
  char *zCopy = sqlite3_mprintf("%s", zFile);
  int rc = SQLITE_OK;

  if( zCopy==0 ){
    rc = SQLITE_NOMEM;
  }else{
    int nCopy = (int)strlen(zCopy);
    int i = 1;

    while( rc==SQLITE_OK ){
      struct stat sStat;
      int rc2;

      for(; zCopy[i]!='/' && i<nCopy; i++);
      if( i==nCopy ) break;
      zCopy[i] = '\0';

      rc2 = fileStat(zCopy, &sStat);
      if( rc2!=0 ){
        if( mkdir(zCopy, 0777) ) rc = SQLITE_ERROR;
      }else{
        if( !S_ISDIR(sStat.st_mode) ) rc = SQLITE_ERROR;
      }
      zCopy[i] = '/';
      i++;
    }

    sqlite3_free(zCopy);
  }

  return rc;
}

/*
** This function does the work for the writefile() UDF. Refer to 
** header comments at the top of this file for details.
*/
static int writeFile(
  sqlite3_context *pCtx,          /* Context to return bytes written in */
  const char *zFile,              /* File to write */
  sqlite3_value *pData,           /* Data to write */
  mode_t mode,                    /* MODE parameter passed to writefile() */
  sqlite3_int64 mtime             /* MTIME parameter (or -1 to not set time) */
){
#if !defined(_WIN32) && !defined(WIN32)
  if( S_ISLNK(mode) ){
    const char *zTo = (const char*)sqlite3_value_text(pData);
    if( symlink(zTo, zFile)<0 ) return 1;
  }else
#endif
  {
    if( S_ISDIR(mode) ){
      if( mkdir(zFile, mode) ){
        /* The mkdir() call to create the directory failed. This might not
        ** be an error though - if there is already a directory at the same
        ** path and either the permissions already match or can be changed
        ** to do so using chmod(), it is not an error.  */
        struct stat sStat;
        if( errno!=EEXIST
         || 0!=fileStat(zFile, &sStat)
         || !S_ISDIR(sStat.st_mode)
         || ((sStat.st_mode&0777)!=(mode&0777) && 0!=chmod(zFile, mode&0777))
        ){
          return 1;
        }
      }
    }else{
      sqlite3_int64 nWrite = 0;
      const char *z;
      int rc = 0;
      FILE *out = fopen(zFile, "wb");
      if( out==0 ) return 1;
      z = (const char*)sqlite3_value_blob(pData);
      if( z ){
        sqlite3_int64 n = fwrite(z, 1, sqlite3_value_bytes(pData), out);
        nWrite = sqlite3_value_bytes(pData);
        if( nWrite!=n ){
          rc = 1;
        }
      }
      fclose(out);
      if( rc==0 && mode && chmod(zFile, mode & 0777) ){
        rc = 1;
      }
      if( rc ) return 2;
      sqlite3_result_int64(pCtx, nWrite);
    }
  }

  if( mtime>=0 ){
#if defined(_WIN32)
#if !SQLITE_OS_WINRT
    /* Windows */
    FILETIME lastAccess;
    FILETIME lastWrite;
    SYSTEMTIME currentTime;
    LONGLONG intervals;
    HANDLE hFile;
    LPWSTR zUnicodeName;
    extern LPWSTR sqlite3_win32_utf8_to_unicode(const char*);

    GetSystemTime(&currentTime);
    SystemTimeToFileTime(&currentTime, &lastAccess);
    intervals = Int32x32To64(mtime, 10000000) + 116444736000000000;
    lastWrite.dwLowDateTime = (DWORD)intervals;
    lastWrite.dwHighDateTime = intervals >> 32;
    zUnicodeName = sqlite3_win32_utf8_to_unicode(zFile);
    if( zUnicodeName==0 ){
      return 1;
    }
    hFile = CreateFileW(
      zUnicodeName, FILE_WRITE_ATTRIBUTES, 0, NULL, OPEN_EXISTING,
      FILE_FLAG_BACKUP_SEMANTICS, NULL
    );
    sqlite3_free(zUnicodeName);
    if( hFile!=INVALID_HANDLE_VALUE ){
      BOOL bResult = SetFileTime(hFile, NULL, &lastAccess, &lastWrite);
      CloseHandle(hFile);
      return !bResult;
    }else{
      return 1;
    }
#endif
#elif defined(AT_FDCWD) && 0 /* utimensat() is not universally available */
    /* Recent unix */
    struct timespec times[2];
    times[0].tv_nsec = times[1].tv_nsec = 0;
    times[0].tv_sec = time(0);
    times[1].tv_sec = mtime;
    if( utimensat(AT_FDCWD, zFile, times, AT_SYMLINK_NOFOLLOW) ){
      return 1;
    }
#else
    /* Legacy unix */
    struct timeval times[2];
    times[0].tv_usec = times[1].tv_usec = 0;
    times[0].tv_sec = time(0);
    times[1].tv_sec = mtime;
    if( utimes(zFile, times) ){
      return 1;
    }
#endif
  }

  return 0;
}

/*
** Implementation of the "writefile(W,X[,Y[,Z]]])" SQL function.  
** Refer to header comments at the top of this file for details.
*/
static void writefileFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zFile;
  mode_t mode = 0;
  int res;
  sqlite3_int64 mtime = -1;

  if( argc<2 || argc>4 ){
    sqlite3_result_error(context, 
        "wrong number of arguments to function writefile()", -1
    );
    return;
  }

  zFile = (const char*)sqlite3_value_text(argv[0]);
  if( zFile==0 ) return;
  if( argc>=3 ){
    mode = (mode_t)sqlite3_value_int(argv[2]);
  }
  if( argc==4 ){
    mtime = sqlite3_value_int64(argv[3]);
  }

  res = writeFile(context, zFile, argv[1], mode, mtime);
  if( res==1 && errno==ENOENT ){
    if( makeDirectory(zFile)==SQLITE_OK ){
      res = writeFile(context, zFile, argv[1], mode, mtime);
    }
  }

  if( argc>2 && res!=0 ){
    if( S_ISLNK(mode) ){
      ctxErrorMsg(context, "failed to create symlink: %s", zFile);
    }else if( S_ISDIR(mode) ){
      ctxErrorMsg(context, "failed to create directory: %s", zFile);
    }else{
      ctxErrorMsg(context, "failed to write file: %s", zFile);
    }
  }
}

/*
** SQL function:   lsmode(MODE)
**
** Given a numberic st_mode from stat(), convert it into a human-readable
** text string in the style of "ls -l".
*/
static void lsModeFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  int i;
  int iMode = sqlite3_value_int(argv[0]);
  char z[16];
  (void)argc;
  if( S_ISLNK(iMode) ){
    z[0] = 'l';
  }else if( S_ISREG(iMode) ){
    z[0] = '-';
  }else if( S_ISDIR(iMode) ){
    z[0] = 'd';
  }else{
    z[0] = '?';
  }
  for(i=0; i<3; i++){
    int m = (iMode >> ((2-i)*3));
    char *a = &z[1 + i*3];
    a[0] = (m & 0x4) ? 'r' : '-';
    a[1] = (m & 0x2) ? 'w' : '-';
    a[2] = (m & 0x1) ? 'x' : '-';
  }
  z[10] = '\0';
  sqlite3_result_text(context, z, -1, SQLITE_TRANSIENT);
}

#ifndef SQLITE_OMIT_VIRTUALTABLE

/* 
** Cursor type for recursively iterating through a directory structure.
*/
typedef struct fsdir_cursor fsdir_cursor;
typedef struct FsdirLevel FsdirLevel;

struct FsdirLevel {
  DIR *pDir;                 /* From opendir() */
  char *zDir;                /* Name of directory (nul-terminated) */
};

struct fsdir_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */

  int nLvl;                  /* Number of entries in aLvl[] array */
  int iLvl;                  /* Index of current entry */
  FsdirLevel *aLvl;          /* Hierarchy of directories being traversed */

  const char *zBase;
  int nBase;

  struct stat sStat;         /* Current lstat() results */
  char *zPath;               /* Path to current entry */
  sqlite3_int64 iRowid;      /* Current rowid */
};

typedef struct fsdir_tab fsdir_tab;
struct fsdir_tab {
  sqlite3_vtab base;         /* Base class - must be first */
};

/*
** Construct a new fsdir virtual table object.
*/
static int fsdirConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  fsdir_tab *pNew = 0;
  int rc;
  (void)pAux;
  (void)argc;
  (void)argv;
  (void)pzErr;
  rc = sqlite3_declare_vtab(db, "CREATE TABLE x" FSDIR_SCHEMA);
  if( rc==SQLITE_OK ){
    pNew = (fsdir_tab*)sqlite3_malloc( sizeof(*pNew) );
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, sizeof(*pNew));
    sqlite3_vtab_config(db, SQLITE_VTAB_DIRECTONLY);
  }
  *ppVtab = (sqlite3_vtab*)pNew;
  return rc;
}

/*
** This method is the destructor for fsdir vtab objects.
*/
static int fsdirDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** Constructor for a new fsdir_cursor object.
*/
static int fsdirOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  fsdir_cursor *pCur;
  (void)p;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->iLvl = -1;
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Reset a cursor back to the state it was in when first returned
** by fsdirOpen().
*/
static void fsdirResetCursor(fsdir_cursor *pCur){
  int i;
  for(i=0; i<=pCur->iLvl; i++){
    FsdirLevel *pLvl = &pCur->aLvl[i];
    if( pLvl->pDir ) closedir(pLvl->pDir);
    sqlite3_free(pLvl->zDir);
  }
  sqlite3_free(pCur->zPath);
  sqlite3_free(pCur->aLvl);
  pCur->aLvl = 0;
  pCur->zPath = 0;
  pCur->zBase = 0;
  pCur->nBase = 0;
  pCur->nLvl = 0;
  pCur->iLvl = -1;
  pCur->iRowid = 1;
}

/*
** Destructor for an fsdir_cursor.
*/
static int fsdirClose(sqlite3_vtab_cursor *cur){
  fsdir_cursor *pCur = (fsdir_cursor*)cur;

  fsdirResetCursor(pCur);
  sqlite3_free(pCur);
  return SQLITE_OK;
}

/*
** Set the error message for the virtual table associated with cursor
** pCur to the results of vprintf(zFmt, ...).
*/
static void fsdirSetErrmsg(fsdir_cursor *pCur, const char *zFmt, ...){
  va_list ap;
  va_start(ap, zFmt);
  pCur->base.pVtab->zErrMsg = sqlite3_vmprintf(zFmt, ap);
  va_end(ap);
}


/*
** Advance an fsdir_cursor to its next row of output.
*/
static int fsdirNext(sqlite3_vtab_cursor *cur){
  fsdir_cursor *pCur = (fsdir_cursor*)cur;
  mode_t m = pCur->sStat.st_mode;

  pCur->iRowid++;
  if( S_ISDIR(m) ){
    /* Descend into this directory */
    int iNew = pCur->iLvl + 1;
    FsdirLevel *pLvl;
    if( iNew>=pCur->nLvl ){
      int nNew = iNew+1;
      sqlite3_int64 nByte = nNew*sizeof(FsdirLevel);
      FsdirLevel *aNew = (FsdirLevel*)sqlite3_realloc64(pCur->aLvl, nByte);
      if( aNew==0 ) return SQLITE_NOMEM;
      memset(&aNew[pCur->nLvl], 0, sizeof(FsdirLevel)*(nNew-pCur->nLvl));
      pCur->aLvl = aNew;
      pCur->nLvl = nNew;
    }
    pCur->iLvl = iNew;
    pLvl = &pCur->aLvl[iNew];
    
    pLvl->zDir = pCur->zPath;
    pCur->zPath = 0;
    pLvl->pDir = opendir(pLvl->zDir);
    if( pLvl->pDir==0 ){
      fsdirSetErrmsg(pCur, "cannot read directory: %s", pCur->zPath);
      return SQLITE_ERROR;
    }
  }

  while( pCur->iLvl>=0 ){
    FsdirLevel *pLvl = &pCur->aLvl[pCur->iLvl];
    struct dirent *pEntry = readdir(pLvl->pDir);
    if( pEntry ){
      if( pEntry->d_name[0]=='.' ){
       if( pEntry->d_name[1]=='.' && pEntry->d_name[2]=='\0' ) continue;
       if( pEntry->d_name[1]=='\0' ) continue;
      }
      sqlite3_free(pCur->zPath);
      pCur->zPath = sqlite3_mprintf("%s/%s", pLvl->zDir, pEntry->d_name);
      if( pCur->zPath==0 ) return SQLITE_NOMEM;
      if( fileLinkStat(pCur->zPath, &pCur->sStat) ){
        fsdirSetErrmsg(pCur, "cannot stat file: %s", pCur->zPath);
        return SQLITE_ERROR;
      }
      return SQLITE_OK;
    }
    closedir(pLvl->pDir);
    sqlite3_free(pLvl->zDir);
    pLvl->pDir = 0;
    pLvl->zDir = 0;
    pCur->iLvl--;
  }

  /* EOF */
  sqlite3_free(pCur->zPath);
  pCur->zPath = 0;
  return SQLITE_OK;
}

/*
** Return values of columns for the row at which the series_cursor
** is currently pointing.
*/
static int fsdirColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  fsdir_cursor *pCur = (fsdir_cursor*)cur;
  switch( i ){
    case FSDIR_COLUMN_NAME: {
      sqlite3_result_text(ctx, &pCur->zPath[pCur->nBase], -1, SQLITE_TRANSIENT);
      break;
    }

    case FSDIR_COLUMN_MODE:
      sqlite3_result_int64(ctx, pCur->sStat.st_mode);
      break;

    case FSDIR_COLUMN_MTIME:
      sqlite3_result_int64(ctx, pCur->sStat.st_mtime);
      break;

    case FSDIR_COLUMN_DATA: {
      mode_t m = pCur->sStat.st_mode;
      if( S_ISDIR(m) ){
        sqlite3_result_null(ctx);
#if !defined(_WIN32) && !defined(WIN32)
      }else if( S_ISLNK(m) ){
        char aStatic[64];
        char *aBuf = aStatic;
        sqlite3_int64 nBuf = 64;
        int n;

        while( 1 ){
          n = readlink(pCur->zPath, aBuf, nBuf);
          if( n<nBuf ) break;
          if( aBuf!=aStatic ) sqlite3_free(aBuf);
          nBuf = nBuf*2;
          aBuf = sqlite3_malloc64(nBuf);
          if( aBuf==0 ){
            sqlite3_result_error_nomem(ctx);
            return SQLITE_NOMEM;
          }
        }

        sqlite3_result_text(ctx, aBuf, n, SQLITE_TRANSIENT);
        if( aBuf!=aStatic ) sqlite3_free(aBuf);
#endif
      }else{
        readFileContents(ctx, pCur->zPath);
      }
    }
    case FSDIR_COLUMN_PATH:
    default: {
      /* The FSDIR_COLUMN_PATH and FSDIR_COLUMN_DIR are input parameters.
      ** always return their values as NULL */
      break;
    }
  }
  return SQLITE_OK;
}

/*
** Return the rowid for the current row. In this implementation, the
** first row returned is assigned rowid value 1, and each subsequent
** row a value 1 more than that of the previous.
*/
static int fsdirRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  fsdir_cursor *pCur = (fsdir_cursor*)cur;
  *pRowid = pCur->iRowid;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int fsdirEof(sqlite3_vtab_cursor *cur){
  fsdir_cursor *pCur = (fsdir_cursor*)cur;
  return (pCur->zPath==0);
}

/*
** xFilter callback.
**
** idxNum==1   PATH parameter only
** idxNum==2   Both PATH and DIR supplied
*/
static int fsdirFilter(
  sqlite3_vtab_cursor *cur, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  const char *zDir = 0;
  fsdir_cursor *pCur = (fsdir_cursor*)cur;
  (void)idxStr;
  fsdirResetCursor(pCur);

  if( idxNum==0 ){
    fsdirSetErrmsg(pCur, "table function fsdir requires an argument");
    return SQLITE_ERROR;
  }

  assert( argc==idxNum && (argc==1 || argc==2) );
  zDir = (const char*)sqlite3_value_text(argv[0]);
  if( zDir==0 ){
    fsdirSetErrmsg(pCur, "table function fsdir requires a non-NULL argument");
    return SQLITE_ERROR;
  }
  if( argc==2 ){
    pCur->zBase = (const char*)sqlite3_value_text(argv[1]);
  }
  if( pCur->zBase ){
    pCur->nBase = (int)strlen(pCur->zBase)+1;
    pCur->zPath = sqlite3_mprintf("%s/%s", pCur->zBase, zDir);
  }else{
    pCur->zPath = sqlite3_mprintf("%s", zDir);
  }

  if( pCur->zPath==0 ){
    return SQLITE_NOMEM;
  }
  if( fileLinkStat(pCur->zPath, &pCur->sStat) ){
    fsdirSetErrmsg(pCur, "cannot stat file: %s", pCur->zPath);
    return SQLITE_ERROR;
  }

  return SQLITE_OK;
}

/*
** SQLite will invoke this method one or more times while planning a query
** that uses the generate_series virtual table.  This routine needs to create
** a query plan for each invocation and compute an estimated cost for that
** plan.
**
** In this implementation idxNum is used to represent the
** query plan.  idxStr is unused.
**
** The query plan is represented by values of idxNum:
**
**  (1)  The path value is supplied by argv[0]
**  (2)  Path is in argv[0] and dir is in argv[1]
*/
static int fsdirBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int i;                 /* Loop over constraints */
  int idxPath = -1;      /* Index in pIdxInfo->aConstraint of PATH= */
  int idxDir = -1;       /* Index in pIdxInfo->aConstraint of DIR= */
  int seenPath = 0;      /* True if an unusable PATH= constraint is seen */
  int seenDir = 0;       /* True if an unusable DIR= constraint is seen */
  const struct sqlite3_index_constraint *pConstraint;

  (void)tab;
  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    if( pConstraint->op!=SQLITE_INDEX_CONSTRAINT_EQ ) continue;
    switch( pConstraint->iColumn ){
      case FSDIR_COLUMN_PATH: {
        if( pConstraint->usable ){
          idxPath = i;
          seenPath = 0;
        }else if( idxPath<0 ){
          seenPath = 1;
        }
        break;
      }
      case FSDIR_COLUMN_DIR: {
        if( pConstraint->usable ){
          idxDir = i;
          seenDir = 0;
        }else if( idxDir<0 ){
          seenDir = 1;
        }
        break;
      }
    } 
  }
  if( seenPath || seenDir ){
    /* If input parameters are unusable, disallow this plan */
    return SQLITE_CONSTRAINT;
  }

  if( idxPath<0 ){
    pIdxInfo->idxNum = 0;
    /* The pIdxInfo->estimatedCost should have been initialized to a huge
    ** number.  Leave it unchanged. */
    pIdxInfo->estimatedRows = 0x7fffffff;
  }else{
    pIdxInfo->aConstraintUsage[idxPath].omit = 1;
    pIdxInfo->aConstraintUsage[idxPath].argvIndex = 1;
    if( idxDir>=0 ){
      pIdxInfo->aConstraintUsage[idxDir].omit = 1;
      pIdxInfo->aConstraintUsage[idxDir].argvIndex = 2;
      pIdxInfo->idxNum = 2;
      pIdxInfo->estimatedCost = 10.0;
    }else{
      pIdxInfo->idxNum = 1;
      pIdxInfo->estimatedCost = 100.0;
    }
  }

  return SQLITE_OK;
}

/*
** Register the "fsdir" virtual table.
*/
static int fsdirRegister(sqlite3 *db){
  static sqlite3_module fsdirModule = {
    0,                         /* iVersion */
    0,                         /* xCreate */
    fsdirConnect,              /* xConnect */
    fsdirBestIndex,            /* xBestIndex */
    fsdirDisconnect,           /* xDisconnect */
    0,                         /* xDestroy */
    fsdirOpen,                 /* xOpen - open a cursor */
    fsdirClose,                /* xClose - close a cursor */
    fsdirFilter,               /* xFilter - configure scan constraints */
    fsdirNext,                 /* xNext - advance a cursor */
    fsdirEof,                  /* xEof - check for end of scan */
    fsdirColumn,               /* xColumn - read data */
    fsdirRowid,                /* xRowid - read data */
    0,                         /* xUpdate */
    0,                         /* xBegin */
    0,                         /* xSync */
    0,                         /* xCommit */
    0,                         /* xRollback */
    0,                         /* xFindMethod */
    0,                         /* xRename */
    0,                         /* xSavepoint */
    0,                         /* xRelease */
    0,                         /* xRollbackTo */
    0,                         /* xShadowName */
  };

  int rc = sqlite3_create_module(db, "fsdir", &fsdirModule, 0);
  return rc;
}
#else         /* SQLITE_OMIT_VIRTUALTABLE */
# define fsdirRegister(x) SQLITE_OK
#endif

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_fileio_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "readfile", 1, 
                               SQLITE_UTF8|SQLITE_DIRECTONLY, 0,
                               readfileFunc, 0, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "writefile", -1,
                                 SQLITE_UTF8|SQLITE_DIRECTONLY, 0,
                                 writefileFunc, 0, 0);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "lsmode", 1, SQLITE_UTF8, 0,
                                 lsModeFunc, 0, 0);
  }
  if( rc==SQLITE_OK ){
    rc = fsdirRegister(db);
  }
  return rc;
}
