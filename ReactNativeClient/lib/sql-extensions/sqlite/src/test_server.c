/*
** 2006 January 07
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
** This file contains demonstration code.  Nothing in this file gets compiled
** or linked into the SQLite library unless you use a non-standard option:
**
**      -DSQLITE_SERVER=1
**
** The configure script will never generate a Makefile with the option
** above.  You will need to manually modify the Makefile if you want to
** include any of the code from this file in your project.  Or, at your
** option, you may copy and paste the code from this file and
** thereby avoiding a recompile of SQLite.
**
**
** This source file demonstrates how to use SQLite to create an SQL database 
** server thread in a multiple-threaded program.  One or more client threads
** send messages to the server thread and the server thread processes those
** messages in the order received and returns the results to the client.
**
** One might ask:  "Why bother?  Why not just let each thread connect
** to the database directly?"  There are a several of reasons to
** prefer the client/server approach.
**
**    (1)  Some systems (ex: Redhat9) have broken threading implementations
**         that prevent SQLite database connections from being used in
**         a thread different from the one where they were created.  With
**         the client/server approach, all database connections are created
**         and used within the server thread.  Client calls to the database
**         can be made from multiple threads (though not at the same time!)
**
**    (2)  Beginning with SQLite version 3.3.0, when two or more 
**         connections to the same database occur within the same thread,
**         they can optionally share their database cache.  This reduces
**         I/O and memory requirements.  Cache shared is controlled using
**         the sqlite3_enable_shared_cache() API.
**
**    (3)  Database connections on a shared cache use table-level locking
**         instead of file-level locking for improved concurrency.
**
**    (4)  Database connections on a shared cache can by optionally
**         set to READ UNCOMMITTED isolation.  (The default isolation for
**         SQLite is SERIALIZABLE.)  When this occurs, readers will
**         never be blocked by a writer and writers will not be
**         blocked by readers.  There can still only be a single writer
**         at a time, but multiple readers can simultaneously exist with
**         that writer.  This is a huge increase in concurrency.
**
** To summarize the rational for using a client/server approach: prior
** to SQLite version 3.3.0 it probably was not worth the trouble.  But
** with SQLite version 3.3.0 and beyond you can get significant performance
** and concurrency improvements and memory usage reductions by going
** client/server.
**
** Note:  The extra features of version 3.3.0 described by points (2)
** through (4) above are only available if you compile without the
** option -DSQLITE_OMIT_SHARED_CACHE. 
**
** Here is how the client/server approach works:  The database server
** thread is started on this procedure:
**
**       void *sqlite3_server(void *NotUsed);
**
** The sqlite_server procedure runs as long as the g.serverHalt variable
** is false.  A mutex is used to make sure no more than one server runs
** at a time.  The server waits for messages to arrive on a message
** queue and processes the messages in order.
**
** Two convenience routines are provided for starting and stopping the
** server thread:
**
**       void sqlite3_server_start(void);
**       void sqlite3_server_stop(void);
**
** Both of the convenience routines return immediately.  Neither will
** ever give an error.  If a server is already started or already halted,
** then the routines are effectively no-ops.
**
** Clients use the following interfaces:
**
**       sqlite3_client_open
**       sqlite3_client_prepare
**       sqlite3_client_step
**       sqlite3_client_reset
**       sqlite3_client_finalize
**       sqlite3_client_close
**
** These interfaces work exactly like the standard core SQLite interfaces
** having the same names without the "_client_" infix.  Many other SQLite
** interfaces can be used directly without having to send messages to the
** server as long as SQLITE_ENABLE_MEMORY_MANAGEMENT is not defined.
** The following interfaces fall into this second category:
**
**       sqlite3_bind_*
**       sqlite3_changes
**       sqlite3_clear_bindings
**       sqlite3_column_*
**       sqlite3_complete
**       sqlite3_create_collation
**       sqlite3_create_function
**       sqlite3_data_count
**       sqlite3_db_handle
**       sqlite3_errcode
**       sqlite3_errmsg
**       sqlite3_last_insert_rowid
**       sqlite3_total_changes
**       sqlite3_transfer_bindings
**
** A single SQLite connection (an sqlite3* object) or an SQLite statement
** (an sqlite3_stmt* object) should only be passed to a single interface
** function at a time.  The connections and statements can be passed from
** any thread to any of the functions listed in the second group above as
** long as the same connection is not in use by two threads at once and
** as long as SQLITE_ENABLE_MEMORY_MANAGEMENT is not defined.  Additional
** information about the SQLITE_ENABLE_MEMORY_MANAGEMENT constraint is
** below.
**
** The busy handler for all database connections should remain turned
** off.  That means that any lock contention will cause the associated
** sqlite3_client_step() call to return immediately with an SQLITE_BUSY
** error code.  If a busy handler is enabled and lock contention occurs,
** then the entire server thread will block.  This will cause not only
** the requesting client to block but every other database client as
** well.  It is possible to enhance the code below so that lock
** contention will cause the message to be placed back on the top of
** the queue to be tried again later.  But such enhanced processing is
** not included here, in order to keep the example simple.
**
** This example code assumes the use of pthreads.  Pthreads
** implementations are available for windows.  (See, for example
** http://sourceware.org/pthreads-win32/announcement.html.)  Or, you
** can translate the locking and thread synchronization code to use
** windows primitives easily enough.  The details are left as an
** exercise to the reader.
**
**** Restrictions Associated With SQLITE_ENABLE_MEMORY_MANAGEMENT ****
**
** If you compile with SQLITE_ENABLE_MEMORY_MANAGEMENT defined, then
** SQLite includes code that tracks how much memory is being used by
** each thread.  These memory counts can become confused if memory
** is allocated by one thread and then freed by another.  For that
** reason, when SQLITE_ENABLE_MEMORY_MANAGEMENT is used, all operations
** that might allocate or free memory should be performanced in the same
** thread that originally created the database connection.  In that case,
** many of the operations that are listed above as safe to be performed
** in separate threads would need to be sent over to the server to be
** done there.  If SQLITE_ENABLE_MEMORY_MANAGEMENT is defined, then
** the following functions can be used safely from different threads
** without messing up the allocation counts:
**
**       sqlite3_bind_parameter_name
**       sqlite3_bind_parameter_index
**       sqlite3_changes
**       sqlite3_column_blob
**       sqlite3_column_count
**       sqlite3_complete
**       sqlite3_data_count
**       sqlite3_db_handle
**       sqlite3_errcode
**       sqlite3_errmsg
**       sqlite3_last_insert_rowid
**       sqlite3_total_changes
**
** The remaining functions are not thread-safe when memory management
** is enabled.  So one would have to define some new interface routines
** along the following lines:
**
**       sqlite3_client_bind_*
**       sqlite3_client_clear_bindings
**       sqlite3_client_column_*
**       sqlite3_client_create_collation
**       sqlite3_client_create_function
**       sqlite3_client_transfer_bindings
**
** The example code in this file is intended for use with memory
** management turned off.  So the implementation of these additional
** client interfaces is left as an exercise to the reader.
**
** It may seem surprising to the reader that the list of safe functions
** above does not include things like sqlite3_bind_int() or
** sqlite3_column_int().  But those routines might, in fact, allocate
** or deallocate memory.  In the case of sqlite3_bind_int(), if the
** parameter was previously bound to a string that string might need
** to be deallocated before the new integer value is inserted.  In
** the case of sqlite3_column_int(), the value of the column might be
** a UTF-16 string which will need to be converted to UTF-8 then into
** an integer.
*/

