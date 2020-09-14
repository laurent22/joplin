/*
** This program tests the ability of SQLite database to recover from a crash.
** This program runs under Unix only, but the results are applicable to all
** systems.
**
** The main process first constructs a test database, then starts creating
** subprocesses that write to that database.  Each subprocess is killed off,
** without a chance to clean up its database connection, after a random
** delay.  This killing of the subprocesses simulates a crash or power
** failure.  The next subprocess to open the database should rollback
** whatever operation was in process at the time of the simulated crash.
**
** If any problems are encountered, an error is reported and the test stops.
** If no problems are seen after a large number of tests, we assume that
** the rollback mechanism is working.
*/
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <signal.h>
#include <stdlib.h>
#include <string.h>
#include <sched.h>
#include "sqlite.h"

static void do_some_sql(int parent){
  char *zErr;
  int rc = SQLITE_OK;
  sqlite *db;
  int cnt = 0;
  static char zBig[] = 
    "-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  if( access("./test.db-journal",0)==0 ){
    /*printf("pid %d: journal exists.  rollback will be required\n",getpid());*/    unlink("test.db-saved");
    system("cp test.db test.db-saved");
    unlink("test.db-journal-saved");
    system("cp test.db-journal test.db-journal-saved");
  }
  db = sqlite_open("./test.db", 0, &zErr);
  if( db==0 ){
    printf("ERROR: %s\n", zErr);
    if( strcmp(zErr,"database disk image is malformed")==0 ){
      kill(parent, SIGKILL);
    }
    exit(1);
  }
  srand(getpid());
  while( rc==SQLITE_OK ){
    cnt++;
    rc = sqlite_exec_printf(db, 
       "INSERT INTO t1 VALUES(%d,'%d%s')", 0, 0, &zErr,
       rand(), rand(), zBig);
  }
  if( rc!=SQLITE_OK ){
    printf("ERROR #%d: %s\n", rc, zErr);
    if( rc==SQLITE_CORRUPT ){
      kill(parent, SIGKILL);
    }
  }
  printf("pid %d: cnt=%d\n", getpid(), cnt);
}


int main(int argc, char **argv){
  int i;
  sqlite *db;
  char *zErr;
  int status;
  int parent = getpid();

  unlink("test.db");
  unlink("test.db-journal");
  db = sqlite_open("test.db", 0, &zErr);
  if( db==0 ){
    printf("Cannot initialize: %s\n", zErr);
    return 1;
  }
  sqlite_exec(db, "CREATE TABLE t1(a,b)", 0, 0, 0);
  sqlite_close(db);
  for(i=0; i<10000; i++){
    int pid = fork();
    if( pid==0 ){
      sched_yield();
      do_some_sql(parent);
      return 0;
    }
    printf("test %d, pid=%d\n", i, pid);
    usleep(rand()%10000 + 1000);
    kill(pid, SIGKILL);
    waitpid(pid, &status, 0);
  }
  return 0;
}
