/*
** Try to enlarge an SQLite database by appending many unused pages.
** The resulting database will fail PRAGMA integrity_check due to the
** appended unused pages, but it should work otherwise.
**
** Usage:
**
**        enlargedb  DATABASE   N
**
** Adds N blank pages onto the end of DATABASE.  N can be decimal
** or hex.  The total number of pages after adding must be no greater
** than 4294967297
*/
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(int argc, char **argv){
  char *zEnd;
  long long int toAppend;
  long long int currentSz;
  long long int newSz;
  FILE *f;
  size_t got;
  int pgsz;
  char zero = 0;
  unsigned char buf[100];

  if( argc!=3 ) goto usage_error;
  toAppend = strtoll(argv[2], &zEnd, 0);
  if( zEnd==argv[2] || zEnd[0] ) goto usage_error;
  if( toAppend<1 ){
    fprintf(stderr, "N must be at least 1\n");
    exit(1);
  }
  f = fopen(argv[1], "r+b");
  if( f==0 ){
    fprintf(stderr, "cannot open \"%s\" for reading and writing\n", argv[1]);
    exit(1);
  }
  got = fread(buf, 1, sizeof(buf), f);
  if( got!=sizeof(buf) ) goto not_valid_db;
  if( strcmp((char*)buf,"SQLite format 3")!=0 ) goto not_valid_db;
  pgsz = (buf[16]<<8) + buf[17];
  if( pgsz==1 ) pgsz = 65536;
  if( pgsz<512 || pgsz>65536 || (pgsz&(pgsz-1))!=0 ) goto not_valid_db;
  currentSz = (buf[28]<<24) + (buf[29]<<16) + (buf[30]<<8) + buf[31];
  newSz = currentSz + toAppend;
  if( newSz > 0xffffffff ) newSz = 0xffffffff;
  buf[28] = (newSz>>24) & 0xff;
  buf[29] = (newSz>>16) & 0xff;
  buf[30] = (newSz>>8) & 0xff;
  buf[31] = newSz & 0xff;
  fseek(f, 28, SEEK_SET);
  fwrite(&buf[28],4,1,f);
  fseek(f, (long)(newSz*pgsz - 1), SEEK_SET);
  fwrite(&zero,1,1,f);
  fclose(f);
  return 0;  

not_valid_db:
  fprintf(stderr,"not a valid database: %s\n", argv[1]);
  exit(1);  

usage_error:
  fprintf(stderr,"Usage: %s DATABASE N\n", argv[0]);
  exit(1);
}