/* Include this to get the definition of SQLITE_THREADSAFE, in the
** case that default values are used.
*/
#include "sqliteInt.h"

/*
** Only compile the code in this file on UNIX with a SQLITE_THREADSAFE build
** and only if the SQLITE_SERVER macro is defined.
*/
#if defined(SQLITE_SERVER) && !defined(SQLITE_OMIT_SHARED_CACHE)
#if SQLITE_OS_UNIX && SQLITE_THREADSAFE

/*
** We require only pthreads and the public interface of SQLite.
*/
#include <pthread.h>
#include "sqlite3.h"

/*
** Messages are passed from client to server and back again as 
** instances of the following structure.
*/
typedef struct SqlMessage SqlMessage;
struct SqlMessage {
  int op;                      /* Opcode for the message */
  sqlite3 *pDb;                /* The SQLite connection */
  sqlite3_stmt *pStmt;         /* A specific statement */
  int errCode;                 /* Error code returned */
  const char *zIn;             /* Input filename or SQL statement */
  int nByte;                   /* Size of the zIn parameter for prepare() */
  const char *zOut;            /* Tail of the SQL statement */
  SqlMessage *pNext;           /* Next message in the queue */
  SqlMessage *pPrev;           /* Previous message in the queue */
  pthread_mutex_t clientMutex; /* Hold this mutex to access the message */
  pthread_cond_t clientWakeup; /* Signal to wake up the client */
};

