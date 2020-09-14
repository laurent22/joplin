/*
** 2006 January 09
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** Code for testing the client/server version of the SQLite library.
** Derived from test4.c.
*/
#include "sqliteInt.h"
#if defined(INCLUDE_SQLITE_TCL_H)
#  include "sqlite_tcl.h"
#else
#  include "tcl.h"
#endif

/*
** This test only works on UNIX with a SQLITE_THREADSAFE build that includes
** the SQLITE_SERVER option.
*/
#if defined(SQLITE_SERVER) && !defined(SQLITE_OMIT_SHARED_CACHE) && \
    SQLITE_OS_UNIX && SQLITE_THREADSAFE

#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <sched.h>
#include <ctype.h>

/*
** Interfaces defined in server.c
*/
int sqlite3_client_open(const char*, sqlite3**);
int sqlite3_client_prepare(sqlite3*,const char*,int,
                           sqlite3_stmt**,const char**);
int sqlite3_client_step(sqlite3_stmt*);
int sqlite3_client_reset(sqlite3_stmt*);
int sqlite3_client_finalize(sqlite3_stmt*);
int sqlite3_client_close(sqlite3*);
int sqlite3_server_start(void);
int sqlite3_server_stop(void);
void sqlite3_server_start2(int *pnDecr);

/*
** Each thread is controlled by an instance of the following
** structure.
*/
typedef struct Thread Thread;
struct Thread {
  /* The first group of fields are writable by the supervisor thread
  ** and read-only to the client threads
  */
  char *zFilename;         /* Name of database file */
  void (*xOp)(Thread*);    /* next operation to do */
  char *zArg;              /* argument usable by xOp */
  volatile int opnum;      /* Operation number */
  volatile int busy;       /* True if this thread is in use */

  /* The next group of fields are writable by the client threads 
  ** but read-only to the superviser thread.
  */
  volatile int completed;  /* Number of operations completed */
  sqlite3 *db;             /* Open database */
  sqlite3_stmt *pStmt;     /* Pending operation */
  char *zErr;              /* operation error */
  char *zStaticErr;        /* Static error message */
  int rc;                  /* operation return code */
  int argc;                /* number of columns in result */
  const char *argv[100];   /* result columns */
  const char *colv[100];   /* result column names */

  /* Initialized to 1 by the supervisor thread when the client is 
  ** created, and then deemed read-only to the supervisor thread. 
  ** Is set to 0 by the server thread belonging to this client 
  ** just before it exits.  
  */
  int nServer;             /* Number of server threads running */
};

/*
** There can be as many as 26 threads running at once.  Each is named
** by a capital letter: A, B, C, ..., Y, Z.
*/
#define N_THREAD 26
static Thread threadset[N_THREAD];

/*
** The main loop for a thread.  Threads use busy waiting. 
*/
static void *client_main(void *pArg){
  Thread *p = (Thread*)pArg;
  if( p->db ){
    sqlite3_client_close(p->db);
  }
  sqlite3_client_open(p->zFilename, &p->db);
  if( SQLITE_OK!=sqlite3_errcode(p->db) ){
    p->zErr = strdup(sqlite3_errmsg(p->db));
    sqlite3_client_close(p->db);
    p->db = 0;
  }
  p->pStmt = 0;
  p->completed = 1;
  while( p->opnum<=p->completed ) sched_yield();
  while( p->xOp ){
    if( p->zErr && p->zErr!=p->zStaticErr ){
      sqlite3_free(p->zErr);
      p->zErr = 0;
    }
    (*p->xOp)(p);
    p->completed++;
    while( p->opnum<=p->completed ) sched_yield();
  }
  if( p->pStmt ){
    sqlite3_client_finalize(p->pStmt);
    p->pStmt = 0;
  }
  if( p->db ){
    sqlite3_client_close(p->db);
    p->db = 0;
  }
  if( p->zErr && p->zErr!=p->zStaticErr ){
    sqlite3_free(p->zErr);
    p->zErr = 0;
  }
  p->completed++;
#ifndef SQLITE_OMIT_DEPRECATED
  sqlite3_thread_cleanup();
#endif
  return 0;
}

