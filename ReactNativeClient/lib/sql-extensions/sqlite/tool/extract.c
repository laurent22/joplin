/*
** Extract a range of bytes from a file.
**
** Usage:
**
**    extract FILENAME OFFSET AMOUNT
**
** The bytes are written to standard output.
*/
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv){
  FILE *f;
  char *zBuf;
  int ofst;
  int n;
  size_t got;

  if( argc!=4 ){
    fprintf(stderr, "Usage: %s FILENAME OFFSET AMOUNT\n", *argv);
    return 1;
  }
  f = fopen(argv[1], "rb");
  if( f==0 ){
    fprintf(stderr, "cannot open \"%s\"\n", argv[1]);
    return 1;
  }
  ofst = atoi(argv[2]);
  n = atoi(argv[3]);
  zBuf = malloc( n );
  if( zBuf==0 ){
    fprintf(stderr, "out of memory\n");
    return 1;
  }
  fseek(f, ofst, SEEK_SET);
  got = fread(zBuf, 1, n, f);
  fclose(f);
  if( got<n ){
    fprintf(stderr, "got only %d of %d bytes\n", got, n);
    return 1;
  }else{
    fwrite(zBuf, 1, n, stdout);
  }
  return 0;
}
