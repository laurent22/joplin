/*
** 2014 August 30
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
** This file contains a command-line application that uses the RBU 
** extension. See the usage() function below for an explanation.
*/

#include "sqlite3rbu.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
** Print a usage message and exit.
*/
void usage(const char *zArgv0){
  fprintf(stderr, 
"Usage: %s ?OPTIONS? TARGET-DB RBU-DB\n"
"\n"
"Where options are:\n"
"\n"
"    -step NSTEP\n"
"    -statstep NSTATSTEP\n"
"    -vacuum\n"
"    -presql SQL\n"
"\n"
"  If the -vacuum switch is not present, argument RBU-DB must be an RBU\n"
"  database containing an update suitable for target database TARGET-DB.\n"
"  Or, if -vacuum is specified, then TARGET-DB is a database to vacuum using\n"
"  RBU, and RBU-DB is used as the state database for the vacuum (refer to\n"
"  API documentation for details).\n"
"\n"
"  If NSTEP is set to less than or equal to zero (the default value), this \n"
"  program attempts to perform the entire update or vacuum operation before\n"
"  exiting\n"
"\n"
"  If NSTEP is greater than zero, then a maximum of NSTEP calls are made\n"
"  to sqlite3rbu_step(). If the RBU update has not been completely applied\n"
"  after the NSTEP'th call is made, the state is saved in the database RBU-DB\n"
"  and the program exits. Subsequent invocations of this (or any other RBU)\n"
"  application will use this state to resume applying the RBU update to the\n"
"  target db.\n"
"\n"
, zArgv0);
  exit(1);
}

void report_default_vfs(){
  sqlite3_vfs *pVfs = sqlite3_vfs_find(0);
  fprintf(stdout, "default vfs is \"%s\"\n", pVfs->zName);
}

void report_rbu_vfs(sqlite3rbu *pRbu){
  sqlite3 *db = sqlite3rbu_db(pRbu, 0);
  if( db ){
    char *zName = 0;
    sqlite3_file_control(db, "main", SQLITE_FCNTL_VFSNAME, &zName);
    if( zName ){
      fprintf(stdout, "using vfs \"%s\"\n", zName);
    }else{
      fprintf(stdout, "vfs name not available\n");
    }
    sqlite3_free(zName);
  }
}

int main(int argc, char **argv){
  int i;
  const char *zTarget;            /* Target database to apply RBU to */
  const char *zRbu;               /* Database containing RBU */
  char zBuf[200];                 /* Buffer for printf() */
  char *zErrmsg = 0;              /* Error message, if any */
  sqlite3rbu *pRbu;               /* RBU handle */
  int nStep = 0;                  /* Maximum number of step() calls */
  int nStatStep = 0;              /* Report stats after this many step calls */
  int bVacuum = 0;
  const char *zPreSql = 0;
  int rc = SQLITE_OK;
  sqlite3_int64 nProgress = 0;
  int nArgc = argc-2;

  if( argc<3 ) usage(argv[0]);
  for(i=1; i<nArgc; i++){
    const char *zArg = argv[i];
    int nArg = strlen(zArg);
    if( nArg>1 && nArg<=8 && 0==memcmp(zArg, "-vacuum", nArg) ){
      bVacuum = 1;
    }else if( nArg>1 && nArg<=7 
           && 0==memcmp(zArg, "-presql", nArg) && i<nArg-1 ){
      i++;
      zPreSql = argv[i];
    }else if( nArg>1 && nArg<=5 && 0==memcmp(zArg, "-step", nArg) && i<nArg-1 ){
      i++;
      nStep = atoi(argv[i]);
    }else if( nArg>1 && nArg<=9 
           && 0==memcmp(zArg, "-statstep", nArg) && i<nArg-1 
    ){
      i++;
      nStatStep = atoi(argv[i]);
    }else{
      usage(argv[0]);
    }
  }

  zTarget = argv[argc-2];
  zRbu = argv[argc-1];

  report_default_vfs();

  /* Open an RBU handle. A vacuum handle if -vacuum was specified, or a
  ** regular RBU update handle otherwise.  */
  if( bVacuum ){
    pRbu = sqlite3rbu_vacuum(zTarget, zRbu);
  }else{
    pRbu = sqlite3rbu_open(zTarget, zRbu, 0);
  }
  report_rbu_vfs(pRbu);

  if( zPreSql && pRbu ){
    sqlite3 *dbMain = sqlite3rbu_db(pRbu, 0);
    rc = sqlite3_exec(dbMain, zPreSql, 0, 0, 0);
    if( rc==SQLITE_OK ){
      sqlite3 *dbRbu = sqlite3rbu_db(pRbu, 1);
      rc = sqlite3_exec(dbRbu, zPreSql, 0, 0, 0);
    }
  }

  /* If nStep is less than or equal to zero, call
  ** sqlite3rbu_step() until either the RBU has been completely applied
  ** or an error occurs. Or, if nStep is greater than zero, call
  ** sqlite3rbu_step() a maximum of nStep times.  */
  if( rc==SQLITE_OK ){
    for(i=0; (nStep<=0 || i<nStep) && sqlite3rbu_step(pRbu)==SQLITE_OK; i++){
      if( nStatStep>0 && (i % nStatStep)==0 ){
        sqlite3_int64 nUsed;
        sqlite3_int64 nHighwater;
        sqlite3_status64(SQLITE_STATUS_MEMORY_USED, &nUsed, &nHighwater, 0);
        fprintf(stdout, "memory used=%lld highwater=%lld", nUsed, nHighwater);
        if( bVacuum==0 ){
          int one;
          int two;
          sqlite3rbu_bp_progress(pRbu, &one, &two);
          fprintf(stdout, "  progress=%d/%d\n", one, two);
        }else{
          fprintf(stdout, "\n");
        }
        fflush(stdout);
      }
    }
    nProgress = sqlite3rbu_progress(pRbu);
    rc = sqlite3rbu_close(pRbu, &zErrmsg);
  }

  /* Let the user know what happened. */
  switch( rc ){
    case SQLITE_OK:
      sqlite3_snprintf(sizeof(zBuf), zBuf,
          "SQLITE_OK: rbu update incomplete (%lld operations so far)\n",
          nProgress
      );
      fprintf(stdout, "%s", zBuf);
      break;

    case SQLITE_DONE:
      sqlite3_snprintf(sizeof(zBuf), zBuf,
          "SQLITE_DONE: rbu update completed (%lld operations)\n",
          nProgress
      );
      fprintf(stdout, "%s", zBuf);
      break;

    default:
      fprintf(stderr, "error=%d: %s\n", rc, zErrmsg);
      break;
  }

  sqlite3_free(zErrmsg);
  return (rc==SQLITE_OK || rc==SQLITE_DONE) ? 0 : 1;
}