/*
** Legal values for SqlMessage.op
*/
#define MSG_Open       1  /* sqlite3_open(zIn, &pDb) */
#define MSG_Prepare    2  /* sqlite3_prepare(pDb, zIn, nByte, &pStmt, &zOut) */
#define MSG_Step       3  /* sqlite3_step(pStmt) */
#define MSG_Reset      4  /* sqlite3_reset(pStmt) */
#define MSG_Finalize   5  /* sqlite3_finalize(pStmt) */
#define MSG_Close      6  /* sqlite3_close(pDb) */
#define MSG_Done       7  /* Server has finished with this message */


/*
** State information about the server is stored in a static variable
** named "g" as follows:
*/
static struct ServerState {
  pthread_mutex_t queueMutex;   /* Hold this mutex to access the msg queue */
  pthread_mutex_t serverMutex;  /* Held by the server while it is running */
  pthread_cond_t serverWakeup;  /* Signal this condvar to wake up the server */
  volatile int serverHalt;      /* Server halts itself when true */
  SqlMessage *pQueueHead;       /* Head of the message queue */
  SqlMessage *pQueueTail;       /* Tail of the message queue */
} g = {
  PTHREAD_MUTEX_INITIALIZER,
  PTHREAD_MUTEX_INITIALIZER,
  PTHREAD_COND_INITIALIZER,
};

/*
** Send a message to the server.  Block until we get a reply.
**
** The mutex and condition variable in the message are uninitialized
** when this routine is called.  This routine takes care of 
** initializing them and destroying them when it has finished.
*/
static void sendToServer(SqlMessage *pMsg){
  /* Initialize the mutex and condition variable on the message
  */
  pthread_mutex_init(&pMsg->clientMutex, 0);
  pthread_cond_init(&pMsg->clientWakeup, 0);

  /* Add the message to the head of the server's message queue.
  */
  pthread_mutex_lock(&g.queueMutex);
  pMsg->pNext = g.pQueueHead;
  if( g.pQueueHead==0 ){
    g.pQueueTail = pMsg;
  }else{
    g.pQueueHead->pPrev = pMsg;
  }
  pMsg->pPrev = 0;
  g.pQueueHead = pMsg;
  pthread_mutex_unlock(&g.queueMutex);

  /* Signal the server that the new message has be queued, then
  ** block waiting for the server to process the message.
  */
  pthread_mutex_lock(&pMsg->clientMutex);
  pthread_cond_signal(&g.serverWakeup);
  while( pMsg->op!=MSG_Done ){
    pthread_cond_wait(&pMsg->clientWakeup, &pMsg->clientMutex);
  }
  pthread_mutex_unlock(&pMsg->clientMutex);

  /* Destroy the mutex and condition variable of the message.
  */
  pthread_mutex_destroy(&pMsg->clientMutex);
  pthread_cond_destroy(&pMsg->clientWakeup);
}

/*
** The following 6 routines are client-side implementations of the
** core SQLite interfaces:
**
**        sqlite3_open
**        sqlite3_prepare
**        sqlite3_step
**        sqlite3_reset
**        sqlite3_finalize
**        sqlite3_close
**
** Clients should use the following client-side routines instead of 
** the core routines above.
**
**        sqlite3_client_open
**        sqlite3_client_prepare
**        sqlite3_client_step
**        sqlite3_client_reset
**        sqlite3_client_finalize
**        sqlite3_client_close
**
** Each of these routines creates a message for the desired operation,
** sends that message to the server, waits for the server to process
** then message and return a response.
*/
int sqlite3_client_open(const char *zDatabaseName, sqlite3 **ppDb){
  SqlMessage msg;
  msg.op = MSG_Open;
  msg.zIn = zDatabaseName;
  sendToServer(&msg);
  *ppDb = msg.pDb;
  return msg.errCode;
}
int sqlite3_client_prepare(
  sqlite3 *pDb,
  const char *zSql,
  int nByte,
  sqlite3_stmt **ppStmt,
  const char **pzTail
){
  SqlMessage msg;
  msg.op = MSG_Prepare;
  msg.pDb = pDb;
  msg.zIn = zSql;
  msg.nByte = nByte;
  sendToServer(&msg);
  *ppStmt = msg.pStmt;
  if( pzTail ) *pzTail = msg.zOut;
  return msg.errCode;
}
int sqlite3_client_step(sqlite3_stmt *pStmt){
  SqlMessage msg;
  msg.op = MSG_Step;
  msg.pStmt = pStmt;
  sendToServer(&msg);
  return msg.errCode;
}
int sqlite3_client_reset(sqlite3_stmt *pStmt){
  SqlMessage msg;
  msg.op = MSG_Reset;
  msg.pStmt = pStmt;
  sendToServer(&msg);
  return msg.errCode;
}
int sqlite3_client_finalize(sqlite3_stmt *pStmt){
  SqlMessage msg;
  msg.op = MSG_Finalize;
  msg.pStmt = pStmt;
  sendToServer(&msg);
  return msg.errCode;
}
int sqlite3_client_close(sqlite3 *pDb){
  SqlMessage msg;
  msg.op = MSG_Close;
  msg.pDb = pDb;
  sendToServer(&msg);
  return msg.errCode;
}

