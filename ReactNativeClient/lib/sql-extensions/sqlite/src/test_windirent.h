/*
** 2015 November 30
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file contains declarations for most of the opendir() family of
** POSIX functions on Win32 using the MSVCRT.
*/

#if defined(_WIN32) && defined(_MSC_VER) && !defined(SQLITE_WINDIRENT_H)
#define SQLITE_WINDIRENT_H

/*
** We need several data types from the Windows SDK header.
*/

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include "windows.h"

/*
** We need several support functions from the SQLite core.
*/

#include "sqlite3.h"

/*
** We need several things from the ANSI and MSVCRT headers.
*/

#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <io.h>
#include <limits.h>
#include <sys/types.h>
#include <sys/stat.h>

/*
** We may need several defines that should have been in "sys/stat.h".
*/

#ifndef S_ISREG
#define S_ISREG(mode) (((mode) & S_IFMT) == S_IFREG)
#endif

#ifndef S_ISDIR
#define S_ISDIR(mode) (((mode) & S_IFMT) == S_IFDIR)
#endif

#ifndef S_ISLNK
#define S_ISLNK(mode) (0)
#endif

/*
** We may need to provide the "mode_t" type.
*/

#ifndef MODE_T_DEFINED
  #define MODE_T_DEFINED
  typedef unsigned short mode_t;
#endif

/*
** We may need to provide the "ino_t" type.
*/

#ifndef INO_T_DEFINED
  #define INO_T_DEFINED
  typedef unsigned short ino_t;
#endif

/*
** We need to define "NAME_MAX" if it was not present in "limits.h".
*/

#ifndef NAME_MAX
#  ifdef FILENAME_MAX
#    define NAME_MAX (FILENAME_MAX)
#  else
#    define NAME_MAX (260)
#  endif
#endif

/*
** We need to define "NULL_INTPTR_T" and "BAD_INTPTR_T".
*/

#ifndef NULL_INTPTR_T
#  define NULL_INTPTR_T ((intptr_t)(0))
#endif

#ifndef BAD_INTPTR_T
#  define BAD_INTPTR_T ((intptr_t)(-1))
#endif

/*
** We need to provide the necessary structures and related types.
*/

#ifndef DIRENT_DEFINED
#define DIRENT_DEFINED
typedef struct DIRENT DIRENT;
typedef DIRENT *LPDIRENT;
struct DIRENT {
  ino_t d_ino;               /* Sequence number, do not use. */
  unsigned d_attributes;     /* Win32 file attributes. */
  char d_name[NAME_MAX + 1]; /* Name within the directory. */
};
#endif

#ifndef DIR_DEFINED
#define DIR_DEFINED
typedef struct DIR DIR;
typedef DIR *LPDIR;
struct DIR {
  intptr_t d_handle; /* Value returned by "_findfirst". */
  DIRENT d_first;    /* DIRENT constructed based on "_findfirst". */
  DIRENT d_next;     /* DIRENT constructed based on "_findnext". */
};
#endif

/*
** Provide a macro, for use by the implementation, to determine if a
** particular directory entry should be skipped over when searching for
** the next directory entry that should be returned by the readdir() or
** readdir_r() functions.
*/

#ifndef is_filtered
#  define is_filtered(a) ((((a).attrib)&_A_HIDDEN) || (((a).attrib)&_A_SYSTEM))
#endif

/*
** Provide the function prototype for the POSIX compatiable getenv()
** function.  This function is not thread-safe.
*/

extern const char *windirent_getenv(const char *name);

/*
** Finally, we can provide the function prototypes for the opendir(),
** readdir(), readdir_r(), and closedir() POSIX functions.
*/

extern LPDIR opendir(const char *dirname);
extern LPDIRENT readdir(LPDIR dirp);
extern INT readdir_r(LPDIR dirp, LPDIRENT entry, LPDIRENT *result);
extern INT closedir(LPDIR dirp);

#endif /* defined(WIN32) && defined(_MSC_VER) */
