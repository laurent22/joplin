/*
** 2011 December 1
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
** This file contains the interface definition for the quota a VFS shim.
**
** This particular shim enforces a quota system on files.  One or more
** database files are in a "quota group" that is defined by a GLOB
** pattern.  A quota is set for the combined size of all files in the
** the group.  A quota of zero means "no limit".  If the total size
** of all files in the quota group is greater than the limit, then
** write requests that attempt to enlarge a file fail with SQLITE_FULL.
**
** However, before returning SQLITE_FULL, the write requests invoke
** a callback function that is configurable for each quota group.
** This callback has the opportunity to enlarge the quota.  If the
** callback does enlarge the quota such that the total size of all
** files within the group is less than the new quota, then the write
** continues as if nothing had happened.
*/
#ifndef _QUOTA_H_
#include "sqlite3.h"
#include <stdio.h>
#include <sys/types.h>
#include <sys/stat.h>

/* Make this callable from C++ */
#ifdef __cplusplus
extern "C" {
#endif

/*
** Initialize the quota VFS shim.  Use the VFS named zOrigVfsName
** as the VFS that does the actual work.  Use the default if
** zOrigVfsName==NULL.  
**
** The quota VFS shim is named "quota".  It will become the default
** VFS if makeDefault is non-zero.
**
** THIS ROUTINE IS NOT THREADSAFE.  Call this routine exactly once
** during start-up.
*/
int sqlite3_quota_initialize(const char *zOrigVfsName, int makeDefault);

/*
** Shutdown the quota system.
**
** All SQLite database connections must be closed before calling this
** routine.
**
** THIS ROUTINE IS NOT THREADSAFE.  Call this routine exactly once while
** shutting down in order to free all remaining quota groups.
*/
int sqlite3_quota_shutdown(void);

/*
** Create or destroy a quota group.
**
** The quota group is defined by the zPattern.  When calling this routine
** with a zPattern for a quota group that already exists, this routine
** merely updates the iLimit, xCallback, and pArg values for that quota
** group.  If zPattern is new, then a new quota group is created.
**
** The zPattern is always compared against the full pathname of the file.
** Even if APIs are called with relative pathnames, SQLite converts the
** name to a full pathname before comparing it against zPattern.  zPattern
** is a glob pattern with the following matching rules:
**
**      '*'       Matches any sequence of zero or more characters.
**
**      '?'       Matches exactly one character.
**
**     [...]      Matches one character from the enclosed list of
**                characters.  "]" can be part of the list if it is
**                the first character.  Within the list "X-Y" matches
**                characters X or Y or any character in between the
**                two.  Ex:  "[0-9]" matches any digit.
**
**     [^...]     Matches one character not in the enclosed list.
**
**     /          Matches either / or \.  This allows glob patterns
**                containing / to work on both unix and windows.
**
** Note that, unlike unix shell globbing, the directory separator "/"
** can match a wildcard.  So, for example, the pattern "/abc/xyz/" "*"
** matches any files anywhere in the directory hierarchy beneath
** /abc/xyz.
**
** The glob algorithm works on bytes.  Multi-byte UTF8 characters are
** matched as if each byte were a separate character.
**
** If the iLimit for a quota group is set to zero, then the quota group
** is disabled and will be deleted when the last database connection using
** the quota group is closed.
**
** Calling this routine on a zPattern that does not exist and with a
** zero iLimit is a no-op.
**
** A quota group must exist with a non-zero iLimit prior to opening
** database connections if those connections are to participate in the
** quota group.  Creating a quota group does not affect database connections
** that are already open.
**
** The patterns that define the various quota groups should be distinct.
** If the same filename matches more than one quota group pattern, then
** the behavior of this package is undefined.
*/
int sqlite3_quota_set(
  const char *zPattern,           /* The filename pattern */
  sqlite3_int64 iLimit,           /* New quota to set for this quota group */
  void (*xCallback)(              /* Callback invoked when going over quota */
     const char *zFilename,         /* Name of file whose size increases */
     sqlite3_int64 *piLimit,        /* IN/OUT: The current limit */
     sqlite3_int64 iSize,           /* Total size of all files in the group */
     void *pArg                     /* Client data */
  ),
  void *pArg,                     /* client data passed thru to callback */
  void (*xDestroy)(void*)         /* Optional destructor for pArg */
);

/*
** Bring the named file under quota management, assuming its name matches
** the glob pattern of some quota group.  Or if it is already under
** management, update its size.  If zFilename does not match the glob
** pattern of any quota group, this routine is a no-op.
*/
int sqlite3_quota_file(const char *zFilename);

/*
** The following object serves the same role as FILE in the standard C
** library.  It represents an open connection to a file on disk for I/O.
**
** A single quota_FILE should not be used by two or more threads at the
** same time.  Multiple threads can be using different quota_FILE objects
** simultaneously, but not the same quota_FILE object.
*/
typedef struct quota_FILE quota_FILE;

/*
** Create a new quota_FILE object used to read and/or write to the
** file zFilename.  The zMode parameter is as with standard library zMode.
*/
quota_FILE *sqlite3_quota_fopen(const char *zFilename, const char *zMode);

/*
** Perform I/O against a quota_FILE object.  When doing writes, the
** quota mechanism may result in a short write, in order to prevent
** the sum of sizes of all files from going over quota.
*/
size_t sqlite3_quota_fread(void*, size_t, size_t, quota_FILE*);
size_t sqlite3_quota_fwrite(const void*, size_t, size_t, quota_FILE*);

/*
** Flush all written content held in memory buffers out to disk.
** This is the equivalent of fflush() in the standard library.
**
** If the hardSync parameter is true (non-zero) then this routine
** also forces OS buffers to disk - the equivalent of fsync().
**
** This routine return zero on success and non-zero if something goes
** wrong.
*/
int sqlite3_quota_fflush(quota_FILE*, int hardSync);

/*
** Close a quota_FILE object and free all associated resources.  The
** file remains under quota management.
*/
int sqlite3_quota_fclose(quota_FILE*);

/*
** Move the read/write pointer for a quota_FILE object.  Or tell the
** current location of the read/write pointer.
*/
int sqlite3_quota_fseek(quota_FILE*, long, int);
void sqlite3_quota_rewind(quota_FILE*);
long sqlite3_quota_ftell(quota_FILE*);

/*
** Test the error indicator for the given file.
**
** Return non-zero if the error indicator is set.
*/
int sqlite3_quota_ferror(quota_FILE*);

/*
** Truncate a file previously opened by sqlite3_quota_fopen().  Return
** zero on success and non-zero on any kind of failure.
**
** The newSize argument must be less than or equal to the current file size.
** Any attempt to "truncate" a file to a larger size results in 
** undefined behavior.
*/
int sqlite3_quota_ftruncate(quota_FILE*, sqlite3_int64 newSize);

/*
** Return the last modification time of the opened file, in seconds
** since 1970.
*/
int sqlite3_quota_file_mtime(quota_FILE*, time_t *pTime);

/*
** Return the size of the file as it is known to the quota system.
**
** This size might be different from the true size of the file on
** disk if some outside process has modified the file without using the
** quota mechanism, or if calls to sqlite3_quota_fwrite() have occurred
** which have increased the file size, but those writes have not yet been
** forced to disk using sqlite3_quota_fflush().
**
** Return -1 if the file is not participating in quota management.
*/
sqlite3_int64 sqlite3_quota_file_size(quota_FILE*);

/*
** Return the true size of the file.
**
** The true size should be the same as the size of the file as known
** to the quota system, however the sizes might be different if the
** file has been extended or truncated via some outside process or if
** pending writes have not yet been flushed to disk.
**
** Return -1 if the file does not exist or if the size of the file
** cannot be determined for some reason.
*/
sqlite3_int64 sqlite3_quota_file_truesize(quota_FILE*);

/*
** Determine the amount of data in bytes available for reading
** in the given file.
**
** Return -1 if the amount cannot be determined for some reason.
*/
long sqlite3_quota_file_available(quota_FILE*);

/*
** Delete a file from the disk, if that file is under quota management.
** Adjust quotas accordingly.
**
** If zFilename is the name of a directory that matches one of the
** quota glob patterns, then all files under quota management that
** are contained within that directory are deleted.
**
** A standard SQLite result code is returned (SQLITE_OK, SQLITE_NOMEM, etc.)
** When deleting a directory of files, if the deletion of any one
** file fails (for example due to an I/O error), then this routine
** returns immediately, with the error code, and does not try to 
** delete any of the other files in the specified directory.
**
** All files are removed from quota management and deleted from disk.
** However, no attempt is made to remove empty directories.
**
** This routine is a no-op for files that are not under quota management.
*/
int sqlite3_quota_remove(const char *zFilename);

#ifdef __cplusplus
}  /* end of the 'extern "C"' block */
#endif
#endif /* _QUOTA_H_ */
