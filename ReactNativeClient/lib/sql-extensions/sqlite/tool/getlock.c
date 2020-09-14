/*
** This utility program looks at an SQLite database and determines whether
** or not it is locked, the kind of lock, and who is holding this lock.
**
** This only works on unix when the posix advisory locking method is used
** (which is the default on unix) and when the PENDING_BYTE is in its
** usual place.
*/
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

static void usage(const char *argv0){
  fprintf(stderr, "Usage: %s database\n", argv0);
  exit(1);
}

/* Check for a conflicting lock.  If one is found, print an this
** on standard output using the format string given and return 1.
** If there are no conflicting locks, return 0.
*/
static int isLocked(
  int h,                /* File descriptor to check */
  int type,             /* F_RDLCK or F_WRLCK */
  unsigned int iOfst,   /* First byte of the lock */
  unsigned int iCnt,    /* Number of bytes in the lock range */
  const char *zType     /* Type of lock */
){
  struct flock lk;

  memset(&lk, 0, sizeof(lk));
  lk.l_type = type;
  lk.l_whence = SEEK_SET;
  lk.l_start = iOfst;
  lk.l_len = iCnt;
  if( fcntl(h, F_GETLK, &lk)==(-1) ){
    fprintf(stderr, "fcntl(%d) failed: errno=%d\n", h, errno);
    exit(1);
  }
  if( lk.l_type==F_UNLCK ) return 0;
  printf("%s lock held by %d\n", zType, (int)lk.l_pid);
  return 1;
}

/*
** Location of locking bytes in the database file
*/
#define PENDING_BYTE      (0x40000000)
#define RESERVED_BYTE     (PENDING_BYTE+1)
#define SHARED_FIRST      (PENDING_BYTE+2)
#define SHARED_SIZE       510

/*
** Lock locations for shared-memory locks used by WAL mode.
*/
#define SHM_BASE          120
#define SHM_WRITE         SHM_BASE
#define SHM_CHECKPOINT    (SHM_BASE+1)
#define SHM_RECOVER       (SHM_BASE+2)
#define SHM_READ_FIRST    (SHM_BASE+3)
#define SHM_READ_SIZE     5


int main(int argc, char **argv){
  int hDb;        /* File descriptor for the open database file */
  int hShm;       /* File descriptor for WAL shared-memory file */
  char *zShm;     /* Name of the shared-memory file for WAL mode */
  ssize_t got;    /* Bytes read from header */
  int isWal;                 /* True if in WAL mode */
  int nName;                 /* Length of filename */
  unsigned char aHdr[100];   /* Database header */
  int nLock = 0;             /* Number of locks held */
  int i;                     /* Loop counter */

  if( argc!=2 ) usage(argv[0]);
  hDb = open(argv[1], O_RDONLY, 0);
  if( hDb<0 ){
    fprintf(stderr, "cannot open %s\n", argv[1]);
    return 1;
  }

  /* Make sure we are dealing with an database file */
  got = read(hDb, aHdr, 100);
  if( got!=100 || memcmp(aHdr, "SQLite format 3",16)!=0 ){
    fprintf(stderr, "not an SQLite database: %s\n", argv[1]);
    exit(1);
  }

  /* First check for an exclusive lock */
  if( isLocked(hDb, F_RDLCK, SHARED_FIRST, SHARED_SIZE, "EXCLUSIVE") ){
    return 0;
  }
  isWal = aHdr[18]==2;
  if( isWal==0 ){
    /* Rollback mode */
    if( isLocked(hDb, F_RDLCK, PENDING_BYTE, 1, "PENDING") ) return 0;
    if( isLocked(hDb, F_RDLCK, RESERVED_BYTE, 1, "RESERVED") ) return 0;
    if( isLocked(hDb, F_WRLCK, SHARED_FIRST, SHARED_SIZE, "SHARED") ){
      return 0;
    }
  }else{
    /* WAL mode */
    nName = (int)strlen(argv[1]);
    zShm = malloc( nName + 100 );
    if( zShm==0 ){
      fprintf(stderr, "out of memory\n");
      exit(1);
    }
    memcpy(zShm, argv[1], nName);
    memcpy(&zShm[nName], "-shm", 5);
    hShm = open(zShm, O_RDONLY, 0);
    if( hShm<0 ){
      fprintf(stderr, "cannot open %s\n", zShm);
      return 1;
    }
    if( isLocked(hShm, F_RDLCK, SHM_RECOVER, 1, "WAL-RECOVERY") ){
      return 0;
    }
    nLock += isLocked(hShm, F_RDLCK, SHM_CHECKPOINT, 1, "WAL-CHECKPOINT");
    nLock += isLocked(hShm, F_RDLCK, SHM_WRITE, 1, "WAL-WRITE");
    for(i=0; i<SHM_READ_SIZE; i++){
      nLock += isLocked(hShm, F_WRLCK, SHM_READ_FIRST+i, 1, "WAL-READ");
    }
  }
  if( nLock==0 ){
    printf("file is not locked\n");
  }
  return 0;
}
