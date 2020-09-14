/*
** This C program extracts all "words" from an input document and adds them
** to an SQLite database.  A "word" is any contiguous sequence of alphabetic
** characters.  All digits, punctuation, and whitespace characters are 
** word separators.  The database stores a single entry for each distinct
** word together with a count of the number of occurrences of that word.
** A fresh database is created automatically on each run.
**
**     wordcount DATABASE INPUTFILE
**
** The INPUTFILE name can be omitted, in which case input it taken from
** standard input.
**
** Option:
**
**
** Modes:
**
** Insert mode means:
**    (1) INSERT OR IGNORE INTO wordcount VALUES($new,1)
**    (2) UPDATE wordcount SET cnt=cnt+1 WHERE word=$new -- if (1) is a noop
**
** Update mode means:
**    (1) INSERT OR IGNORE INTO wordcount VALUES($new,0)
**    (2) UPDATE wordcount SET cnt=cnt+1 WHERE word=$new
**
** Replace mode means:
**    (1) REPLACE INTO wordcount
**        VALUES($new,ifnull((SELECT cnt FROM wordcount WHERE word=$new),0)+1);
**
** Upsert mode means:
**    (1) INSERT INTO wordcount VALUES($new,1)
**            ON CONFLICT(word) DO UPDATE SET cnt=cnt+1
**
** Select mode means:
**    (1) SELECT 1 FROM wordcount WHERE word=$new
**    (2) INSERT INTO wordcount VALUES($new,1) -- if (1) returns nothing
**    (3) UPDATE wordcount SET cnt=cnt+1 WHERE word=$new  --if (1) return TRUE
**
** Delete mode means:
**    (1) DELETE FROM wordcount WHERE word=$new
**
** Query mode means:
**    (1) SELECT cnt FROM wordcount WHERE word=$new
**
** Note that delete mode and query mode are only useful for preexisting
** databases.  The wordcount table is created using IF NOT EXISTS so this
** utility can be run multiple times on the same database file.  The
** --without-rowid, --nocase, and --pagesize parameters are only effective
** when creating a new database and are harmless no-ops on preexisting
** databases.
**
******************************************************************************
**
** Compile as follows:
**
**    gcc -I. wordcount.c sqlite3.c -ldl -lpthreads
**
** Or:
**
**    gcc -I. -DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION \
**        wordcount.c sqlite3.c
*/
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <stdlib.h>
#include <stdarg.h>
#include "sqlite3.h"
#ifndef _WIN32
# include <unistd.h>
#else
# include <io.h>
#endif
#define ISALPHA(X) isalpha((unsigned char)(X))

const char zHelp[] = 
"Usage: wordcount [OPTIONS] DATABASE [INPUT]\n"
" --all                Repeat the test for all test modes\n"
" --cachesize NNN      Use a cache size of NNN\n"
" --commit NNN         Commit after every NNN operations\n"
" --delete             Use DELETE mode\n"
" --insert             Use INSERT mode (the default)\n"
" --journal MMMM       Use PRAGMA journal_mode=MMMM\n"
" --nocase             Add the NOCASE collating sequence to the words.\n"
" --nosync             Use PRAGMA synchronous=OFF\n"
" --pagesize NNN       Use a page size of NNN\n"
" --query              Use QUERY mode\n"
" --replace            Use REPLACE mode\n"
" --select             Use SELECT mode\n"
" --stats              Show sqlite3_status() results at the end.\n"
" --summary            Show summary information on the collected data.\n"
" --tag NAME           Tag all output using NAME.  Use only stdout.\n"
" --timer              Time the operation of this program\n"
" --trace              Enable sqlite3_trace() output.\n"
" --update             Use UPDATE mode\n"
" --upsert             Use UPSERT mode\n"
" --without-rowid      Use a WITHOUT ROWID table to store the words.\n"
;

/* Output tag */
char *zTag = "--";

/* Return the current wall-clock time */
static sqlite3_int64 realTime(void){
  static sqlite3_vfs *clockVfs = 0;
  sqlite3_int64 t;
  if( clockVfs==0 ) clockVfs = sqlite3_vfs_find(0);
  if( clockVfs->iVersion>=1 && clockVfs->xCurrentTimeInt64!=0 ){
    clockVfs->xCurrentTimeInt64(clockVfs, &t);
  }else{
    double r;
    clockVfs->xCurrentTime(clockVfs, &r);
    t = (sqlite3_int64)(r*86400000.0);
  }
  return t;
}