/*
** This routine implements the server.  To start the server, first
** make sure g.serverHalt is false, then create a new detached thread
** on this procedure.  See the sqlite3_server_start() routine below
** for an example.  This procedure loops until g.serverHalt becomes
** true.
*/
void *sqlite3_server(void *NotUsed){
  if( pthread_mutex_trylock(&g.serverMutex) ){
    return 0;  /* Another server is already running */
  }
  sqlite3_enable_shared_cache(1);
  while( !g.serverHalt ){
    SqlMessage *pMsg;

    /* Remove the last message from the message queue.
    */
    pthread_mutex_lock(&g.queueMutex);
    while( g.pQueueTail==0 && g.serverHalt==0 ){
      pthread_cond_wait(&g.serverWakeup, &g.queueMutex);
    }
    pMsg = g.pQueueTail;
    if( pMsg ){
      if( pMsg->pPrev ){
        pMsg->pPrev->pNext = 0;
      }else{
        g.pQueueHead = 0;
      }
      g.pQueueTail = pMsg->pPrev;
    }
    pthread_mutex_unlock(&g.queueMutex);
    if( pMsg==0 ) break;

    /* Process the message just removed
    */
    pthread_mutex_lock(&pMsg->clientMutex);
    switch( pMsg->op ){
      case MSG_Open: {
        pMsg->errCode = sqlite3_open(pMsg->zIn, &pMsg->pDb);
        break;
      }
      case MSG_Prepare: {
        pMsg->errCode = sqlite3_prepare(pMsg->pDb, pMsg->zIn, pMsg->nByte,
                                        &pMsg->pStmt, &pMsg->zOut);
        break;
      }
      case MSG_Step: {
        pMsg->errCode = sqlite3_step(pMsg->pStmt);
        break;
      }
      case MSG_Reset: {
        pMsg->errCode = sqlite3_reset(pMsg->pStmt);
        break;
      }
      case MSG_Finalize: {
        pMsg->errCode = sqlite3_finalize(pMsg->pStmt);
        break;
      }
      case MSG_Close: {
        pMsg->errCode = sqlite3_close(pMsg->pDb);
        break;
      }
    }

    /* Signal the client that the message has been processed.
    */
    pMsg->op = MSG_Done;
    pthread_mutex_unlock(&pMsg->clientMutex);
    pthread_cond_signal(&pMsg->clientWakeup);
  }
  pthread_mutex_unlock(&g.serverMutex);
  return 0;
}

/*
** Start a server thread if one is not already running.  If there
** is aleady a server thread running, the new thread will quickly
** die and this routine is effectively a no-op.
*/
void sqlite3_server_start(void){
  pthread_t x;
  int rc;
  g.serverHalt = 0;
  rc = pthread_create(&x, 0, sqlite3_server, 0);
  if( rc==0 ){
    pthread_detach(x);
  }
}

/*
** A wrapper around sqlite3_server() that decrements the int variable
** pointed to by the first argument after the sqlite3_server() call
** returns.
*/
static void *serverWrapper(void *pnDecr){
  void *p = sqlite3_server(0);
  (*(int*)pnDecr)--;
  return p;
}

/*
** This function is the similar to sqlite3_server_start(), except that
** the integer pointed to by the first argument is decremented when
** the server thread exits. 
*/
void sqlite3_server_start2(int *pnDecr){
  pthread_t x;
  int rc;
  g.serverHalt = 0;
  rc = pthread_create(&x, 0, serverWrapper, (void*)pnDecr);
  if( rc==0 ){
    pthread_detach(x);
  }
}

/*
** If a server thread is running, then stop it.  If no server is
** running, this routine is effectively a no-op.
**
** This routine waits until the server has actually stopped before
** returning.
*/
void sqlite3_server_stop(void){
  g.serverHalt = 1;
  pthread_cond_broadcast(&g.serverWakeup);
  pthread_mutex_lock(&g.serverMutex);
  pthread_mutex_unlock(&g.serverMutex);
}

#endif /* SQLITE_OS_UNIX && SQLITE_THREADSAFE */
#endif /* defined(SQLITE_SERVER) */
