/*
** This program is a debugging and analysis utility that displays
** information about an FTS3 or FTS4 index.
**
** Link this program against the SQLite3 amalgamation with the
** SQLITE_ENABLE_FTS4 compile-time option.  Then run it as:
**
**    fts3view DATABASE
**
** to get a list of all FTS3/4 tables in DATABASE, or do
**
**    fts3view DATABASE TABLE COMMAND ....
**
** to see various aspects of the TABLE table.  Type fts3view with no
** arguments for a list of available COMMANDs.
*/
#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "sqlite3.h"

/*
** Extra command-line arguments:
*/
int nExtra;
char **azExtra;

/*
** Look for a command-line argument.
*/
const char *findOption(const char *zName, int hasArg, const char *zDefault){
  int i;
  const char *zResult = zDefault;
  for(i=0; i<nExtra; i++){
    const char *z = azExtra[i];
    while( z[0]=='-' ) z++;
    if( strcmp(z, zName)==0 ){
      int j = 1;
      if( hasArg==0 || i==nExtra-1 ) j = 0;
      zResult = azExtra[i+j];
      while( i+j<nExtra ){
        azExtra[i] = azExtra[i+j+1];
        i++;
      }
      break;
    }
  }
  return zResult;       
}


/*
** Prepare an SQL query
*/
static sqlite3_stmt *prepare(sqlite3 *db, const char *zFormat, ...){
  va_list ap;
  char *zSql;
  sqlite3_stmt *pStmt;
  int rc;

  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
  rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
  if( rc ){
    fprintf(stderr, "Error: %s\nSQL: %s\n", sqlite3_errmsg(db), zSql);
    exit(1);
  }
  sqlite3_free(zSql);
  return pStmt;
}

/*
** Run an SQL statement
*/
static int runSql(sqlite3 *db, const char *zFormat, ...){
  va_list ap;
  char *zSql;
  int rc;

  va_start(ap, zFormat);
  zSql = sqlite3_vmprintf(zFormat, ap);
  rc = sqlite3_exec(db, zSql, 0, 0, 0);
  va_end(ap);
  return rc;
}

/*
** Show the table schema
*/
static void showSchema(sqlite3 *db, const char *zTab){
  sqlite3_stmt *pStmt;
  pStmt = prepare(db,
            "SELECT sql FROM sqlite_schema"
            " WHERE name LIKE '%q%%'"
            " ORDER BY 1",
            zTab);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    printf("%s;\n", sqlite3_column_text(pStmt, 0));
  }
  sqlite3_finalize(pStmt);
  pStmt = prepare(db, "PRAGMA page_size");
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    printf("PRAGMA page_size=%s;\n", sqlite3_column_text(pStmt, 0));
  }
  sqlite3_finalize(pStmt);
  pStmt = prepare(db, "PRAGMA journal_mode");
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    printf("PRAGMA journal_mode=%s;\n", sqlite3_column_text(pStmt, 0));
  }
  sqlite3_finalize(pStmt);
  pStmt = prepare(db, "PRAGMA auto_vacuum");
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    const char *zType = "???";
    switch( sqlite3_column_int(pStmt, 0) ){
      case 0:  zType = "OFF";         break;
      case 1:  zType = "FULL";        break;
      case 2:  zType = "INCREMENTAL"; break;
    }
    printf("PRAGMA auto_vacuum=%s;\n", zType);
  }
  sqlite3_finalize(pStmt);
  pStmt = prepare(db, "PRAGMA encoding");
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    printf("PRAGMA encoding=%s;\n", sqlite3_column_text(pStmt, 0));
  }
  sqlite3_finalize(pStmt);
}