/* Print an error message and exit */
static void fatal_error(const char *zMsg, ...){
  va_list ap;
  va_start(ap, zMsg);
  vfprintf(stderr, zMsg, ap);
  va_end(ap);
  exit(1);
}

/* Print a usage message and quit */
static void usage(void){
  printf("%s",zHelp);
  exit(0);
}

/* The sqlite3_trace() callback function */
static void traceCallback(void *NotUsed, const char *zSql){
  printf("%s;\n", zSql);
}

/* An sqlite3_exec() callback that prints results on standard output,
** each column separated by a single space. */
static int printResult(void *NotUsed, int nArg, char **azArg, char **azNm){
  int i;
  printf("%s", zTag);
  for(i=0; i<nArg; i++){
    printf(" %s", azArg[i] ? azArg[i] : "(null)");
  }
  printf("\n");
  return 0;
}


/*
** Add one character to a hash
*/
static void addCharToHash(unsigned int *a, unsigned char x){
  if( a[0]<4 ){
    a[1] = (a[1]<<8) | x;
    a[0]++;
  }else{
    a[2] = (a[2]<<8) | x;
    a[0]++;
    if( a[0]==8 ){
      a[3] += a[1] + a[4];
      a[4] += a[2] + a[3];
      a[0] = a[1] = a[2] = 0;
    }
  }    
}

/*
** Compute the final hash value.
*/
static void finalHash(unsigned int *a, char *z){
  a[3] += a[1] + a[4] + a[0];
  a[4] += a[2] + a[3];
  sqlite3_snprintf(17, z, "%08x%08x", a[3], a[4]);
}


/*
** Implementation of a checksum() aggregate SQL function
*/
static void checksumStep(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const unsigned char *zVal;
  int nVal, i, j;
  unsigned int *a;
  a = (unsigned*)sqlite3_aggregate_context(context, sizeof(unsigned int)*5);

  if( a ){
    for(i=0; i<argc; i++){
      nVal = sqlite3_value_bytes(argv[i]);
      zVal = (const unsigned char*)sqlite3_value_text(argv[i]);
      if( zVal ) for(j=0; j<nVal; j++) addCharToHash(a, zVal[j]);
      addCharToHash(a, '|');
    }
    addCharToHash(a, '\n');
  }
}
static void checksumFinalize(sqlite3_context *context){
  unsigned int *a;
  char zResult[24];
  a = sqlite3_aggregate_context(context, 0);
  if( a ){
    finalHash(a, zResult);
    sqlite3_result_text(context, zResult, -1, SQLITE_TRANSIENT);
  }
}

/* Define operating modes */
#define MODE_INSERT     0
#define MODE_REPLACE    1
#define MODE_UPSERT     2
#define MODE_SELECT     3
#define MODE_UPDATE     4
#define MODE_DELETE     5
#define MODE_QUERY      6
#define MODE_COUNT      7
#define MODE_ALL      (-1)

/* Mode names */
static const char *azMode[] = {
  "--insert",
  "--replace",
  "--upsert",
  "--select",
  "--update",
  "--delete",
  "--query"
};

/*
** Determine if another iteration of the test is required.  Return true
** if so.  Return zero if all iterations have finished.
*/
static int allLoop(
  int iMode,                /* The selected test mode */
  int *piLoopCnt,           /* Iteration loop counter */
  int *piMode2,             /* The test mode to use on the next iteration */
  int *pUseWithoutRowid     /* Whether or not to use --without-rowid */
){
  int i;
  if( iMode!=MODE_ALL ){
    if( *piLoopCnt ) return 0;
    *piMode2 = iMode;
    *piLoopCnt = 1;
    return 1;
  }
  if( (*piLoopCnt)>=MODE_COUNT*2 ) return 0;
  i = (*piLoopCnt)++;
  *pUseWithoutRowid = i&1;
  *piMode2 = i>>1;
  return 1;
}