/*
** Get a thread ID which is an upper case letter.  Return the index.
** If the argument is not a valid thread ID put an error message in
** the interpreter and return -1.
*/
static int parse_client_id(Tcl_Interp *interp, const char *zArg){
  if( zArg==0 || zArg[0]==0 || zArg[1]!=0 || !isupper((unsigned char)zArg[0]) ){
    Tcl_AppendResult(interp, "thread ID must be an upper case letter", 0);
    return -1;
  }
  return zArg[0] - 'A';
}

/*
** Usage:    client_create NAME  FILENAME
**
** NAME should be an upper case letter.  Start the thread running with
** an open connection to the given database.
*/
static int SQLITE_TCLAPI tcl_client_create(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  pthread_t x;
  int rc;

  if( argc!=3 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID FILENAME", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( threadset[i].busy ){
    Tcl_AppendResult(interp, "thread ", argv[1], " is already running", 0);
    return TCL_ERROR;
  }
  threadset[i].busy = 1;
  sqlite3_free(threadset[i].zFilename);
  threadset[i].zFilename = sqlite3_mprintf("%s", argv[2]);
  threadset[i].opnum = 1;
  threadset[i].completed = 0;
  rc = pthread_create(&x, 0, client_main, &threadset[i]);
  if( rc ){
    Tcl_AppendResult(interp, "failed to create the thread", 0);
    sqlite3_free(threadset[i].zFilename);
    threadset[i].busy = 0;
    return TCL_ERROR;
  }
  pthread_detach(x);
  if( threadset[i].nServer==0 ){
    threadset[i].nServer = 1;
    sqlite3_server_start2(&threadset[i].nServer);
  }
  return TCL_OK;
}

/*
** Wait for a thread to reach its idle state.
*/
static void client_wait(Thread *p){
  while( p->opnum>p->completed ) sched_yield();
}

/*
** Usage:  client_wait ID
**
** Wait on thread ID to reach its idle state.
*/
static int SQLITE_TCLAPI tcl_client_wait(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;

  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  return TCL_OK;
}

/*
** Stop a thread.
*/
static void stop_thread(Thread *p){
  client_wait(p);
  p->xOp = 0;
  p->opnum++;
  client_wait(p);
  sqlite3_free(p->zArg);
  p->zArg = 0;
  sqlite3_free(p->zFilename);
  p->zFilename = 0;
  p->busy = 0;
}

/*
** Usage:  client_halt ID
**
** Cause a client thread to shut itself down.  Wait for the shutdown to be
** completed.  If ID is "*" then stop all client threads.
*/
static int SQLITE_TCLAPI tcl_client_halt(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;

  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID", 0);
    return TCL_ERROR;
  }
  if( argv[1][0]=='*' && argv[1][1]==0 ){
    for(i=0; i<N_THREAD; i++){
      if( threadset[i].busy ){
        stop_thread(&threadset[i]);
      }
    }
  }else{
    i = parse_client_id(interp, argv[1]);
    if( i<0 ) return TCL_ERROR;
    if( !threadset[i].busy ){
      Tcl_AppendResult(interp, "no such thread", 0);
      return TCL_ERROR;
    }
    stop_thread(&threadset[i]);
  }

  /* If no client threads are still running, also stop the server */
  for(i=0; i<N_THREAD && threadset[i].busy==0; i++){}
  if( i>=N_THREAD ){
    sqlite3_server_stop();
    while( 1 ){
      for(i=0; i<N_THREAD && threadset[i].nServer==0; i++);
      if( i==N_THREAD ) break;
      sched_yield();
    }
  }
  return TCL_OK;
}

/*
** Usage: client_argc  ID
**
** Wait on the most recent client_step to complete, then return the
** number of columns in the result set.
*/
static int SQLITE_TCLAPI tcl_client_argc(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  char zBuf[100];

  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  sqlite3_snprintf(sizeof(zBuf), zBuf, "%d", threadset[i].argc);
  Tcl_AppendResult(interp, zBuf, 0);
  return TCL_OK;
}