/* 
** Read a 64-bit variable-length integer from memory starting at p[0].
** Return the number of bytes read, or 0 on error.
** The value is stored in *v.
*/
int getVarint(const unsigned char *p, sqlite_int64 *v){
  const unsigned char *q = p;
  sqlite_uint64 x = 0, y = 1;
  while( (*q&0x80)==0x80 && q-(unsigned char *)p<9 ){
    x += y * (*q++ & 0x7f);
    y <<= 7;
  }
  x += y * (*q++);
  *v = (sqlite_int64) x;
  return (int) (q - (unsigned char *)p);
}


/* Show the content of the %_stat table
*/
static void showStat(sqlite3 *db, const char *zTab){
  sqlite3_stmt *pStmt;
  pStmt = prepare(db, "SELECT id, value FROM '%q_stat'", zTab);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    printf("stat[%d] =", sqlite3_column_int(pStmt, 0));
    switch( sqlite3_column_type(pStmt, 1) ){
      case SQLITE_INTEGER: {
        printf(" %d\n", sqlite3_column_int(pStmt, 1));
        break;
      }
      case SQLITE_BLOB: {
        unsigned char *x = (unsigned char*)sqlite3_column_blob(pStmt, 1);
        int len = sqlite3_column_bytes(pStmt, 1);
        int i = 0;
        sqlite3_int64 v;
        while( i<len ){
          i += getVarint(x, &v);
          printf(" %lld", v);
        }
        printf("\n");
        break;
      }
    }
  }
  sqlite3_finalize(pStmt);
}

/*
** Report on the vocabulary.  This creates an fts4aux table with a random
** name, but deletes it in the end.
*/
static void showVocabulary(sqlite3 *db, const char *zTab){
  char *zAux;
  sqlite3_uint64 r;
  sqlite3_stmt *pStmt;
  int nDoc = 0;
  int nToken = 0;
  int nOccurrence = 0;
  int nTop;
  int n, i;

  sqlite3_randomness(sizeof(r), &r);
  zAux = sqlite3_mprintf("viewer_%llx", zTab, r);
  runSql(db, "BEGIN");
  pStmt = prepare(db, "SELECT count(*) FROM %Q", zTab);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    nDoc = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);
  printf("Number of documents...................... %9d\n", nDoc);

  runSql(db, "CREATE VIRTUAL TABLE %s USING fts4aux(%Q)", zAux, zTab);
  pStmt = prepare(db, 
             "SELECT count(*), sum(occurrences) FROM %s WHERE col='*'",
             zAux);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    nToken = sqlite3_column_int(pStmt, 0);
    nOccurrence = sqlite3_column_int(pStmt, 1);
  }
  sqlite3_finalize(pStmt);
  printf("Total tokens in all documents............ %9d\n", nOccurrence);
  printf("Total number of distinct tokens.......... %9d\n", nToken);
  if( nToken==0 ) goto end_vocab;

  n = 0;
  pStmt = prepare(db, "SELECT count(*) FROM %s"
                      " WHERE col='*' AND occurrences==1", zAux);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    n = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);
  printf("Tokens used exactly once................. %9d %5.2f%%\n",
          n, n*100.0/nToken);

  n = 0;
  pStmt = prepare(db, "SELECT count(*) FROM %s"
                      " WHERE col='*' AND documents==1", zAux);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    n = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);
  printf("Tokens used in only one document......... %9d %5.2f%%\n",
          n, n*100.0/nToken);

  if( nDoc>=2000 ){
    n = 0;
    pStmt = prepare(db, "SELECT count(*) FROM %s"
                        " WHERE col='*' AND occurrences<=%d", zAux, nDoc/1000);
    while( sqlite3_step(pStmt)==SQLITE_ROW ){
      n = sqlite3_column_int(pStmt, 0);
    }
    sqlite3_finalize(pStmt);
    printf("Tokens used in 0.1%% or less of docs...... %9d %5.2f%%\n",
            n, n*100.0/nToken);
  }

  if( nDoc>=200 ){
    n = 0;
    pStmt = prepare(db, "SELECT count(*) FROM %s"
                        " WHERE col='*' AND occurrences<=%d", zAux, nDoc/100);
    while( sqlite3_step(pStmt)==SQLITE_ROW ){
      n = sqlite3_column_int(pStmt, 0);
    }
    sqlite3_finalize(pStmt);
    printf("Tokens used in 1%% or less of docs........ %9d %5.2f%%\n",
            n, n*100.0/nToken);
  }

  nTop = atoi(findOption("top", 1, "25"));
  printf("The %d most common tokens:\n", nTop);
  pStmt = prepare(db,
            "SELECT term, documents FROM %s"
            " WHERE col='*'"
            " ORDER BY documents DESC, term"
            " LIMIT %d", zAux, nTop);
  i = 0;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    i++;
    n = sqlite3_column_int(pStmt, 1);
    printf("  %2d. %-30s %9d docs %5.2f%%\n", i,
      sqlite3_column_text(pStmt, 0), n, n*100.0/nDoc);
  }
  sqlite3_finalize(pStmt);