int main(int argc, char **argv){
  const char *zFileToRead = 0;  /* Input file.  NULL for stdin */
  const char *zDbName = 0;      /* Name of the database file to create */
  int useWithoutRowid = 0;      /* True for --without-rowid */
  int iMode = MODE_INSERT;      /* One of MODE_xxxxx */
  int iMode2;                   /* Mode to use for current --all iteration */
  int iLoopCnt = 0;             /* Which iteration when running --all */
  int useNocase = 0;            /* True for --nocase */
  int doTrace = 0;              /* True for --trace */
  int showStats = 0;            /* True for --stats */
  int showSummary = 0;          /* True for --summary */
  int showTimer = 0;            /* True for --timer */
  int cacheSize = 0;            /* Desired cache size.  0 means default */
  int pageSize = 0;             /* Desired page size.  0 means default */
  int commitInterval = 0;       /* How often to commit.  0 means never */
  int noSync = 0;               /* True for --nosync */
  const char *zJMode = 0;       /* Journal mode */
  int nOp = 0;                  /* Operation counter */
  int i, j;                     /* Loop counters */
  sqlite3 *db;                  /* The SQLite database connection */
  char *zSql;                   /* Constructed SQL statement */
  sqlite3_stmt *pInsert = 0;    /* The INSERT statement */
  sqlite3_stmt *pUpdate = 0;    /* The UPDATE statement */
  sqlite3_stmt *pSelect = 0;    /* The SELECT statement */
  sqlite3_stmt *pDelete = 0;    /* The DELETE statement */
  FILE *in;                     /* The open input file */
  int rc;                       /* Return code from an SQLite interface */
  int iCur, iHiwtr;             /* Statistics values, current and "highwater" */
  FILE *pTimer = stderr;        /* Output channel for the timer */
  sqlite3_int64 sumCnt = 0;     /* Sum in QUERY mode */
  sqlite3_int64 startTime;      /* Time of start */
  sqlite3_int64 totalTime = 0;  /* Total time */
  char zInput[2000];            /* A single line of input */

  /* Process command-line arguments */
  for(i=1; i<argc; i++){
    const char *z = argv[i];
    if( z[0]=='-' ){
      do{ z++; }while( z[0]=='-' );
      if( strcmp(z,"without-rowid")==0 ){
        useWithoutRowid = 1;
      }else if( strcmp(z,"replace")==0 ){
        iMode = MODE_REPLACE;
      }else if( strcmp(z,"upsert")==0 ){
        iMode = MODE_UPSERT;
      }else if( strcmp(z,"select")==0 ){
        iMode = MODE_SELECT;
      }else if( strcmp(z,"insert")==0 ){
        iMode = MODE_INSERT;
      }else if( strcmp(z,"update")==0 ){
        iMode = MODE_UPDATE;
      }else if( strcmp(z,"delete")==0 ){
        iMode = MODE_DELETE;
      }else if( strcmp(z,"query")==0 ){
        iMode = MODE_QUERY;
      }else if( strcmp(z,"all")==0 ){
        iMode = MODE_ALL;
        showTimer = -99;
      }else if( strcmp(z,"nocase")==0 ){
        useNocase = 1;
      }else if( strcmp(z,"trace")==0 ){
        doTrace = 1;
      }else if( strcmp(z,"nosync")==0 ){
        noSync = 1;
      }else if( strcmp(z,"stats")==0 ){
        showStats = 1;
      }else if( strcmp(z,"summary")==0 ){
        showSummary = 1;
      }else if( strcmp(z,"timer")==0 ){
        showTimer = i;
      }else if( strcmp(z,"cachesize")==0 && i<argc-1 ){
        i++;
        cacheSize = atoi(argv[i]);
      }else if( strcmp(z,"pagesize")==0 && i<argc-1 ){
        i++;
        pageSize = atoi(argv[i]);
      }else if( strcmp(z,"commit")==0 && i<argc-1 ){
        i++;
        commitInterval = atoi(argv[i]);
      }else if( strcmp(z,"journal")==0 && i<argc-1 ){
        zJMode = argv[++i];
      }else if( strcmp(z,"tag")==0 && i<argc-1 ){
        zTag = argv[++i];
        pTimer = stdout;
      }else if( strcmp(z, "help")==0 || strcmp(z,"?")==0 ){
        usage();
      }else{
        fatal_error("unknown option: \"%s\"\n"
                    "Use --help for a list of options\n",
                    argv[i]);
      }
    }else if( zDbName==0 ){
      zDbName = argv[i];
    }else if( zFileToRead==0 ){
      zFileToRead = argv[i];
    }else{
      fatal_error("surplus argument: \"%s\"\n", argv[i]);
    }
  }
  if( zDbName==0 ){
    usage();
  }
  startTime = realTime();

  /* Open the database and the input file */
  if( zDbName[0] && strcmp(zDbName,":memory:")!=0 ){
    unlink(zDbName);
  }
  if( sqlite3_open(zDbName, &db) ){
    fatal_error("Cannot open database file: %s\n", zDbName);
  }
  if( zFileToRead ){
    in = fopen(zFileToRead, "rb");
    if( in==0 ){
      fatal_error("Could not open input file \"%s\"\n", zFileToRead);
    }
  }else{
    if( iMode==MODE_ALL ){
      fatal_error("The --all mode cannot be used with stdin\n");
    }
    in = stdin;
  }

  /* Set database connection options */
  if( doTrace ) sqlite3_trace(db, traceCallback, 0);
  if( pageSize ){
    zSql = sqlite3_mprintf("PRAGMA page_size=%d", pageSize);
    sqlite3_exec(db, zSql, 0, 0, 0);
    sqlite3_free(zSql);
  }
  if( cacheSize ){
    zSql = sqlite3_mprintf("PRAGMA cache_size=%d", cacheSize);
    sqlite3_exec(db, zSql, 0, 0, 0);
    sqlite3_free(zSql);
  }
  if( noSync ) sqlite3_exec(db, "PRAGMA synchronous=OFF", 0, 0, 0);
  if( zJMode ){
    zSql = sqlite3_mprintf("PRAGMA journal_mode=%s", zJMode);
    sqlite3_exec(db, zSql, 0, 0, 0);
    sqlite3_free(zSql);
  }

  iLoopCnt = 0;
  while( allLoop(iMode, &iLoopCnt, &iMode2, &useWithoutRowid) ){
    /* Delete prior content in --all mode */
    if( iMode==MODE_ALL ){
      if( sqlite3_exec(db, "DROP TABLE IF EXISTS wordcount; VACUUM;",0,0,0) ){
        fatal_error("Could not clean up prior iteration\n");
      }
      startTime = realTime();
      rewind(in);
    }
 
    /* Construct the "wordcount" table into which to put the words */
    if( sqlite3_exec(db, "BEGIN IMMEDIATE", 0, 0, 0) ){
      fatal_error("Could not start a transaction\n");
    }
    zSql = sqlite3_mprintf(
       "CREATE TABLE IF NOT EXISTS wordcount(\n"
       "  word TEXT PRIMARY KEY COLLATE %s,\n"
       "  cnt INTEGER\n"
       ")%s",
       useNocase ? "nocase" : "binary",
       useWithoutRowid ? " WITHOUT ROWID" : ""
    );
    if( zSql==0 ) fatal_error("out of memory\n");
    rc = sqlite3_exec(db, zSql, 0, 0, 0);
    if( rc ) fatal_error("Could not create the wordcount table: %s.\n",
                         sqlite3_errmsg(db));
    sqlite3_free(zSql);
  
    /* Prepare SQL statements that will be needed */
    if( iMode2==MODE_QUERY ){
      rc = sqlite3_prepare_v2(db,
            "SELECT cnt FROM wordcount WHERE word=?1",
            -1, &pSelect, 0);
      if( rc ) fatal_error("Could not prepare the SELECT statement: %s\n",
                            sqlite3_errmsg(db));
    }
    if( iMode2==MODE_SELECT ){
      rc = sqlite3_prepare_v2(db,
            "SELECT 1 FROM wordcount WHERE word=?1",
            -1, &pSelect, 0);
      if( rc ) fatal_error("Could not prepare the SELECT statement: %s\n",
                            sqlite3_errmsg(db));
      rc = sqlite3_prepare_v2(db,
            "INSERT INTO wordcount(word,cnt) VALUES(?1,1)",
            -1, &pInsert, 0);
      if( rc ) fatal_error("Could not prepare the INSERT statement: %s\n",
                           sqlite3_errmsg(db));
    }
    if( iMode2==MODE_SELECT || iMode2==MODE_UPDATE || iMode2==MODE_INSERT ){
      rc = sqlite3_prepare_v2(db,
            "UPDATE wordcount SET cnt=cnt+1 WHERE word=?1",
            -1, &pUpdate, 0);
      if( rc ) fatal_error("Could not prepare the UPDATE statement: %s\n",
                           sqlite3_errmsg(db));
    }
    if( iMode2==MODE_INSERT ){
      rc = sqlite3_prepare_v2(db,
            "INSERT OR IGNORE INTO wordcount(word,cnt) VALUES(?1,1)",
            -1, &pInsert, 0);
      if( rc ) fatal_error("Could not prepare the INSERT statement: %s\n",
                           sqlite3_errmsg(db));
    }
    if( iMode2==MODE_UPDATE ){
      rc = sqlite3_prepare_v2(db,
            "INSERT OR IGNORE INTO wordcount(word,cnt) VALUES(?1,0)",
            -1, &pInsert, 0);
      if( rc ) fatal_error("Could not prepare the INSERT statement: %s\n",
                           sqlite3_errmsg(db));
    }
    if( iMode2==MODE_REPLACE ){
      rc = sqlite3_prepare_v2(db,
          "REPLACE INTO wordcount(word,cnt)"
          "VALUES(?1,coalesce((SELECT cnt FROM wordcount WHERE word=?1),0)+1)",
          -1, &pInsert, 0);
      if( rc ) fatal_error("Could not prepare the REPLACE statement: %s\n",
                            sqlite3_errmsg(db));
    }
    if( iMode2==MODE_UPSERT ){
      rc = sqlite3_prepare_v2(db,
          "INSERT INTO wordcount(word,cnt) VALUES(?1,1) "
          "ON CONFLICT(word) DO UPDATE SET cnt=cnt+1",
          -1, &pInsert, 0);
      if( rc ) fatal_error("Could not prepare the UPSERT statement: %s\n",
                            sqlite3_errmsg(db));
    }
    if( iMode2==MODE_DELETE ){
      rc = sqlite3_prepare_v2(db,
            "DELETE FROM wordcount WHERE word=?1",
            -1, &pDelete, 0);
      if( rc ) fatal_error("Could not prepare the DELETE statement: %s\n",
                           sqlite3_errmsg(db));
    }
  
    /* Process the input file */
    while( fgets(zInput, sizeof(zInput), in) ){
      for(i=0; zInput[i]; i++){
        if( !ISALPHA(zInput[i]) ) continue;
        for(j=i+1; ISALPHA(zInput[j]); j++){}
  
        /* Found a new word at zInput[i] that is j-i bytes long. 
        ** Process it into the wordcount table.  */
        if( iMode2==MODE_DELETE ){
          sqlite3_bind_text(pDelete, 1, zInput+i, j-i, SQLITE_STATIC);
          if( sqlite3_step(pDelete)!=SQLITE_DONE ){
            fatal_error("DELETE failed: %s\n", sqlite3_errmsg(db));
          }
          sqlite3_reset(pDelete);
        }else if( iMode2==MODE_SELECT ){
          sqlite3_bind_text(pSelect, 1, zInput+i, j-i, SQLITE_STATIC);
          rc = sqlite3_step(pSelect);
          sqlite3_reset(pSelect);
          if( rc==SQLITE_ROW ){
            sqlite3_bind_text(pUpdate, 1, zInput+i, j-i, SQLITE_STATIC);
            if( sqlite3_step(pUpdate)!=SQLITE_DONE ){
              fatal_error("UPDATE failed: %s\n", sqlite3_errmsg(db));
            }
            sqlite3_reset(pUpdate);
          }else if( rc==SQLITE_DONE ){
            sqlite3_bind_text(pInsert, 1, zInput+i, j-i, SQLITE_STATIC);
            if( sqlite3_step(pInsert)!=SQLITE_DONE ){
              fatal_error("Insert failed: %s\n", sqlite3_errmsg(db));
            }
            sqlite3_reset(pInsert);
          }else{
            fatal_error("SELECT failed: %s\n", sqlite3_errmsg(db));
          }
        }else if( iMode2==MODE_QUERY ){
          sqlite3_bind_text(pSelect, 1, zInput+i, j-i, SQLITE_STATIC);
          if( sqlite3_step(pSelect)==SQLITE_ROW ){
            sumCnt += sqlite3_column_int64(pSelect, 0);
          }
          sqlite3_reset(pSelect);
        }else{
          sqlite3_bind_text(pInsert, 1, zInput+i, j-i, SQLITE_STATIC);
          if( sqlite3_step(pInsert)!=SQLITE_DONE ){
            fatal_error("INSERT failed: %s\n", sqlite3_errmsg(db));
          }
          sqlite3_reset(pInsert);
          if( iMode2==MODE_UPDATE
           || (iMode2==MODE_INSERT && sqlite3_changes(db)==0)
          ){
            sqlite3_bind_text(pUpdate, 1, zInput+i, j-i, SQLITE_STATIC);
            if( sqlite3_step(pUpdate)!=SQLITE_DONE ){
              fatal_error("UPDATE failed: %s\n", sqlite3_errmsg(db));
            }
            sqlite3_reset(pUpdate);
          }
        }
        i = j-1;
  
        /* Increment the operation counter.  Do a COMMIT if it is time. */
        nOp++;
        if( commitInterval>0 && (nOp%commitInterval)==0 ){
          sqlite3_exec(db, "COMMIT; BEGIN IMMEDIATE", 0, 0, 0);
        }
      }
    }
    sqlite3_exec(db, "COMMIT", 0, 0, 0);
    sqlite3_finalize(pInsert);  pInsert = 0;
    sqlite3_finalize(pUpdate);  pUpdate = 0;
    sqlite3_finalize(pSelect);  pSelect = 0;
    sqlite3_finalize(pDelete);  pDelete = 0;
  
    if( iMode2==MODE_QUERY && iMode!=MODE_ALL ){
      printf("%s sum of cnt: %lld\n", zTag, sumCnt);
      rc = sqlite3_prepare_v2(db,"SELECT sum(cnt*cnt) FROM wordcount", -1,
                              &pSelect, 0);
      if( rc==SQLITE_OK && sqlite3_step(pSelect)==SQLITE_ROW ){
        printf("%s double-check: %lld\n", zTag,sqlite3_column_int64(pSelect,0));
      }
      sqlite3_finalize(pSelect);
    }
  
  
    if( showTimer ){
      sqlite3_int64 elapseTime = realTime() - startTime;
      totalTime += elapseTime;
      fprintf(pTimer, "%3d.%03d wordcount", (int)(elapseTime/1000),
                                   (int)(elapseTime%1000));
      if( iMode==MODE_ALL ){
        fprintf(pTimer, " %s%s\n", azMode[iMode2],
                useWithoutRowid? " --without-rowid" : "");
      }else{
        for(i=1; i<argc; i++) if( i!=showTimer ) fprintf(pTimer," %s",argv[i]);
        fprintf(pTimer, "\n");
      }
    }
  
    if( showSummary ){
      sqlite3_create_function(db, "checksum", -1, SQLITE_UTF8, 0,
                              0, checksumStep, checksumFinalize);
      sqlite3_exec(db, 
        "SELECT 'count(*):  ', count(*) FROM wordcount;\n"
        "SELECT 'sum(cnt):  ', sum(cnt) FROM wordcount;\n"
        "SELECT 'max(cnt):  ', max(cnt) FROM wordcount;\n"
        "SELECT 'avg(cnt):  ', avg(cnt) FROM wordcount;\n"
        "SELECT 'sum(cnt=1):', sum(cnt=1) FROM wordcount;\n"
        "SELECT 'top 10:    ', group_concat(word, ', ') FROM "
           "(SELECT word FROM wordcount ORDER BY cnt DESC, word LIMIT 10);\n"
        "SELECT 'checksum:  ', checksum(word, cnt) FROM "
           "(SELECT word, cnt FROM wordcount ORDER BY word);\n"
        "PRAGMA integrity_check;\n",
        printResult, 0, 0);
    }
  } /* End the --all loop */

  /* Close the input file after the last read */
  if( zFileToRead ) fclose(in);

  /* In --all mode, so the total time */
  if( iMode==MODE_ALL && showTimer ){
    fprintf(pTimer, "%3d.%03d wordcount --all\n", (int)(totalTime/1000),
                                   (int)(totalTime%1000));
  }
  
  /* Database connection statistics printed after both prepared statements
  ** have been finalized */
  if( showStats ){
    sqlite3_db_status(db, SQLITE_DBSTATUS_LOOKASIDE_USED, &iCur, &iHiwtr, 0);
    printf("%s Lookaside Slots Used:        %d (max %d)\n", zTag, iCur,iHiwtr);
    sqlite3_db_status(db, SQLITE_DBSTATUS_LOOKASIDE_HIT, &iCur, &iHiwtr, 0);
    printf("%s Successful lookasides:       %d\n", zTag, iHiwtr);
    sqlite3_db_status(db, SQLITE_DBSTATUS_LOOKASIDE_MISS_SIZE, &iCur,&iHiwtr,0);
    printf("%s Lookaside size faults:       %d\n", zTag, iHiwtr);
    sqlite3_db_status(db, SQLITE_DBSTATUS_LOOKASIDE_MISS_FULL, &iCur,&iHiwtr,0);
    printf("%s Lookaside OOM faults:        %d\n", zTag, iHiwtr);
    sqlite3_db_status(db, SQLITE_DBSTATUS_CACHE_USED, &iCur, &iHiwtr, 0);
    printf("%s Pager Heap Usage:            %d bytes\n", zTag, iCur);
    sqlite3_db_status(db, SQLITE_DBSTATUS_CACHE_HIT, &iCur, &iHiwtr, 1);
    printf("%s Page cache hits:             %d\n", zTag, iCur);
    sqlite3_db_status(db, SQLITE_DBSTATUS_CACHE_MISS, &iCur, &iHiwtr, 1);
    printf("%s Page cache misses:           %d\n", zTag, iCur); 
    sqlite3_db_status(db, SQLITE_DBSTATUS_CACHE_WRITE, &iCur, &iHiwtr, 1);
    printf("%s Page cache writes:           %d\n", zTag, iCur); 
    sqlite3_db_status(db, SQLITE_DBSTATUS_SCHEMA_USED, &iCur, &iHiwtr, 0);
    printf("%s Schema Heap Usage:           %d bytes\n", zTag, iCur); 
    sqlite3_db_status(db, SQLITE_DBSTATUS_STMT_USED, &iCur, &iHiwtr, 0);
    printf("%s Statement Heap Usage:        %d bytes\n", zTag, iCur); 
  }

  sqlite3_close(db);

  /* Global memory usage statistics printed after the database connection
  ** has closed.  Memory usage should be zero at this point. */
  if( showStats ){
    sqlite3_status(SQLITE_STATUS_MEMORY_USED, &iCur, &iHiwtr, 0);
    printf("%s Memory Used (bytes):         %d (max %d)\n", zTag,iCur,iHiwtr);
    sqlite3_status(SQLITE_STATUS_MALLOC_COUNT, &iCur, &iHiwtr, 0);
    printf("%s Outstanding Allocations:     %d (max %d)\n",zTag,iCur,iHiwtr);
    sqlite3_status(SQLITE_STATUS_PAGECACHE_OVERFLOW, &iCur, &iHiwtr, 0);
    printf("%s Pcache Overflow Bytes:       %d (max %d)\n",zTag,iCur,iHiwtr);
    sqlite3_status(SQLITE_STATUS_MALLOC_SIZE, &iCur, &iHiwtr, 0);
    printf("%s Largest Allocation:          %d bytes\n",zTag,iHiwtr);
    sqlite3_status(SQLITE_STATUS_PAGECACHE_SIZE, &iCur, &iHiwtr, 0);
    printf("%s Largest Pcache Allocation:   %d bytes\n",zTag,iHiwtr);
  }
  return 0;
}
