
/*
** SUMMARY
**
**   This file implements the 'io' subcommand of the test program. It is used
**   for testing the performance of various combinations of write() and fsync()
**   system calls. All operations occur on a single file, which may or may not
**   exist when a test is started.
**
**   A test consists of a series of commands. Each command is either a write
**   or an fsync. A write is specified as "<amount>@<offset>", where <amount>
**   is the amount of data written, and <offset> is the offset of the file
**   to write to. An <amount> or an <offset> is specified as an integer number
**   of bytes. Or, if postfixed with a "K", "M" or "G", an integer number of
**   KB, MB or GB, respectively. An fsync is simply "S". All commands are
**   case-insensitive.
**
**   Example test program:
**
**        2M@6M 1492K@4M S 4096@4K S
**
**   This program writes 2 MB of data starting at the offset 6MB offset of
**   the file, followed by 1492 KB of data written at the 4MB offset of the
**   file, followed by a call to fsync(), a write of 4KB of data at byte
**   offset 4096, and finally another call to fsync().
**
**   Commands may either be specified on the command line (one command per
**   command line argument) or read from stdin. Commands read from stdin
**   must be separated by white-space.
**
** COMMAND LINE INVOCATION
**
**   The sub-command implemented in this file must be invoked with at least
**   two arguments - the path to the file to write to and the page-size to
**   use for writing. If there are more than two arguments, then each
**   subsequent argument is assumed to be a test command. If there are exactly
**   two arguments, the test commands are read from stdin.
**
**   A write command does not result in a single call to system call write().
**   Instead, the specified region is written sequentially using one or
**   more calls to write(), each of which writes not more than one page of
**   data. For example, if the page-size is 4KB, the command "2M@6M" results
**   in 512 calls to write(), each of which writes 4KB of data.
**
** EXAMPLES
**
**   Two equivalent examples:
**
**     $ lsmtest io testfile.db 4KB 2M@6M 1492K@4M S 4096@4K S
**     3544K written in 129 ms
**     $ echo "2M@6M 1492K@4M S 4096@4K S" | lsmtest io testfile.db 4096 
**     3544K written in 127 ms
**
*/

#include "lsmtest.h"

typedef struct IoContext IoContext;

struct IoContext {
  int fd;
  int nWrite;
};

/*
** As isspace(3)
*/
static int safe_isspace(char c){
  if( c&0x80) return 0;
  return isspace(c);
}

/*
** As isdigit(3)
*/
static int safe_isdigit(char c){
  if( c&0x80) return 0;
  return isdigit(c);
}

static i64 getNextSize(char *zIn, char **pzOut, int *pRc){
  i64 iRet = 0;
  if( *pRc==0 ){
    char *z = zIn;

    if( !safe_isdigit(*z) ){
      *pRc = 1;
      return 0;
    }

    /* Process digits */
    while( safe_isdigit(*z) ){
      iRet = iRet*10 + (*z - '0');
      z++;
    }

    /* Process suffix */
    switch( *z ){
      case 'k': case 'K':
        iRet = iRet * 1024;
        z++;
        break;

      case 'm': case 'M':
        iRet = iRet * 1024 * 1024;
        z++;
        break;

      case 'g': case 'G':
        iRet = iRet * 1024 * 1024 * 1024;
        z++;
        break;
    }

    if( pzOut ) *pzOut = z;
  }
  return iRet;
}

static int doOneCmd(
  IoContext *pCtx,
  u8 *aData,
  int pgsz,
  char *zCmd,
  char **pzOut
){
  char c;
  char *z = zCmd;

  while( safe_isspace(*z) ) z++;
  c = *z;

  if( c==0 ){
    if( pzOut ) *pzOut = z;
    return 0;
  }

  if( c=='s' || c=='S' ){
    if( pzOut ) *pzOut = &z[1];
    return fdatasync(pCtx->fd);
  }

  if( safe_isdigit(c) ){
    i64 iOff = 0;
    int nByte = 0;
    int rc = 0;
    int nPg;
    int iPg;

    nByte = (int)getNextSize(z, &z, &rc);
    if( rc || *z!='@' ) goto bad_command;
    z++;
    iOff = getNextSize(z, &z, &rc);
    if( rc || (safe_isspace(*z)==0 && *z!='\0') ) goto bad_command;
    if( pzOut ) *pzOut = z;

    nPg = (nByte+pgsz-1) / pgsz;
    lseek(pCtx->fd, (off_t)iOff, SEEK_SET);
    for(iPg=0; iPg<nPg; iPg++){
      write(pCtx->fd, aData, pgsz);
    }
    pCtx->nWrite += nByte/1024;

    return 0;
  }

 bad_command:
  testPrintError("unrecognized command: %s", zCmd);
  return 1;
}

static int readStdin(char **pzOut){
  int nAlloc = 128;
  char *zOut = 0;
  int nOut = 0;

  while( !feof(stdin) ){
    int nRead;

    nAlloc = nAlloc*2;
    zOut = realloc(zOut, nAlloc);
    nRead = fread(&zOut[nOut], 1, nAlloc-nOut-1, stdin);

    if( nRead==0 ) break;
    nOut += nRead;
    zOut[nOut] = '\0';
  }

  *pzOut = zOut;
  return 0;
}

int do_io(int nArg, char **azArg){
  IoContext ctx;
  int pgsz;
  char *zFile;
  char *zPgsz;
  int i;
  int rc = 0;

  char *zStdin = 0;
  char *z;

  u8 *aData;

  memset(&ctx, 0, sizeof(IoContext));
  if( nArg<2 ){
    testPrintUsage("FILE PGSZ ?CMD-1 ...?");
    return -1;
  }
  zFile = azArg[0];
  zPgsz = azArg[1];

  pgsz = (int)getNextSize(zPgsz, 0, &rc);
  if( pgsz<=0 ){
    testPrintError("Ridiculous page size: %d", pgsz);
    return -1;
  }
  aData = malloc(pgsz);
  memset(aData, 0x77, pgsz);

  ctx.fd = open(zFile, O_RDWR|O_CREAT|_O_BINARY, 0644);
  if( ctx.fd<0 ){
    perror("open: ");
    return -1;
  }

  if( nArg==2 ){
    readStdin(&zStdin);
    testTimeInit();
    z = zStdin;
    while( *z && rc==0 ){
      rc = doOneCmd(&ctx, aData, pgsz, z, &z);
    }
  }else{
    testTimeInit();
    for(i=2; i<nArg; i++){
      rc = doOneCmd(&ctx, aData, pgsz, azArg[i], 0);
    }
  }

  printf("%dK written in %d ms\n", ctx.nWrite, testTimeGet());

  free(zStdin);
  close(ctx.fd);

  return 0;
}