end_vocab:
  runSql(db, "ROLLBACK");
  sqlite3_free(zAux);
}

/*
** Report on the number and sizes of segments
*/
static void showSegmentStats(sqlite3 *db, const char *zTab){
  sqlite3_stmt *pStmt;
  int nSeg = 0;
  sqlite3_int64 szSeg = 0, mxSeg = 0;
  int nIdx = 0;
  sqlite3_int64 szIdx = 0, mxIdx = 0;
  int nRoot = 0;
  sqlite3_int64 szRoot = 0, mxRoot = 0;
  sqlite3_int64 mx;
  int nLeaf;
  int n;
  int pgsz;
  int mxLevel;
  int i;

  pStmt = prepare(db,
                  "SELECT count(*), sum(length(block)), max(length(block))"
                  " FROM '%q_segments'",
                  zTab);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    nSeg = sqlite3_column_int(pStmt, 0);
    szSeg = sqlite3_column_int64(pStmt, 1);
    mxSeg = sqlite3_column_int64(pStmt, 2);
  }
  sqlite3_finalize(pStmt);
  pStmt = prepare(db,
            "SELECT count(*), sum(length(block)), max(length(block))"
            "  FROM '%q_segments' a JOIN '%q_segdir' b"
            " WHERE a.blockid BETWEEN b.leaves_end_block+1 AND b.end_block",
            zTab, zTab);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    nIdx = sqlite3_column_int(pStmt, 0);
    szIdx = sqlite3_column_int64(pStmt, 1);
    mxIdx = sqlite3_column_int64(pStmt, 2);
  }
  sqlite3_finalize(pStmt);
  pStmt = prepare(db,
            "SELECT count(*), sum(length(root)), max(length(root))"
            "  FROM '%q_segdir'",
            zTab);
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    nRoot = sqlite3_column_int(pStmt, 0);
    szRoot = sqlite3_column_int64(pStmt, 1);
    mxRoot = sqlite3_column_int64(pStmt, 2);
  }
  sqlite3_finalize(pStmt);

  printf("Number of segments....................... %9d\n", nSeg+nRoot);
  printf("Number of leaf segments.................. %9d\n", nSeg-nIdx);
  printf("Number of index segments................. %9d\n", nIdx);
  printf("Number of root segments.................. %9d\n", nRoot);
  printf("Total size of all segments............... %9lld\n", szSeg+szRoot);
  printf("Total size of all leaf segments.......... %9lld\n", szSeg-szIdx);
  printf("Total size of all index segments......... %9lld\n", szIdx);
  printf("Total size of all root segments.......... %9lld\n", szRoot);
  if( nSeg>0 ){
    printf("Average size of all segments............. %11.1f\n",
            (double)(szSeg+szRoot)/(double)(nSeg+nRoot));
    printf("Average size of leaf segments............ %11.1f\n",
            (double)(szSeg-szIdx)/(double)(nSeg-nIdx));
  }
  if( nIdx>0 ){
    printf("Average size of index segments........... %11.1f\n",
            (double)szIdx/(double)nIdx);
  }
  if( nRoot>0 ){
    printf("Average size of root segments............ %11.1f\n",
            (double)szRoot/(double)nRoot);
  }
  mx = mxSeg;
  if( mx<mxRoot ) mx = mxRoot;
  printf("Maximum segment size..................... %9lld\n", mx);
  printf("Maximum index segment size............... %9lld\n", mxIdx);
  printf("Maximum root segment size................ %9lld\n", mxRoot);

  pStmt = prepare(db, "PRAGMA page_size");
  pgsz = 1024;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    pgsz = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);
  printf("Database page size....................... %9d\n", pgsz);
  pStmt = prepare(db,
            "SELECT count(*)"
            "  FROM '%q_segments' a JOIN '%q_segdir' b"
            " WHERE a.blockid BETWEEN b.start_block AND b.leaves_end_block"
            "   AND length(a.block)>%d",
            zTab, zTab, pgsz-45);
  n = 0;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    n = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);
  nLeaf = nSeg - nIdx;
  printf("Leaf segments larger than %5d bytes.... %9d   %5.2f%%\n",
         pgsz-45, n, nLeaf>0 ? n*100.0/nLeaf : 0.0);

  pStmt = prepare(db, "SELECT max(level%%1024) FROM '%q_segdir'", zTab);
  mxLevel = 0;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    mxLevel = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);

  for(i=0; i<=mxLevel; i++){
    pStmt = prepare(db,
           "SELECT count(*), sum(len), avg(len), max(len), sum(len>%d),"
           "       count(distinct idx)"
           "  FROM (SELECT length(a.block) AS len, idx"
           "          FROM '%q_segments' a JOIN '%q_segdir' b"
           "         WHERE (a.blockid BETWEEN b.start_block"
                                       " AND b.leaves_end_block)"
           "           AND (b.level%%1024)==%d)",
           pgsz-45, zTab, zTab, i);
    if( sqlite3_step(pStmt)==SQLITE_ROW
     && (nLeaf = sqlite3_column_int(pStmt, 0))>0
    ){
      sqlite3_int64 sz;
      nIdx = sqlite3_column_int(pStmt, 5);
      printf("For level %d:\n", i);
      printf("  Number of indexes...................... %9d\n", nIdx);
      printf("  Number of leaf segments................ %9d\n", nLeaf);
      if( nIdx>1 ){
        printf("  Average leaf segments per index........ %11.1f\n",
               (double)nLeaf/(double)nIdx);
      }
      printf("  Total size of all leaf segments........ %9lld\n",
             (sz = sqlite3_column_int64(pStmt, 1)));
      printf("  Average size of leaf segments.......... %11.1f\n",
             sqlite3_column_double(pStmt, 2));
      if( nIdx>1 ){
        printf("  Average leaf segment size per index.... %11.1f\n",
               (double)sz/(double)nIdx);
      }
      printf("  Maximum leaf segment size.............. %9lld\n",
             sqlite3_column_int64(pStmt, 3));
      n = sqlite3_column_int(pStmt, 4);
      printf("  Leaf segments larger than %5d bytes.. %9d   %5.2f%%\n",
             pgsz-45, n, n*100.0/nLeaf);
    }
    sqlite3_finalize(pStmt);
  }
}

