/*
** This file implements a simple command-line utility that shows all of the
** Posix Advisory Locks on a file.
**
** Usage:
**
**     showlocks FILENAME
**
** To compile:  gcc -o showlocks showlocks.c
*/
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdlib.h>
#include <string.h>

/* This utility only looks for locks in the first 2 billion bytes */
#define MX_LCK 2147483647

/*
** Print all locks on the inode of "fd" that occur in between
** lwr and upr, inclusive.
*/
static int showLocksInRange(int fd, off_t lwr, off_t upr){
  int cnt = 0;
  struct flock x;
  struct lockRange {
    off_t lwr;
    off_t upr;
  } *aPending = 0;
  int nAlloc = 1;
  int nPending = 0;
  int nDone = 0;

  nPending = 1;
  aPending = malloc( sizeof(aPending[0]) );
  if( aPending==0 ){
    fprintf(stderr, "out of memory\n");
    exit(1);
  }
  aPending[0].lwr = lwr;
  aPending[0].upr = upr;

  for(nDone=0; nDone<nPending; nDone++){
    lwr = aPending[nDone].lwr;
    upr = aPending[nDone].upr;
    if( lwr>=upr ) continue;
    x.l_type = F_WRLCK;
    x.l_whence = SEEK_SET;
    x.l_start = lwr;
    x.l_len = upr - lwr;
    fcntl(fd, F_GETLK, &x);
    if( x.l_type==F_UNLCK ) continue;
    printf("start: %-12d len: %-5d pid: %-5d type: %s\n",
         (int)x.l_start, (int)x.l_len,
         x.l_pid, x.l_type==F_WRLCK ? "WRLCK" : "RDLCK");
    cnt++;
    if( nPending+2 > nAlloc ){
      nAlloc = nAlloc*2 + 2;
      aPending = realloc(aPending, sizeof(aPending[0])*nAlloc );
    }
    if( aPending==0 ){
      fprintf(stderr, "unable to realloc for %d bytes\n",
                      (int)sizeof(aPending[0])*(nPending+2));
      exit(1);
    }
    if( lwr<x.l_start ){
      aPending[nPending].lwr = lwr;
      aPending[nPending].upr = x.l_start;
      nPending++;
    }
    if( x.l_start+x.l_len<=upr ){
      aPending[nPending].lwr = x.l_start + x.l_len;
      aPending[nPending].upr = upr;
      nPending++;
    }
  }
  free(aPending);
  return cnt;
}

int main(int argc, char **argv){
  int fd;
  int cnt;

  if( argc!=2 ){
    fprintf(stderr, "Usage: %s FILENAME\n", argv[0]);
    return 1;
  }
  fd = open(argv[1], O_RDWR, 0);
  if( fd<0 ){
    fprintf(stderr, "%s: cannot open %s\n", argv[0], argv[1]);
    return 1;
  }
  cnt = showLocksInRange(fd, 0, MX_LCK);
  if( cnt==0 ) printf("no locks\n");  
  close(fd);
  return 0;
}
