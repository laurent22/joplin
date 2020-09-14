/*
** This utility program decodes and displays the content of the
** sqlite_stat4 table in the database file named on the command
** line.
*/
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include "sqlite3.h"

#define ISPRINT(X)  isprint((unsigned char)(X))

typedef sqlite3_int64 i64;   /* 64-bit signed integer type */


/*
** Convert the var-int format into i64.  Return the number of bytes
** in the var-int.  Write the var-int value into *pVal.
*/
static int decodeVarint(const unsigned char *z, i64 *pVal){
  i64 v = 0;
  int i;
  for(i=0; i<8; i++){
    v = (v<<7) + (z[i]&0x7f);
    if( (z[i]&0x80)==0 ){ *pVal = v; return i+1; }
  }
  v = (v<<8) + (z[i]&0xff);
  *pVal = v;
  return 9;
}



int main(int argc, char **argv){
  sqlite3 *db;
  sqlite3_stmt *pStmt;
  char *zIdx = 0;
  int rc, j, x, y, mxHdr;
  const unsigned char *aSample;
  int nSample;
  i64 iVal;
  const char *zSep;
  int iRow = 0;

  if( argc!=2 ){
    fprintf(stderr, "Usage: %s DATABASE-FILE\n", argv[0]);
    exit(1);
  }
  rc = sqlite3_open(argv[1], &db);
  if( rc!=SQLITE_OK || db==0 ){
    fprintf(stderr, "Cannot open database file [%s]\n", argv[1]);
    exit(1);
  }
  rc = sqlite3_prepare_v2(db,
        "SELECT tbl||'.'||idx, nEq, nLT, nDLt, sample "
        "FROM sqlite_stat4 ORDER BY 1", -1,
        &pStmt, 0);
  if( rc!=SQLITE_OK || pStmt==0 ){
    fprintf(stderr, "%s\n", sqlite3_errmsg(db));
    sqlite3_close(db);
    exit(1);
  }
  while( SQLITE_ROW==sqlite3_step(pStmt) ){
    if( zIdx==0 || strcmp(zIdx, (const char*)sqlite3_column_text(pStmt,0))!=0 ){
      if( zIdx ) printf("\n**************************************"
                        "**************\n\n");
      sqlite3_free(zIdx);
      zIdx = sqlite3_mprintf("%s", sqlite3_column_text(pStmt,0));
      iRow = 0;
    }
    printf("%s sample %d ------------------------------------\n", zIdx, ++iRow);
    printf("  nEq    = %s\n", sqlite3_column_text(pStmt,1));
    printf("  nLt    = %s\n", sqlite3_column_text(pStmt,2));
    printf("  nDLt   = %s\n", sqlite3_column_text(pStmt,3));
    printf("  sample = x'");
    aSample = sqlite3_column_blob(pStmt,4);
    nSample = sqlite3_column_bytes(pStmt,4);
    for(j=0; j<nSample; j++) printf("%02x", aSample[j]);
    printf("'\n          ");
    zSep = " ";
    x = decodeVarint(aSample, &iVal);
    if( iVal<x || iVal>nSample ){
      printf(" <error>\n");
      continue;
    }
    y = mxHdr = (int)iVal;
    while( x<mxHdr ){
      int sz;
      i64 v;
      x += decodeVarint(aSample+x, &iVal);
      if( x>mxHdr ) break;
      if( iVal<0 ) break;
      switch( iVal ){
        case 0:  sz = 0;  break;
        case 1:  sz = 1;  break;
        case 2:  sz = 2;  break;
        case 3:  sz = 3;  break;
        case 4:  sz = 4;  break;
        case 5:  sz = 6;  break;
        case 6:  sz = 8;  break;
        case 7:  sz = 8;  break;
        case 8:  sz = 0;  break;
        case 9:  sz = 0;  break;
        case 10:
        case 11: sz = 0;  break;
        default: sz = (int)(iVal-12)/2;  break;
      }
      if( y+sz>nSample ) break;
      if( iVal==0 ){
        printf("%sNULL", zSep);
      }else if( iVal==8 || iVal==9 ){
        printf("%s%d", zSep, ((int)iVal)-8);
      }else if( iVal<=7 ){
        v = (signed char)aSample[y];
        for(j=1; j<sz; j++){
          v = (v<<8) + aSample[y+j];
        }
        if( iVal==7 ){
          double r;
          char *z;
          memcpy(&r, &v, sizeof(r));
          z = sqlite3_mprintf("%s%!.15g", zSep, r);
          printf("%s", z);
          sqlite3_free(z);
        }else{
          printf("%s%lld", zSep, v);
        }
      }else if( (iVal&1)==0 ){
        printf("%sx'", zSep);
        for(j=0; j<sz; j++){
          printf("%02x", aSample[y+j]);
        }
        printf("'");
      }else{
        printf("%s'", zSep);
        for(j=0; j<sz; j++){
          char c = (char)aSample[y+j];
          if( ISPRINT(c) ){
            if( c=='\'' || c=='\\' ) putchar('\\');
            putchar(c);
          }else if( c=='\n' ){
            printf("\\n");
          }else if( c=='\t' ){
            printf("\\t");
          }else if( c=='\r' ){
            printf("\\r");
          }else{
            printf("\\%03o", c);
          }
        }
        printf("'");
      }
      zSep = ",";
      y += sz;
    }
    printf("\n");
  }
  sqlite3_free(zIdx);
  sqlite3_finalize(pStmt);
  sqlite3_close(db);
  return 0;
}