/*
** Print a single "tree" line of the segdir map output.
*/
static void printTreeLine(sqlite3_int64 iLower, sqlite3_int64 iUpper){
  printf("                 tree   %9lld", iLower);
  if( iUpper>iLower ){
    printf(" thru %9lld  (%lld blocks)", iUpper, iUpper-iLower+1);
  }
  printf("\n");
}

/*
** Check to see if the block of a %_segments entry is NULL.
*/
static int isNullSegment(sqlite3 *db, const char *zTab, sqlite3_int64 iBlockId){
  sqlite3_stmt *pStmt;
  int rc = 1;

  pStmt = prepare(db, "SELECT block IS NULL FROM '%q_segments'"
                      " WHERE blockid=%lld", zTab, iBlockId);
  if( sqlite3_step(pStmt)==SQLITE_ROW ){
    rc = sqlite3_column_int(pStmt, 0);
  }
  sqlite3_finalize(pStmt);
  return rc;
}

/*
** Show a map of segments derived from the %_segdir table.
*/
static void showSegdirMap(sqlite3 *db, const char *zTab){
  int mxIndex, iIndex;
  sqlite3_stmt *pStmt = 0;
  sqlite3_stmt *pStmt2 = 0;
  int prevLevel;

  pStmt = prepare(db, "SELECT max(level/1024) FROM '%q_segdir'", zTab);
  if( sqlite3_step(pStmt)==SQLITE_ROW ){
    mxIndex = sqlite3_column_int(pStmt, 0);
  }else{
    mxIndex = 0;
  }
  sqlite3_finalize(pStmt);

  printf("Number of inverted indices............... %3d\n", mxIndex+1);
  pStmt = prepare(db,
    "SELECT level, idx, start_block, leaves_end_block, end_block, rowid"
    "  FROM '%q_segdir'"
    " WHERE level/1024==?"
    " ORDER BY level DESC, idx",
    zTab);
  pStmt2 = prepare(db,
    "SELECT blockid FROM '%q_segments'"
    " WHERE blockid BETWEEN ? AND ? ORDER BY blockid",
    zTab);
  for(iIndex=0; iIndex<=mxIndex; iIndex++){
    if( mxIndex>0 ){
      printf("**************************** Index %d "
             "****************************\n", iIndex);
    }
    sqlite3_bind_int(pStmt, 1, iIndex);
    prevLevel = -1;
    while( sqlite3_step(pStmt)==SQLITE_ROW ){
      int iLevel = sqlite3_column_int(pStmt, 0)%1024;
      int iIdx = sqlite3_column_int(pStmt, 1);
      sqlite3_int64 iStart = sqlite3_column_int64(pStmt, 2);
      sqlite3_int64 iLEnd = sqlite3_column_int64(pStmt, 3);
      sqlite3_int64 iEnd = sqlite3_column_int64(pStmt, 4);
      char rtag[20];
      if( iLevel!=prevLevel ){
        printf("level %2d idx %2d", iLevel, iIdx);
        prevLevel = iLevel;
      }else{
        printf("         idx %2d", iIdx);
      }
      sqlite3_snprintf(sizeof(rtag), rtag, "r%lld",
                       sqlite3_column_int64(pStmt,5));
      printf("  root   %9s\n", rtag);
      if( iLEnd>iStart ){
        sqlite3_int64 iLower, iPrev = 0, iX;
        if( iLEnd+1<=iEnd ){
          sqlite3_bind_int64(pStmt2, 1, iLEnd+1);
          sqlite3_bind_int64(pStmt2, 2, iEnd);
          iLower = -1;        
          while( sqlite3_step(pStmt2)==SQLITE_ROW ){
            iX = sqlite3_column_int64(pStmt2, 0);
            if( iLower<0 ){
              iLower = iPrev = iX;
            }else if( iX==iPrev+1 ){
              iPrev = iX;
            }else{
              printTreeLine(iLower, iPrev);
              iLower = iPrev = iX;
            }
          }
          sqlite3_reset(pStmt2);
          if( iLower>=0 ){
            if( iLower==iPrev && iLower==iEnd
             && isNullSegment(db,zTab,iLower)
            ){
              printf("                 null   %9lld\n", iLower);
            }else{
              printTreeLine(iLower, iPrev);
            }
          }
        }
        printf("                 leaves %9lld thru %9lld  (%lld blocks)\n",
               iStart, iLEnd, iLEnd - iStart + 1);
      }
    }
    sqlite3_reset(pStmt);
  }
  sqlite3_finalize(pStmt);
  sqlite3_finalize(pStmt2);
}

