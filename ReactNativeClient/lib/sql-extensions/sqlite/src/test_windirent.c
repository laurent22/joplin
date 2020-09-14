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
** This file contains code to implement most of the opendir() family of
** POSIX functions on Win32 using the MSVCRT.
*/

#if defined(_WIN32) && defined(_MSC_VER)
#include "test_windirent.h"

/*
** Implementation of the POSIX getenv() function using the Win32 API.
** This function is not thread-safe.
*/
const char *windirent_getenv(
  const char *name
){
  static char value[32768]; /* Maximum length, per MSDN */
  DWORD dwSize = sizeof(value) / sizeof(char); /* Size in chars */
  DWORD dwRet; /* Value returned by GetEnvironmentVariableA() */

  memset(value, 0, sizeof(value));
  dwRet = GetEnvironmentVariableA(name, value, dwSize);
  if( dwRet==0 || dwRet>dwSize ){
    /*
    ** The function call to GetEnvironmentVariableA() failed -OR-
    ** the buffer is not large enough.  Either way, return NULL.
    */
    return 0;
  }else{
    /*
    ** The function call to GetEnvironmentVariableA() succeeded
    ** -AND- the buffer contains the entire value.
    */
    return value;
  }
}

/*
** Implementation of the POSIX opendir() function using the MSVCRT.
*/
LPDIR opendir(
  const char *dirname
){
  struct _finddata_t data;
  LPDIR dirp = (LPDIR)sqlite3_malloc(sizeof(DIR));
  SIZE_T namesize = sizeof(data.name) / sizeof(data.name[0]);

  if( dirp==NULL ) return NULL;
  memset(dirp, 0, sizeof(DIR));

  /* TODO: Remove this if Unix-style root paths are not used. */
  if( sqlite3_stricmp(dirname, "/")==0 ){
    dirname = windirent_getenv("SystemDrive");
  }

  memset(&data, 0, sizeof(struct _finddata_t));
  _snprintf(data.name, namesize, "%s\\*", dirname);
  dirp->d_handle = _findfirst(data.name, &data);

  if( dirp->d_handle==BAD_INTPTR_T ){
    closedir(dirp);
    return NULL;
  }

  /* TODO: Remove this block to allow hidden and/or system files. */
  if( is_filtered(data) ){
next:

    memset(&data, 0, sizeof(struct _finddata_t));
    if( _findnext(dirp->d_handle, &data)==-1 ){
      closedir(dirp);
      return NULL;
    }

    /* TODO: Remove this block to allow hidden and/or system files. */
    if( is_filtered(data) ) goto next;
  }

  dirp->d_first.d_attributes = data.attrib;
  strncpy(dirp->d_first.d_name, data.name, NAME_MAX);
  dirp->d_first.d_name[NAME_MAX] = '\0';

  return dirp;
}

/*
** Implementation of the POSIX readdir() function using the MSVCRT.
*/
LPDIRENT readdir(
  LPDIR dirp
){
  struct _finddata_t data;

  if( dirp==NULL ) return NULL;

  if( dirp->d_first.d_ino==0 ){
    dirp->d_first.d_ino++;
    dirp->d_next.d_ino++;

    return &dirp->d_first;
  }

next:

  memset(&data, 0, sizeof(struct _finddata_t));
  if( _findnext(dirp->d_handle, &data)==-1 ) return NULL;

  /* TODO: Remove this block to allow hidden and/or system files. */
  if( is_filtered(data) ) goto next;

  dirp->d_next.d_ino++;
  dirp->d_next.d_attributes = data.attrib;
  strncpy(dirp->d_next.d_name, data.name, NAME_MAX);
  dirp->d_next.d_name[NAME_MAX] = '\0';

  return &dirp->d_next;
}

/*
** Implementation of the POSIX readdir_r() function using the MSVCRT.
*/
INT readdir_r(
  LPDIR dirp,
  LPDIRENT entry,
  LPDIRENT *result
){
  struct _finddata_t data;

  if( dirp==NULL ) return EBADF;

  if( dirp->d_first.d_ino==0 ){
    dirp->d_first.d_ino++;
    dirp->d_next.d_ino++;

    entry->d_ino = dirp->d_first.d_ino;
    entry->d_attributes = dirp->d_first.d_attributes;
    strncpy(entry->d_name, dirp->d_first.d_name, NAME_MAX);
    entry->d_name[NAME_MAX] = '\0';

    *result = entry;
    return 0;
  }

next:

  memset(&data, 0, sizeof(struct _finddata_t));
  if( _findnext(dirp->d_handle, &data)==-1 ){
    *result = NULL;
    return ENOENT;
  }

  /* TODO: Remove this block to allow hidden and/or system files. */
  if( is_filtered(data) ) goto next;

  entry->d_ino = (ino_t)-1; /* not available */
  entry->d_attributes = data.attrib;
  strncpy(entry->d_name, data.name, NAME_MAX);
  entry->d_name[NAME_MAX] = '\0';

  *result = entry;
  return 0;
}

/*
** Implementation of the POSIX closedir() function using the MSVCRT.
*/
INT closedir(
  LPDIR dirp
){
  INT result = 0;

  if( dirp==NULL ) return EINVAL;

  if( dirp->d_handle!=NULL_INTPTR_T && dirp->d_handle!=BAD_INTPTR_T ){
    result = _findclose(dirp->d_handle);
  }

  sqlite3_free(dirp);
  return result;
}

#endif /* defined(WIN32) && defined(_MSC_VER) */
