/*
** 2007 May 7
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
** This file contains code used for testing the SQLite system.
** None of the code in this file goes into a deliverable build.
** 
** The focus of this file is providing the TCL testing layer
** access to compile-time constants.
*/

#include "sqliteLimit.h"

#include "sqliteInt.h"
#if SQLITE_OS_WIN
#  include "os_win.h"
#endif

#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#endif
#include <stdlib.h>
#include <string.h>

/*
** Macro to stringify the results of the evaluation a pre-processor
** macro. i.e. so that STRINGVALUE(SQLITE_NOMEM) -> "7".
*/
#define STRINGVALUE2(x) #x
#define STRINGVALUE(x) STRINGVALUE2(x)

/*
** This routine sets entries in the global ::sqlite_options() array variable
** according to the compile-time configuration of the database.  Test
** procedures use this to determine when tests should be omitted.
*/
static void set_options(Tcl_Interp *interp){
#if HAVE_MALLOC_USABLE_SIZE
  Tcl_SetVar2(interp, "sqlite_options", "malloc_usable_size", "1",
              TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "malloc_usable_size", "0",
              TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_32BIT_ROWID
  Tcl_SetVar2(interp, "sqlite_options", "rowid32", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "rowid32", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_CASE_SENSITIVE_LIKE
  Tcl_SetVar2(interp, "sqlite_options","casesensitivelike","1",TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options","casesensitivelike","0",TCL_GLOBAL_ONLY);
#endif

#if !SQLITE_OS_WINCE && !SQLITE_OS_WINRT
  Tcl_SetVar2(interp, "sqlite_options", "curdir", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "curdir", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_WIN32_MALLOC
  Tcl_SetVar2(interp, "sqlite_options", "win32malloc", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "win32malloc", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_DEBUG
  Tcl_SetVar2(interp, "sqlite_options", "debug", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "debug", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_DEFAULT_CKPTFULLFSYNC
  Tcl_SetVar2(interp, "sqlite_options", "default_ckptfullfsync", 
              SQLITE_DEFAULT_CKPTFULLFSYNC ? "1" : "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "default_ckptfullfsync", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_DIRECT_OVERFLOW_READ
  Tcl_SetVar2(interp, "sqlite_options", "direct_read", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "direct_read", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_DISABLE_DIRSYNC
  Tcl_SetVar2(interp, "sqlite_options", "dirsync", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "dirsync", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_DISABLE_LFS
  Tcl_SetVar2(interp, "sqlite_options", "lfs", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "lfs", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_DISABLE_PAGECACHE_OVERFLOW_STATS
  Tcl_SetVar2(interp, "sqlite_options", "pagecache_overflow_stats","0",TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "pagecache_overflow_stats","1",TCL_GLOBAL_ONLY);
#endif

#if SQLITE_MAX_MMAP_SIZE>0
  Tcl_SetVar2(interp, "sqlite_options", "mmap", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "mmap", "0", TCL_GLOBAL_ONLY);
#endif

  Tcl_SetVar2(interp, "sqlite_options", "worker_threads", 
      STRINGVALUE(SQLITE_MAX_WORKER_THREADS), TCL_GLOBAL_ONLY
  );

#ifdef SQLITE_MEMDEBUG 
  Tcl_SetVar2(interp, "sqlite_options", "memdebug", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "memdebug", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_8_3_NAMES
  Tcl_SetVar2(interp, "sqlite_options", "8_3_names", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "8_3_names", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_CURSOR_HINTS
  Tcl_SetVar2(interp, "sqlite_options", "cursorhints", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "cursorhints", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_HIDDEN_COLUMNS
  Tcl_SetVar2(interp, "sqlite_options", "hiddencolumns", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "hiddencolumns", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_DESERIALIZE
  Tcl_SetVar2(interp, "sqlite_options", "deserialize", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "deserialize", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_MEMSYS3
  Tcl_SetVar2(interp, "sqlite_options", "mem3", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "mem3", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_MEMSYS5
  Tcl_SetVar2(interp, "sqlite_options", "mem5", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "mem5", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_OFFSET_SQL_FUNC
  Tcl_SetVar2(interp, "sqlite_options", "offset_sql_func","1",TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "offset_sql_func","0",TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_PREUPDATE_HOOK
  Tcl_SetVar2(interp, "sqlite_options", "preupdate", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "preupdate", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_SNAPSHOT
  Tcl_SetVar2(interp, "sqlite_options", "snapshot", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "snapshot", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_MUTEX_OMIT
  Tcl_SetVar2(interp, "sqlite_options", "mutex", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "mutex", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_MUTEX_NOOP
  Tcl_SetVar2(interp, "sqlite_options", "mutex_noop", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "mutex_noop", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_ALTERTABLE
  Tcl_SetVar2(interp, "sqlite_options", "altertable", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "altertable", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_ANALYZE
  Tcl_SetVar2(interp, "sqlite_options", "analyze", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "analyze", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_API_ARMOR
  Tcl_SetVar2(interp, "sqlite_options", "api_armor", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "api_armor", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_ATOMIC_WRITE
  Tcl_SetVar2(interp, "sqlite_options", "atomicwrite", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "atomicwrite", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_JSON1
  Tcl_SetVar2(interp, "sqlite_options", "json1", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "json1", "0", TCL_GLOBAL_ONLY);
#endif

  Tcl_SetVar2(interp, "sqlite_options", "has_codec", "0", TCL_GLOBAL_ONLY);

#ifdef SQLITE_LIKE_DOESNT_MATCH_BLOBS
  Tcl_SetVar2(interp, "sqlite_options", "like_match_blobs", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "like_match_blobs", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_ATTACH
  Tcl_SetVar2(interp, "sqlite_options", "attach", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "attach", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_AUTHORIZATION
  Tcl_SetVar2(interp, "sqlite_options", "auth", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "auth", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_AUTOINCREMENT
  Tcl_SetVar2(interp, "sqlite_options", "autoinc", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "autoinc", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_AUTOMATIC_INDEX
  Tcl_SetVar2(interp, "sqlite_options", "autoindex", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "autoindex", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_AUTORESET
  Tcl_SetVar2(interp, "sqlite_options", "autoreset", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "autoreset", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_AUTOVACUUM
  Tcl_SetVar2(interp, "sqlite_options", "autovacuum", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "autovacuum", "1", TCL_GLOBAL_ONLY);
#endif /* SQLITE_OMIT_AUTOVACUUM */
#if !defined(SQLITE_DEFAULT_AUTOVACUUM)
  Tcl_SetVar2(interp,"sqlite_options","default_autovacuum","0",TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "default_autovacuum", 
      STRINGVALUE(SQLITE_DEFAULT_AUTOVACUUM), TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_BETWEEN_OPTIMIZATION
  Tcl_SetVar2(interp, "sqlite_options", "between_opt", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "between_opt", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_UNTESTABLE
  Tcl_SetVar2(interp, "sqlite_options", "builtin_test", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "builtin_test", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_BLOB_LITERAL
  Tcl_SetVar2(interp, "sqlite_options", "bloblit", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "bloblit", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_CAST
  Tcl_SetVar2(interp, "sqlite_options", "cast", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "cast", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_CHECK
  Tcl_SetVar2(interp, "sqlite_options", "check", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "check", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_CTE
  Tcl_SetVar2(interp, "sqlite_options", "cte", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "cte", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_COLUMN_METADATA
  Tcl_SetVar2(interp, "sqlite_options", "columnmetadata", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "columnmetadata", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_OVERSIZE_CELL_CHECK
  Tcl_SetVar2(interp, "sqlite_options", "oversize_cell_check", "1",
              TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "oversize_cell_check", "0",
              TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_COMPILEOPTION_DIAGS
  Tcl_SetVar2(interp, "sqlite_options", "compileoption_diags", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "compileoption_diags", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_COMPLETE
  Tcl_SetVar2(interp, "sqlite_options", "complete", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "complete", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_COMPOUND_SELECT
  Tcl_SetVar2(interp, "sqlite_options", "compound", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "compound", "1", TCL_GLOBAL_ONLY);
#endif

  Tcl_SetVar2(interp, "sqlite_options", "conflict", "1", TCL_GLOBAL_ONLY);
  Tcl_SetVar2(interp, "sqlite_options", "crashtest", "1", TCL_GLOBAL_ONLY);

#ifdef SQLITE_OMIT_DATETIME_FUNCS
  Tcl_SetVar2(interp, "sqlite_options", "datetime", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "datetime", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_DECLTYPE
  Tcl_SetVar2(interp, "sqlite_options", "decltype", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "decltype", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_DEPRECATED
  Tcl_SetVar2(interp, "sqlite_options", "deprecated", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "deprecated", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_DISKIO
  Tcl_SetVar2(interp, "sqlite_options", "diskio", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "diskio", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_EXPLAIN
  Tcl_SetVar2(interp, "sqlite_options", "explain", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "explain", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_FLOATING_POINT
  Tcl_SetVar2(interp, "sqlite_options", "floatingpoint", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "floatingpoint", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_FOREIGN_KEY
  Tcl_SetVar2(interp, "sqlite_options", "foreignkey", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "foreignkey", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_FTS1
  Tcl_SetVar2(interp, "sqlite_options", "fts1", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "fts1", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_FTS2
  Tcl_SetVar2(interp, "sqlite_options", "fts2", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "fts2", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_FTS3
  Tcl_SetVar2(interp, "sqlite_options", "fts3", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "fts3", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_FTS5
  Tcl_SetVar2(interp, "sqlite_options", "fts5", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "fts5", "0", TCL_GLOBAL_ONLY);
#endif

#if defined(SQLITE_ENABLE_FTS3) && !defined(SQLITE_DISABLE_FTS3_UNICODE)
  Tcl_SetVar2(interp, "sqlite_options", "fts3_unicode", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "fts3_unicode", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_DISABLE_FTS4_DEFERRED
  Tcl_SetVar2(interp, "sqlite_options", "fts4_deferred", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "fts4_deferred", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_GET_TABLE
  Tcl_SetVar2(interp, "sqlite_options", "gettable", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "gettable", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_ICU
  Tcl_SetVar2(interp, "sqlite_options", "icu", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "icu", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_ICU_COLLATIONS
  Tcl_SetVar2(interp, "sqlite_options", "icu_collations", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "icu_collations", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_INCRBLOB
  Tcl_SetVar2(interp, "sqlite_options", "incrblob", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "incrblob", "1", TCL_GLOBAL_ONLY);
#endif /* SQLITE_OMIT_AUTOVACUUM */

#ifdef SQLITE_OMIT_INTEGRITY_CHECK
  Tcl_SetVar2(interp, "sqlite_options", "integrityck", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "integrityck", "1", TCL_GLOBAL_ONLY);
#endif

#if defined(SQLITE_DEFAULT_FILE_FORMAT) && SQLITE_DEFAULT_FILE_FORMAT==1
  Tcl_SetVar2(interp, "sqlite_options", "legacyformat", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "legacyformat", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_LIKE_OPTIMIZATION
  Tcl_SetVar2(interp, "sqlite_options", "like_opt", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "like_opt", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_LOAD_EXTENSION
  Tcl_SetVar2(interp, "sqlite_options", "load_ext", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "load_ext", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_LOCALTIME
  Tcl_SetVar2(interp, "sqlite_options", "localtime", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "localtime", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_LOOKASIDE
  Tcl_SetVar2(interp, "sqlite_options", "lookaside", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "lookaside", "1", TCL_GLOBAL_ONLY);
#endif

Tcl_SetVar2(interp, "sqlite_options", "long_double",
              sizeof(LONGDOUBLE_TYPE)>sizeof(double) ? "1" : "0",
              TCL_GLOBAL_ONLY);

#ifdef SQLITE_OMIT_MEMORYDB
  Tcl_SetVar2(interp, "sqlite_options", "memorydb", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "memorydb", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_MEMORY_MANAGEMENT
  Tcl_SetVar2(interp, "sqlite_options", "memorymanage", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "memorymanage", "0", TCL_GLOBAL_ONLY);
#endif

Tcl_SetVar2(interp, "sqlite_options", "mergesort", "1", TCL_GLOBAL_ONLY);

#ifdef SQLITE_ENABLE_NULL_TRIM
  Tcl_SetVar2(interp, "sqlite_options", "null_trim", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "null_trim", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_OR_OPTIMIZATION
  Tcl_SetVar2(interp, "sqlite_options", "or_opt", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "or_opt", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_RBU
  Tcl_SetVar2(interp, "sqlite_options", "rbu", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "rbu", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_PAGER_PRAGMAS
  Tcl_SetVar2(interp, "sqlite_options", "pager_pragmas", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "pager_pragmas", "1", TCL_GLOBAL_ONLY);
#endif

#if defined(SQLITE_OMIT_PRAGMA) || defined(SQLITE_OMIT_FLAG_PRAGMAS)
  Tcl_SetVar2(interp, "sqlite_options", "pragma", "0", TCL_GLOBAL_ONLY);
  Tcl_SetVar2(interp, "sqlite_options", "integrityck", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "pragma", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_PROGRESS_CALLBACK
  Tcl_SetVar2(interp, "sqlite_options", "progress", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "progress", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_REINDEX
  Tcl_SetVar2(interp, "sqlite_options", "reindex", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "reindex", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_RTREE
  Tcl_SetVar2(interp, "sqlite_options", "rtree", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "rtree", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_RTREE_INT_ONLY
  Tcl_SetVar2(interp, "sqlite_options", "rtree_int_only", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "rtree_int_only", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_SCHEMA_PRAGMAS
  Tcl_SetVar2(interp, "sqlite_options", "schema_pragmas", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "schema_pragmas", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_SCHEMA_VERSION_PRAGMAS
  Tcl_SetVar2(interp, "sqlite_options", "schema_version", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "schema_version", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_SESSION
  Tcl_SetVar2(interp, "sqlite_options", "session", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "session", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_STAT4
  Tcl_SetVar2(interp, "sqlite_options", "stat4", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "stat4", "0", TCL_GLOBAL_ONLY);
#endif
#if defined(SQLITE_ENABLE_STMTVTAB) && !defined(SQLITE_OMIT_VIRTUALTABLE)
  Tcl_SetVar2(interp, "sqlite_options", "stmtvtab", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "stmtvtab", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_STMT_SCANSTATUS
  Tcl_SetVar2(interp, "sqlite_options", "scanstatus", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "scanstatus", "0", TCL_GLOBAL_ONLY);
#endif

#if !defined(SQLITE_ENABLE_LOCKING_STYLE)
#  if defined(__APPLE__)
#    define SQLITE_ENABLE_LOCKING_STYLE 1
#  else
#    define SQLITE_ENABLE_LOCKING_STYLE 0
#  endif
#endif
#if SQLITE_ENABLE_LOCKING_STYLE && defined(__APPLE__)
  Tcl_SetVar2(interp,"sqlite_options","lock_proxy_pragmas","1",TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp,"sqlite_options","lock_proxy_pragmas","0",TCL_GLOBAL_ONLY);
#endif
#if defined(SQLITE_PREFER_PROXY_LOCKING) && defined(__APPLE__)
  Tcl_SetVar2(interp,"sqlite_options","prefer_proxy_locking","1",TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp,"sqlite_options","prefer_proxy_locking","0",TCL_GLOBAL_ONLY);
#endif
    
    
#ifdef SQLITE_OMIT_SHARED_CACHE
  Tcl_SetVar2(interp, "sqlite_options", "shared_cache", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "shared_cache", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_SUBQUERY
  Tcl_SetVar2(interp, "sqlite_options", "subquery", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "subquery", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_TCL_VARIABLE
  Tcl_SetVar2(interp, "sqlite_options", "tclvar", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "tclvar", "1", TCL_GLOBAL_ONLY);
#endif

  Tcl_SetVar2(interp, "sqlite_options", "threadsafe", 
      SQLITE_THREADSAFE ? "1" : "0", TCL_GLOBAL_ONLY);
  Tcl_SetVar2(interp, "sqlite_options", "threadsafe1", 
      SQLITE_THREADSAFE==1 ? "1" : "0", TCL_GLOBAL_ONLY);
  Tcl_SetVar2(interp, "sqlite_options", "threadsafe2", 
      SQLITE_THREADSAFE==2 ? "1" : "0", TCL_GLOBAL_ONLY);
  assert( sqlite3_threadsafe()==SQLITE_THREADSAFE );

#ifdef SQLITE_OMIT_TEMPDB
  Tcl_SetVar2(interp, "sqlite_options", "tempdb", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "tempdb", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_TRACE
  Tcl_SetVar2(interp, "sqlite_options", "trace", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "trace", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_TRIGGER
  Tcl_SetVar2(interp, "sqlite_options", "trigger", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "trigger", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_TRUNCATE_OPTIMIZATION
  Tcl_SetVar2(interp, "sqlite_options", "truncate_opt", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "truncate_opt", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_UTF16
  Tcl_SetVar2(interp, "sqlite_options", "utf16", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "utf16", "1", TCL_GLOBAL_ONLY);
#endif

#if defined(SQLITE_OMIT_VACUUM) || defined(SQLITE_OMIT_ATTACH)
  Tcl_SetVar2(interp, "sqlite_options", "vacuum", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "vacuum", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_VIEW
  Tcl_SetVar2(interp, "sqlite_options", "view", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "view", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_VIRTUALTABLE
  Tcl_SetVar2(interp, "sqlite_options", "vtab", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "vtab", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_WAL
  Tcl_SetVar2(interp, "sqlite_options", "wal", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "wal", "1", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_WSD
  Tcl_SetVar2(interp, "sqlite_options", "wsd", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "wsd", "1", TCL_GLOBAL_ONLY);
#endif

#if defined(SQLITE_ENABLE_UPDATE_DELETE_LIMIT) && !defined(SQLITE_OMIT_SUBQUERY)
  Tcl_SetVar2(interp, "sqlite_options", "update_delete_limit", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "update_delete_limit", "0", TCL_GLOBAL_ONLY);
#endif

#if defined(SQLITE_ENABLE_UNLOCK_NOTIFY)
  Tcl_SetVar2(interp, "sqlite_options", "unlock_notify", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "unlock_notify", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_FAST_SECURE_DELETE
  Tcl_SetVar2(interp, "sqlite_options", "fast_secure_delete", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "fast_secure_delete", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_SECURE_DELETE
  Tcl_SetVar2(interp, "sqlite_options", "secure_delete", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "secure_delete", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_USER_AUTHENTICATION
  Tcl_SetVar2(interp, "sqlite_options", "userauth", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "userauth", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_MULTIPLEX_EXT_OVWR
  Tcl_SetVar2(interp, "sqlite_options", "multiplex_ext_overwrite", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "multiplex_ext_overwrite", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef YYTRACKMAXSTACKDEPTH
  Tcl_SetVar2(interp, "sqlite_options", "yytrackmaxstackdepth", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "yytrackmaxstackdepth", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_SQLLOG
  Tcl_SetVar2(interp, "sqlite_options", "sqllog", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "sqllog", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_ENABLE_URI_00_ERROR
  Tcl_SetVar2(interp, "sqlite_options", "uri_00_error", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "uri_00_error", "0", TCL_GLOBAL_ONLY);
#endif

#if defined(SQLITE_ENABLE_NORMALIZE)
  Tcl_SetVar2(interp, "sqlite_options", "normalize", "1", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "normalize", "0", TCL_GLOBAL_ONLY);
#endif

#ifdef SQLITE_OMIT_WINDOWFUNC
  Tcl_SetVar2(interp, "sqlite_options", "windowfunc", "0", TCL_GLOBAL_ONLY);
#else
  Tcl_SetVar2(interp, "sqlite_options", "windowfunc", "1", TCL_GLOBAL_ONLY);
#endif

#define LINKVAR(x) { \
    static const int cv_ ## x = SQLITE_ ## x; \
    Tcl_LinkVar(interp, "SQLITE_" #x, (char *)&(cv_ ## x), \
                TCL_LINK_INT | TCL_LINK_READ_ONLY); }

  LINKVAR( MAX_LENGTH );
  LINKVAR( MAX_COLUMN );
  LINKVAR( MAX_SQL_LENGTH );
  LINKVAR( MAX_EXPR_DEPTH );
  LINKVAR( MAX_COMPOUND_SELECT );
  LINKVAR( MAX_VDBE_OP );
  LINKVAR( MAX_FUNCTION_ARG );
  LINKVAR( MAX_VARIABLE_NUMBER );
  LINKVAR( MAX_PAGE_SIZE );
  LINKVAR( MAX_PAGE_COUNT );
  LINKVAR( MAX_LIKE_PATTERN_LENGTH );
  LINKVAR( MAX_TRIGGER_DEPTH );
  LINKVAR( DEFAULT_CACHE_SIZE );
  LINKVAR( DEFAULT_PAGE_SIZE );
  LINKVAR( DEFAULT_FILE_FORMAT );
  LINKVAR( DEFAULT_SYNCHRONOUS );
  LINKVAR( DEFAULT_WAL_SYNCHRONOUS );
  LINKVAR( MAX_ATTACHED );
  LINKVAR( MAX_DEFAULT_PAGE_SIZE );
  LINKVAR( MAX_WORKER_THREADS );

  {
    static const int cv_TEMP_STORE = SQLITE_TEMP_STORE;
    Tcl_LinkVar(interp, "TEMP_STORE", (char *)&(cv_TEMP_STORE),
                TCL_LINK_INT | TCL_LINK_READ_ONLY);
  }

#ifdef _MSC_VER
  {
    static const int cv__MSC_VER = 1;
    Tcl_LinkVar(interp, "_MSC_VER", (char *)&(cv__MSC_VER),
                TCL_LINK_INT | TCL_LINK_READ_ONLY);
  }
#endif
#ifdef __GNUC__
  {
    static const int cv___GNUC__ = 1;
    Tcl_LinkVar(interp, "__GNUC__", (char *)&(cv___GNUC__),
                TCL_LINK_INT | TCL_LINK_READ_ONLY);
  }
#endif
}


/*
** Register commands with the TCL interpreter.
*/
int Sqliteconfig_Init(Tcl_Interp *interp){
  set_options(interp);
  return TCL_OK;
}