/*
** Decode a single segment block and display the results on stdout.
*/
static void decodeSegment(
  const unsigned char *aData,   /* Content to print */
  int nData                     /* Number of bytes of content */
){
  sqlite3_int64 iChild = 0;
  sqlite3_int64 iPrefix;
  sqlite3_int64 nTerm;
  sqlite3_int64 n;
  sqlite3_int64 iDocsz;
  int iHeight;
  sqlite3_int64 i = 0;
  int cnt = 0;
  char zTerm[1000];

  i += getVarint(aData, &n);
  iHeight = (int)n;
  printf("height: %d\n", iHeight);
  if( iHeight>0 ){
    i += getVarint(aData+i, &iChild);
    printf("left-child: %lld\n", iChild);
  }
  while( i<nData ){
    if( (cnt++)>0 ){
      i += getVarint(aData+i, &iPrefix);
    }else{
      iPrefix = 0;
    }
    i += getVarint(aData+i, &nTerm);
    if( iPrefix+nTerm+1 >= sizeof(zTerm) ){
      fprintf(stderr, "term to long\n");
      exit(1);
    }
    memcpy(zTerm+iPrefix, aData+i, (size_t)nTerm);
    zTerm[iPrefix+nTerm] = 0;
    i += nTerm;
    if( iHeight==0 ){
      i += getVarint(aData+i, &iDocsz);
      printf("term: %-25s doclist %7lld bytes offset %lld\n", zTerm, iDocsz, i);
      i += iDocsz;
    }else{
      printf("term: %-25s child %lld\n", zTerm, ++iChild);
    }
  }
}
  
  
/*
** Print a a blob as hex and ascii.
*/
static void printBlob(
  const unsigned char *aData,   /* Content to print */
  int nData                     /* Number of bytes of content */
){
  int i, j;
  const char *zOfstFmt;
  const int perLine = 16;

  if( (nData&~0xfff)==0 ){
    zOfstFmt = " %03x: ";
  }else if( (nData&~0xffff)==0 ){
    zOfstFmt = " %04x: ";
  }else if( (nData&~0xfffff)==0 ){
    zOfstFmt = " %05x: ";
  }else if( (nData&~0xffffff)==0 ){
    zOfstFmt = " %06x: ";
  }else{
    zOfstFmt = " %08x: ";
  }

  for(i=0; i<nData; i += perLine){
    fprintf(stdout, zOfstFmt, i);
    for(j=0; j<perLine; j++){
      if( i+j>nData ){
        fprintf(stdout, "   ");
      }else{
        fprintf(stdout,"%02x ", aData[i+j]);
      }
    }
    for(j=0; j<perLine; j++){
      if( i+j>nData ){
        fprintf(stdout, " ");
      }else{
        fprintf(stdout,"%c", isprint(aData[i+j]) ? aData[i+j] : '.');
      }
    }
    fprintf(stdout,"\n");
  }
}