/*
** Usage: client_argv  ID   N
**
** Wait on the most recent client_step to complete, then return the
** value of the N-th columns in the result set.
*/
static int SQLITE_TCLAPI tcl_client_argv(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  int n;

  if( argc!=3 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID N", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  if( Tcl_GetInt(interp, argv[2], &n) ) return TCL_ERROR;
  client_wait(&threadset[i]);
  if( n<0 || n>=threadset[i].argc ){
    Tcl_AppendResult(interp, "column number out of range", 0);
    return TCL_ERROR;
  }
  Tcl_AppendResult(interp, threadset[i].argv[n], 0);
  return TCL_OK;
}

/*
** Usage: client_colname  ID   N
**
** Wait on the most recent client_step to complete, then return the
** name of the N-th columns in the result set.
*/
static int SQLITE_TCLAPI tcl_client_colname(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  int n;

  if( argc!=3 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID N", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  if( Tcl_GetInt(interp, argv[2], &n) ) return TCL_ERROR;
  client_wait(&threadset[i]);
  if( n<0 || n>=threadset[i].argc ){
    Tcl_AppendResult(interp, "column number out of range", 0);
    return TCL_ERROR;
  }
  Tcl_AppendResult(interp, threadset[i].colv[n], 0);
  return TCL_OK;
}

extern const char *sqlite3ErrName(int);

/*
** Usage: client_result  ID
**
** Wait on the most recent operation to complete, then return the
** result code from that operation.
*/
static int SQLITE_TCLAPI tcl_client_result(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  const char *zName;

  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  zName = sqlite3ErrName(threadset[i].rc);
  Tcl_AppendResult(interp, zName, 0);
  return TCL_OK;
}

/*
** Usage: client_error  ID
**
** Wait on the most recent operation to complete, then return the
** error string.
*/
static int SQLITE_TCLAPI tcl_client_error(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;

  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  Tcl_AppendResult(interp, threadset[i].zErr, 0);
  return TCL_OK;
}

/*
** This procedure runs in the thread to compile an SQL statement.
*/
static void do_compile(Thread *p){
  if( p->db==0 ){
    p->zErr = p->zStaticErr = "no database is open";
    p->rc = SQLITE_ERROR;
    return;
  }
  if( p->pStmt ){
    sqlite3_client_finalize(p->pStmt);
    p->pStmt = 0;
  }
  p->rc = sqlite3_client_prepare(p->db, p->zArg, -1, &p->pStmt, 0);
}

/*
** Usage: client_compile ID SQL
**
** Compile a new virtual machine.
*/
static int SQLITE_TCLAPI tcl_client_compile(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  if( argc!=3 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID SQL", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  threadset[i].xOp = do_compile;
  sqlite3_free(threadset[i].zArg);
  threadset[i].zArg = sqlite3_mprintf("%s", argv[2]);
  threadset[i].opnum++;
  return TCL_OK;
}

/*
** This procedure runs in the thread to step the virtual machine.
*/
static void do_step(Thread *p){
  int i;
  if( p->pStmt==0 ){
    p->zErr = p->zStaticErr = "no virtual machine available";
    p->rc = SQLITE_ERROR;
    return;
  }
  p->rc = sqlite3_client_step(p->pStmt);
  if( p->rc==SQLITE_ROW ){
    p->argc = sqlite3_column_count(p->pStmt);
    for(i=0; i<sqlite3_data_count(p->pStmt); i++){
      p->argv[i] = (char*)sqlite3_column_text(p->pStmt, i);
    }
    for(i=0; i<p->argc; i++){
      p->colv[i] = sqlite3_column_name(p->pStmt, i);
    }
  }
}

/*
** Usage: client_step ID
**
** Advance the virtual machine by one step
*/
static int SQLITE_TCLAPI tcl_client_step(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " IDL", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  threadset[i].xOp = do_step;
  threadset[i].opnum++;
  return TCL_OK;
}

/*
** This procedure runs in the thread to finalize a virtual machine.
*/
static void do_finalize(Thread *p){
  if( p->pStmt==0 ){
    p->zErr = p->zStaticErr = "no virtual machine available";
    p->rc = SQLITE_ERROR;
    return;
  }
  p->rc = sqlite3_client_finalize(p->pStmt);
  p->pStmt = 0;
}

/*
** Usage: client_finalize ID
**
** Finalize the virtual machine.
*/
static int SQLITE_TCLAPI tcl_client_finalize(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " IDL", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  threadset[i].xOp = do_finalize;
  sqlite3_free(threadset[i].zArg);
  threadset[i].zArg = 0;
  threadset[i].opnum++;
  return TCL_OK;
}

/*
** This procedure runs in the thread to reset a virtual machine.
*/
static void do_reset(Thread *p){
  if( p->pStmt==0 ){
    p->zErr = p->zStaticErr = "no virtual machine available";
    p->rc = SQLITE_ERROR;
    return;
  }
  p->rc = sqlite3_client_reset(p->pStmt);
  p->pStmt = 0;
}

/*
** Usage: client_reset ID
**
** Finalize the virtual machine.
*/
static int SQLITE_TCLAPI tcl_client_reset(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i;
  if( argc!=2 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " IDL", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  threadset[i].xOp = do_reset;
  sqlite3_free(threadset[i].zArg);
  threadset[i].zArg = 0;
  threadset[i].opnum++;
  return TCL_OK;
}

/*
** Usage: client_swap ID ID
**
** Interchange the sqlite* pointer between two threads.
*/
static int SQLITE_TCLAPI tcl_client_swap(
  void *NotUsed,
  Tcl_Interp *interp,    /* The TCL interpreter that invoked this command */
  int argc,              /* Number of arguments */
  const char **argv      /* Text of each argument */
){
  int i, j;
  sqlite3 *temp;
  if( argc!=3 ){
    Tcl_AppendResult(interp, "wrong # args: should be \"", argv[0],
       " ID1 ID2", 0);
    return TCL_ERROR;
  }
  i = parse_client_id(interp, argv[1]);
  if( i<0 ) return TCL_ERROR;
  if( !threadset[i].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[i]);
  j = parse_client_id(interp, argv[2]);
  if( j<0 ) return TCL_ERROR;
  if( !threadset[j].busy ){
    Tcl_AppendResult(interp, "no such thread", 0);
    return TCL_ERROR;
  }
  client_wait(&threadset[j]);
  temp = threadset[i].db;
  threadset[i].db = threadset[j].db;
  threadset[j].db = temp;
  return TCL_OK;
}

/*
** Register commands with the TCL interpreter.
*/
int Sqlitetest7_Init(Tcl_Interp *interp){
  static struct {
     char *zName;
     Tcl_CmdProc *xProc;
  } aCmd[] = {
     { "client_create",     (Tcl_CmdProc*)tcl_client_create     },
     { "client_wait",       (Tcl_CmdProc*)tcl_client_wait       },
     { "client_halt",       (Tcl_CmdProc*)tcl_client_halt       },
     { "client_argc",       (Tcl_CmdProc*)tcl_client_argc       },
     { "client_argv",       (Tcl_CmdProc*)tcl_client_argv       },
     { "client_colname",    (Tcl_CmdProc*)tcl_client_colname    },
     { "client_result",     (Tcl_CmdProc*)tcl_client_result     },
     { "client_error",      (Tcl_CmdProc*)tcl_client_error      },
     { "client_compile",    (Tcl_CmdProc*)tcl_client_compile    },
     { "client_step",       (Tcl_CmdProc*)tcl_client_step       },
     { "client_reset",      (Tcl_CmdProc*)tcl_client_reset      },
     { "client_finalize",   (Tcl_CmdProc*)tcl_client_finalize   },
     { "client_swap",       (Tcl_CmdProc*)tcl_client_swap       },
  };
  int i;

  for(i=0; i<sizeof(aCmd)/sizeof(aCmd[0]); i++){
    Tcl_CreateCommand(interp, aCmd[i].zName, aCmd[i].xProc, 0, 0);
  }
  return TCL_OK;
}
#else
int Sqlitetest7_Init(Tcl_Interp *interp){ return TCL_OK; }
#endif /* SQLITE_OS_UNIX */
