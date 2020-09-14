/*
** This is a test interface for the ossfuzz.c module.  The ossfuzz.c module
** is an adaptor for OSS-FUZZ.  (https://github.com/google/oss-fuzz)
**
** This program links against ossfuzz.c.  It reads files named on the
** command line and passes them one by one into ossfuzz.c.
*/
#include <stddef.h>
#if !defined(_MSC_VER)
# include <stdint.h>
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "sqlite3.h"

#if defined(_MSC_VER)
typedef unsigned char uint8_t;
#endif

/*
** The entry point in ossfuzz.c that this routine will be calling
*/
int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size);

/* Must match equivalent #defines in ossfuzz.c */
#define FUZZ_SQL_TRACE       0x0001   /* Set an sqlite3_trace() callback */
#define FUZZ_SHOW_MAX_DELAY  0x0002   /* Show maximum progress callback delay */
#define FUZZ_SHOW_ERRORS     0x0004   /* Show SQL errors */
extern void ossfuzz_set_debug_flags(unsigned);



/*
** Read files named on the command-line and invoke the fuzzer for
** each one.
*/
int main(int argc, char **argv){
  FILE *in;
  int i;
  int nErr = 0;
  uint8_t *zBuf = 0;
  size_t sz;
  unsigned mDebug = 0;

  for(i=1; i<argc; i++){
    const char *zFilename = argv[i];
    if( zFilename[0]=='-' ){
      if( zFilename[1]=='-' ) zFilename++;
      if( strcmp(zFilename, "-show-errors")==0 ){
        mDebug |= FUZZ_SHOW_ERRORS;
        ossfuzz_set_debug_flags(mDebug);
      }else
      if( strcmp(zFilename, "-show-max-delay")==0 ){
        mDebug |= FUZZ_SHOW_MAX_DELAY;
        ossfuzz_set_debug_flags(mDebug);
      }else
      if( strcmp(zFilename, "-sql-trace")==0 ){
        mDebug |= FUZZ_SQL_TRACE;
        ossfuzz_set_debug_flags(mDebug);
      }else
      {
        printf("unknown option \"%s\"\n", argv[i]);
        printf("should be one of: --show-errors --show-max-delay"
               " --sql-trace\n");
        exit(1);
      }
      continue;
    }
    in = fopen(zFilename, "rb");
    if( in==0 ){
      fprintf(stderr, "cannot open \"%s\"\n", zFilename);
      nErr++;
      continue;
    }
    fseek(in, 0, SEEK_END);
    sz = ftell(in);
    rewind(in);
    zBuf = realloc(zBuf, sz);
    if( zBuf==0 ){
      fprintf(stderr, "cannot malloc() for %d bytes\n", (int)sz);
      exit(1);
    }
    if( fread(zBuf, sz, 1, in)!=1 ){
      fprintf(stderr, "cannot read %d bytes from \"%s\"\n",
                       (int)sz, zFilename);
      nErr++;
    }else{
      printf("%s... ", zFilename);
      if( mDebug ) printf("\n");
      fflush(stdout);
      (void)LLVMFuzzerTestOneInput(zBuf, sz);
      if( mDebug ) printf("%s: ", zFilename);
      printf("ok\n");
    }
    fclose(in);
  }
  free(zBuf);
  return nErr;
}