/*
** Convert text to a 64-bit integer
*/
static sqlite3_int64 atoi64(const char *z){
  sqlite3_int64 v = 0;
  while( z[0]>='0' && z[0]<='9' ){
     v = v*10 + z[0] - '0';
     z++;
  }
  return v;
}

/*
** Return a prepared statement which, when stepped, will return in its
** first column the blob associated with segment zId.  If zId begins with
** 'r' then it is a rowid of a %_segdir entry.  Otherwise it is a
** %_segment entry.
*/
static sqlite3_stmt *prepareToGetSegment(
  sqlite3 *db,         /* The database */
  const char *zTab,    /* The FTS3/4 table name */
  const char *zId      /* ID of the segment to open */
){
  sqlite3_stmt *pStmt;
  if( zId[0]=='r' ){
    pStmt = prepare(db, "SELECT root FROM '%q_segdir' WHERE rowid=%lld",
                    zTab, atoi64(zId+1));
  }else{
    pStmt = prepare(db, "SELECT block FROM '%q_segments' WHERE blockid=%lld",
                    zTab, atoi64(zId));
  }
  return pStmt;
}

/*
** Print the content of a segment or of the root of a segdir.  The segment
** or root is identified by azExtra[0].  If the first character of azExtra[0]
** is 'r' then the remainder is the integer rowid of the %_segdir entry.
** If the first character of azExtra[0] is not 'r' then, then all of
** azExtra[0] is an integer which is the block number.
**
** If the --raw option is present in azExtra, then a hex dump is provided.
** Otherwise a decoding is shown.
*/
static void showSegment(sqlite3 *db, const char *zTab){
  const unsigned char *aData;
  int nData;
  sqlite3_stmt *pStmt;

  pStmt = prepareToGetSegment(db, zTab, azExtra[0]);
  if( sqlite3_step(pStmt)!=SQLITE_ROW ){
    sqlite3_finalize(pStmt);
    return;
  }
  nData = sqlite3_column_bytes(pStmt, 0);
  aData = sqlite3_column_blob(pStmt, 0);
  printf("Segment %s of size %d bytes:\n", azExtra[0], nData);
  if( findOption("raw", 0, 0)!=0 ){
    printBlob(aData, nData);
  }else{
    decodeSegment(aData, nData);
  }
  sqlite3_finalize(pStmt);
}

