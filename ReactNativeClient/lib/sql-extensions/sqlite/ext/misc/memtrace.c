/*
** 2019-01-21
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
** This file implements an extension that uses the SQLITE_CONFIG_MALLOC
** mechanism to add a tracing layer on top of SQLite.  If this extension
** is registered prior to sqlite3_initialize(), it will cause all memory
** allocation activities to be logged on standard output, or to some other
** FILE specified by the initializer.
**
** This file needs to be compiled into the application that uses it.
**
** This extension is used to implement the --memtrace option of the
** command-line shell.
*/
#include <assert.h>
#include <string.h>
#include <stdio.h>

/* The original memory allocation routines */
static sqlite3_mem_methods memtraceBase;
static FILE *memtraceOut;

/* Methods that trace memory allocations */
static void *memtraceMalloc(int n){
  if( memtraceOut ){
    fprintf(memtraceOut, "MEMTRACE: allocate %d bytes\n", 
            memtraceBase.xRoundup(n));
  }
  return memtraceBase.xMalloc(n);
}
static void memtraceFree(void *p){
  if( p==0 ) return;
  if( memtraceOut ){
    fprintf(memtraceOut, "MEMTRACE: free %d bytes\n", memtraceBase.xSize(p));
  }
  memtraceBase.xFree(p);
}
static void *memtraceRealloc(void *p, int n){
  if( p==0 ) return memtraceMalloc(n);
  if( n==0 ){
    memtraceFree(p);
    return 0;
  }
  if( memtraceOut ){
    fprintf(memtraceOut, "MEMTRACE: resize %d -> %d bytes\n",
            memtraceBase.xSize(p), memtraceBase.xRoundup(n));
  }
  return memtraceBase.xRealloc(p, n);
}
static int memtraceSize(void *p){
  return memtraceBase.xSize(p);
}
static int memtraceRoundup(int n){
  return memtraceBase.xRoundup(n);
}
static int memtraceInit(void *p){
  return memtraceBase.xInit(p);
}
static void memtraceShutdown(void *p){
  memtraceBase.xShutdown(p);
}

/* The substitute memory allocator */
static sqlite3_mem_methods ersaztMethods = {
  memtraceMalloc,
  memtraceFree,
  memtraceRealloc,
  memtraceSize,
  memtraceRoundup,
  memtraceInit,
  memtraceShutdown,
  0
};

/* Begin tracing memory allocations to out. */
int sqlite3MemTraceActivate(FILE *out){
  int rc = SQLITE_OK;
  if( memtraceBase.xMalloc==0 ){
    rc = sqlite3_config(SQLITE_CONFIG_GETMALLOC, &memtraceBase);
    if( rc==SQLITE_OK ){
      rc = sqlite3_config(SQLITE_CONFIG_MALLOC, &ersaztMethods);
    }
  }
  memtraceOut = out;
  return rc;
}

/* Deactivate memory tracing */
int sqlite3MemTraceDeactivate(void){
  int rc = SQLITE_OK;
  if( memtraceBase.xMalloc!=0 ){
    rc = sqlite3_config(SQLITE_CONFIG_MALLOC, &memtraceBase);
    if( rc==SQLITE_OK ){
      memset(&memtraceBase, 0, sizeof(memtraceBase));
    }
  }
  memtraceOut = 0;
  return rc;
}
