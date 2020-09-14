/*
** This is the source code to a "tclsh" that has SQLite built-in.
**
** The startup script is located as follows:
**
**   (1)  Open the executable as an appended SQLite database and try to
**        read the startup script out of that database.
**
**   (2)  If the first argument is a readable file, try to open that file
**        as an SQLite database and read the startup script out of that
**        database.
**
**   (3)  If the first argument is a readable file with a ".tcl" extension,
**        then try to run that script directly.
**
** If none of the above steps work, then the program runs as an interactive
** tclsh.
*/
#define TCLSH_INIT_PROC sqlite3_tclapp_init_proc
#define SQLITE_ENABLE_DBSTAT_VTAB 1
#undef SQLITE_THREADSAFE
#define SQLITE_THREADSAFE 0
#undef SQLITE_ENABLE_COLUMN_METADATA
#define SQLITE_OMIT_DECLTYPE 1
#define SQLITE_OMIT_DEPRECATED 1
#define SQLITE_OMIT_PROGRESS_CALLBACK 1
#define SQLITE_OMIT_SHARED_CACHE 1
#define SQLITE_DEFAULT_MEMSTATUS 0
#define SQLITE_MAX_EXPR_DEPTH 0
INCLUDE sqlite3.c
INCLUDE $ROOT/ext/misc/appendvfs.c
#ifdef SQLITE_HAVE_ZLIB
INCLUDE $ROOT/ext/misc/zipfile.c
INCLUDE $ROOT/ext/misc/sqlar.c
#endif
INCLUDE $ROOT/src/tclsqlite.c

const char *sqlite3_tclapp_init_proc(Tcl_Interp *interp){
  (void)interp;
  sqlite3_appendvfs_init(0,0,0);
#ifdef SQLITE_HAVE_ZLIB
  sqlite3_auto_extension((void(*)(void))sqlite3_sqlar_init);
  sqlite3_auto_extension((void(*)(void))sqlite3_zipfile_init);
#endif

  return
BEGIN_STRING
INCLUDE $ROOT/tool/sqltclsh.tcl
END_STRING
;
}