/*
** Decode a single doclist and display the results on stdout.
*/
static void decodeDoclist(
  const unsigned char *aData,   /* Content to print */
  int nData                     /* Number of bytes of content */
){
  sqlite3_int64 iPrevDocid = 0;
  sqlite3_int64 iDocid;
  sqlite3_int64 iPos;
  sqlite3_int64 iPrevPos = 0;
  sqlite3_int64 iCol;
  int i = 0;

  while( i<nData ){
    i += getVarint(aData+i, &iDocid);
    printf("docid %lld col0", iDocid+iPrevDocid);
    iPrevDocid += iDocid;
    iPrevPos = 0;
    while( 1 ){
      i += getVarint(aData+i, &iPos);
      if( iPos==1 ){
        i += getVarint(aData+i, &iCol);
        printf(" col%lld", iCol);
        iPrevPos = 0;
      }else if( iPos==0 ){
        printf("\n");
        break;
      }else{
        iPrevPos += iPos - 2;
        printf(" %lld", iPrevPos);
      }
    }
  }
}
  

/*
** Print the content of a doclist.  The segment or segdir-root is
** identified by azExtra[0].  If the first character of azExtra[0]
** is 'r' then the remainder is the integer rowid of the %_segdir entry.
** If the first character of azExtra[0] is not 'r' then, then all of
** azExtra[0] is an integer which is the block number.  The offset
** into the segment is identified by azExtra[1].  The size of the doclist
** is azExtra[2].
**
** If the --raw option is present in azExtra, then a hex dump is provided.
** Otherwise a decoding is shown.
*/
static void showDoclist(sqlite3 *db, const char *zTab){
  const unsigned char *aData;
  sqlite3_int64 offset;
  int nData;
  sqlite3_stmt *pStmt;

  offset = atoi64(azExtra[1]);
  nData = atoi(azExtra[2]);
  pStmt = prepareToGetSegment(db, zTab, azExtra[0]);
  if( sqlite3_step(pStmt)!=SQLITE_ROW ){
    sqlite3_finalize(pStmt);
    return;
  }
  aData = sqlite3_column_blob(pStmt, 0);
  printf("Doclist at %s offset %lld of size %d bytes:\n",
         azExtra[0], offset, nData);
  if( findOption("raw", 0, 0)!=0 ){
    printBlob(aData+offset, nData);
  }else{
    decodeDoclist(aData+offset, nData);
  }
  sqlite3_finalize(pStmt);
}

/*
** Show the top N largest segments
*/
static void listBigSegments(sqlite3 *db, const char *zTab){
  int nTop, i;
  sqlite3_stmt *pStmt;
  sqlite3_int64 sz;
  sqlite3_int64 id;

  nTop = atoi(findOption("top", 1, "25"));
  printf("The %d largest segments:\n", nTop);
  pStmt = prepare(db,
            "SELECT blockid, length(block) AS len FROM '%q_segments'"
            " ORDER BY 2 DESC, 1"
            " LIMIT %d", zTab, nTop);
  i = 0;
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    i++;
    id = sqlite3_column_int64(pStmt, 0);
    sz = sqlite3_column_int64(pStmt, 1);
    printf("  %2d. %9lld size %lld\n", i, id, sz);
  }
  sqlite3_finalize(pStmt);
}



static void usage(const char *argv0){
  fprintf(stderr, "Usage: %s DATABASE\n"
                  "   or: %s DATABASE FTS3TABLE ARGS...\n", argv0, argv0);
  fprintf(stderr,
    "ARGS:\n"
    "  big-segments [--top N]                    show the largest segments\n"
    "  doclist BLOCKID OFFSET SIZE [--raw]       Decode a doclist\n"
    "  schema                                    FTS table schema\n"
    "  segdir                                    directory of segments\n"
    "  segment BLOCKID [--raw]                   content of a segment\n"
    "  segment-stats                             info on segment sizes\n"
    "  stat                                      the %%_stat table\n"
    "  vocabulary [--top N]                      document vocabulary\n"
  );
  exit(1);
}

int main(int argc, char **argv){
  sqlite3 *db;
  int rc;
  const char *zTab;
  const char *zCmd;

  if( argc<2 ) usage(argv[0]);
  rc = sqlite3_open(argv[1], &db);
  if( rc ){
    fprintf(stderr, "Cannot open %s\n", argv[1]);
    exit(1);
  }
  if( argc==2 ){
    sqlite3_stmt *pStmt;
    int cnt = 0;
    pStmt = prepare(db, "SELECT b.sql"
                        "  FROM sqlite_schema a, sqlite_schema b"
                        " WHERE a.name GLOB '*_segdir'"
                        "   AND b.name=substr(a.name,1,length(a.name)-7)"
                        " ORDER BY 1");
    while( sqlite3_step(pStmt)==SQLITE_ROW ){
      cnt++;
      printf("%s;\n", sqlite3_column_text(pStmt, 0));
    }
    sqlite3_finalize(pStmt);
    if( cnt==0 ){
      printf("/* No FTS3/4 tables found in database %s */\n", argv[1]);
    }
    return 0;
  }
  if( argc<4 ) usage(argv[0]);
  zTab = argv[2];
  zCmd = argv[3];
  nExtra = argc-4;
  azExtra = argv+4;
  if( strcmp(zCmd,"big-segments")==0 ){
    listBigSegments(db, zTab);
  }else if( strcmp(zCmd,"doclist")==0 ){
    if( argc<7 ) usage(argv[0]);
    showDoclist(db, zTab);
  }else if( strcmp(zCmd,"schema")==0 ){
    showSchema(db, zTab);
  }else if( strcmp(zCmd,"segdir")==0 ){
    showSegdirMap(db, zTab);
  }else if( strcmp(zCmd,"segment")==0 ){
    if( argc<5 ) usage(argv[0]);
    showSegment(db, zTab);
  }else if( strcmp(zCmd,"segment-stats")==0 ){
    showSegmentStats(db, zTab);
  }else if( strcmp(zCmd,"stat")==0 ){
    showStat(db, zTab);
  }else if( strcmp(zCmd,"vocabulary")==0 ){
    showVocabulary(db, zTab);
  }else{
    usage(argv[0]);
  }
  return 0; 
}
