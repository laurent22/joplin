/*
** 2011-08-13
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
** This file contains the implementation of LSM database logging. Logging
** has one purpose in LSM - to make transactions durable.
**
** When data is written to an LSM database, it is initially stored in an
** in-memory tree structure. Since this structure is in volatile memory,
** if a power failure or application crash occurs it may be lost. To
** prevent loss of data in this case, each time a record is written to the
** in-memory tree an equivalent record is appended to the log on disk.
** If a power failure or application crash does occur, data can be recovered
** by reading the log.
**
** A log file consists of the following types of records representing data
** written into the database:
**
**   LOG_WRITE:  A key-value pair written to the database.
**   LOG_DELETE: A delete key issued to the database.
**   LOG_COMMIT: A transaction commit.
**
** And the following types of records for ancillary purposes..
**
**   LOG_EOF:    A record indicating the end of a log file.
**   LOG_PAD1:   A single byte padding record.
**   LOG_PAD2:   An N byte padding record (N>1).
**   LOG_JUMP:   A pointer to another offset within the log file.
**
** Each transaction written to the log contains one or more LOG_WRITE and/or
** LOG_DELETE records, followed by a LOG_COMMIT record. The LOG_COMMIT record
** contains an 8-byte checksum based on all previous data written to the
** log file.
**
** LOG CHECKSUMS & RECOVERY
**
**   Checksums are found in two types of log records: LOG_COMMIT and
**   LOG_CKSUM records. In order to recover content from a log, a client
**   reads each record from the start of the log, calculating a checksum as
**   it does. Each time a LOG_COMMIT or LOG_CKSUM is encountered, the 
**   recovery process verifies that the checksum stored in the log 
**   matches the calculated checksum. If it does not, the recovery process
**   can stop reading the log.
**
**   If a recovery process reads records (other than COMMIT or CKSUM) 
**   consisting of at least LSM_CKSUM_MAXDATA bytes, then the next record in
**   the log must be either a LOG_CKSUM or LOG_COMMIT record. If it is
**   not, the recovery process also stops reading the log.
**
**   To recover the log file, it must be read twice. The first time to 
**   determine the location of the last valid commit record. And the second
**   time to load data into the in-memory tree.
**
**   Todo: Surely there is a better way...
**
** LOG WRAPPING
**
**   If the log file were never deleted or wrapped, it would be possible to
**   read it from start to end each time is required recovery (i.e each time
**   the number of database clients changes from 0 to 1). Effectively reading
**   the entire history of the database each time. This would quickly become 
**   inefficient. Additionally, since the log file would grow without bound,
**   it wastes storage space.
**
**   Instead, part of each checkpoint written into the database file contains 
**   a log offset (and other information required to read the log starting at
**   at this offset) at which to begin recovery. Offset $O.
**
**   Once a checkpoint has been written and synced into the database file, it
**   is guaranteed that no recovery process will need to read any data before
**   offset $O of the log file. It is therefore safe to begin overwriting
**   any data that occurs before offset $O.
**
**   This implementation separates the log into three regions mapped into
**   the log file - regions 0, 1 and 2. During recovery, regions are read
**   in ascending order (i.e. 0, then 1, then 2). Each region is zero or
**   more bytes in size.
**
**     |---1---|..|--0--|.|--2--|....
**
**   New records are always appended to the end of region 2.
**
**   Initially (when it is empty), all three regions are zero bytes in size.
**   Each of them are located at the beginning of the file. As records are
**   added to the log, region 2 grows, so that the log consists of a zero
**   byte region 1, followed by a zero byte region 0, followed by an N byte
**   region 2. After one or more checkpoints have been written to disk, 
**   the start point of region 2 is moved to $O. For example:
**
**     A) ||.........|--2--|....
**   
**   (both regions 0 and 1 are 0 bytes in size at offset 0).
**
**   Eventually, the log wraps around to write new records into the start.
**   At this point, region 2 is renamed to region 0. Region 0 is renamed
**   to region 2. After appending a few records to the new region 2, the
**   log file looks like this:
**
**     B) ||--2--|...|--0--|....
**
**   (region 1 is still 0 bytes in size, located at offset 0).
**
**   Any checkpoints made at this point may reduce the size of region 0.
**   However, if they do not, and region 2 expands so that it is about to
**   overwrite the start of region 0, then region 2 is renamed to region 1,
**   and a new region 2 created at the end of the file following the existing
**   region 0.
**
**     C) |---1---|..|--0--|.|-2-|
**
**   In this state records are appended to region 2 until checkpoints have
**   contracted regions 0 AND 1 UNTil they are both zero bytes in size. They 
**   are then shifted to the start of the log file, leaving the system in 
**   the equivalent of state A above.
**
**   Alternatively, state B may transition directly to state A if the size
**   of region 0 is reduced to zero bytes before region 2 threatens to 
**   encroach upon it.
**
** LOG_PAD1 & LOG_PAD2 RECORDS
**
**   PAD1 and PAD2 records may appear in a log file at any point. They allow
**   a process writing the log file align the beginning of transactions with 
**   the beginning of disk sectors, which increases robustness.
**
** RECORD FORMATS:
**
**   LOG_EOF:    * A single 0x00 byte.
**
**   LOG_PAD1:   * A single 0x01 byte.
**
**   LOG_PAD2:   * A single 0x02 byte, followed by
**               * The number of unused bytes (N) as a varint,
**               * An N byte block of unused space.
**
**   LOG_COMMIT: * A single 0x03 byte.
**               * An 8-byte checksum.
**
**   LOG_JUMP:   * A single 0x04 byte.
**               * Absolute file offset to jump to, encoded as a varint.
**
**   LOG_WRITE:  * A single 0x06 or 0x07 byte, 
**               * The number of bytes in the key, encoded as a varint, 
**               * The number of bytes in the value, encoded as a varint, 
**               * If the first byte was 0x07, an 8 byte checksum.
**               * The key data,
**               * The value data.
**
**   LOG_DELETE: * A single 0x08 or 0x09 byte, 
**               * The number of bytes in the key, encoded as a varint, 
**               * If the first byte was 0x09, an 8 byte checksum.
**               * The key data.
**
**   Varints are as described in lsm_varint.c (SQLite 4 format).
**
** CHECKSUMS:
**
**   The checksum is calculated using two 32-bit unsigned integers, s0 and
**   s1. The initial value for both is 42. It is updated each time a record
**   is written into the log file by treating the encoded (binary) record as 
**   an array of 32-bit little-endian integers. Then, if x[] is the integer
**   array, updating the checksum accumulators as follows:
**
**     for i from 0 to n-1 step 2:
**       s0 += x[i] + s1;
**       s1 += x[i+1] + s0;
**     endfor
**
**   If the record is not an even multiple of 8-bytes in size it is padded
**   with zeroes to make it so before the checksum is updated.
**
**   The checksum stored in a COMMIT, WRITE or DELETE is based on all bytes
**   up to the start of the 8-byte checksum itself, including the COMMIT,
**   WRITE or DELETE fields that appear before the checksum in the record.
**
** VARINT FORMAT
**
** See lsm_varint.c.
*/

#ifndef _LSM_INT_H
# include "lsmInt.h"
#endif

/* Log record types */
#define LSM_LOG_EOF          0x00
#define LSM_LOG_PAD1         0x01
#define LSM_LOG_PAD2         0x02
#define LSM_LOG_COMMIT       0x03
#define LSM_LOG_JUMP         0x04

#define LSM_LOG_WRITE        0x06
#define LSM_LOG_WRITE_CKSUM  0x07

#define LSM_LOG_DELETE       0x08
#define LSM_LOG_DELETE_CKSUM 0x09

#define LSM_LOG_DRANGE       0x0A
#define LSM_LOG_DRANGE_CKSUM 0x0B

/* Require a checksum every 32KB. */
#define LSM_CKSUM_MAXDATA (32*1024)

/* Do not wrap a log file smaller than this in bytes. */
#define LSM_MIN_LOGWRAP      (128*1024)

/*
** szSector:
**   Commit records must be aligned to end on szSector boundaries. If
**   the safety-mode is set to NORMAL or OFF, this value is 1. Otherwise,
**   if the safety-mode is set to FULL, it is the size of the file-system
**   sectors as reported by lsmFsSectorSize().
*/
struct LogWriter {
  u32 cksum0;                     /* Checksum 0 at offset iOff */
  u32 cksum1;                     /* Checksum 1 at offset iOff */
  int iCksumBuf;                  /* Bytes of buf that have been checksummed */
  i64 iOff;                       /* Offset at start of buffer buf */
  int szSector;                   /* Sector size for this transaction */
  LogRegion jump;                 /* Avoid writing to this region */
  i64 iRegion1End;                /* End of first region written by trans */
  i64 iRegion2Start;              /* Start of second regions written by trans */
  LsmString buf;                  /* Buffer containing data not yet written */
};

/*
** Return the result of interpreting the first 4 bytes in buffer aIn as 
** a 32-bit unsigned little-endian integer.
*/
static u32 getU32le(u8 *aIn){
  return ((u32)aIn[3] << 24) 
       + ((u32)aIn[2] << 16) 
       + ((u32)aIn[1] << 8) 
       + ((u32)aIn[0]);
}


/*
** This function is the same as logCksum(), except that pointer "a" need
** not be aligned to an 8-byte boundary or padded with zero bytes. This
** version is slower, but sometimes more convenient to use.
*/
static void logCksumUnaligned(
  char *z,                        /* Input buffer */
  int n,                          /* Size of input buffer in bytes */
  u32 *pCksum0,                   /* IN/OUT: Checksum value 1 */
  u32 *pCksum1                    /* IN/OUT: Checksum value 2 */
){
  u8 *a = (u8 *)z;
  u32 cksum0 = *pCksum0;
  u32 cksum1 = *pCksum1;
  int nIn = (n/8) * 8;
  int i;

  assert( n>0 );
  for(i=0; i<nIn; i+=8){
    cksum0 += getU32le(&a[i]) + cksum1;
    cksum1 += getU32le(&a[i+4]) + cksum0;
  }

  if( nIn!=n ){
    u8 aBuf[8] = {0, 0, 0, 0, 0, 0, 0, 0};
    assert( (n-nIn)<8 && n>nIn );
    memcpy(aBuf, &a[nIn], n-nIn);
    cksum0 += getU32le(aBuf) + cksum1;
    cksum1 += getU32le(&aBuf[4]) + cksum0;
  }

  *pCksum0 = cksum0;
  *pCksum1 = cksum1;
}

/*
** Update pLog->cksum0 and pLog->cksum1 so that the first nBuf bytes in the 
** write buffer (pLog->buf) are included in the checksum.
*/
static void logUpdateCksum(LogWriter *pLog, int nBuf){
  assert( (pLog->iCksumBuf % 8)==0 );
  assert( pLog->iCksumBuf<=nBuf );
  assert( (nBuf % 8)==0 || nBuf==pLog->buf.n );
  if( nBuf>pLog->iCksumBuf ){
    logCksumUnaligned(
        &pLog->buf.z[pLog->iCksumBuf], nBuf-pLog->iCksumBuf, 
        &pLog->cksum0, &pLog->cksum1
    );
  }
  pLog->iCksumBuf = nBuf;
}

static i64 firstByteOnSector(LogWriter *pLog, i64 iOff){
  return (iOff / pLog->szSector) * pLog->szSector;
}
static i64 lastByteOnSector(LogWriter *pLog, i64 iOff){
  return firstByteOnSector(pLog, iOff) + pLog->szSector - 1;
}

/*
** If possible, reclaim log file space. Log file space is reclaimed after
** a snapshot that points to the same data in the database file is synced
** into the db header.
*/
static int logReclaimSpace(lsm_db *pDb){
  int rc;
  int iMeta;
  int bRotrans;                   /* True if there exists some ro-trans */

  /* Test if there exists some other connection with a read-only transaction
  ** open. If there does, then log file space may not be reclaimed.  */
  rc = lsmDetectRoTrans(pDb, &bRotrans);
  if( rc!=LSM_OK || bRotrans ) return rc;

  iMeta = (int)pDb->pShmhdr->iMetaPage;
  if( iMeta==1 || iMeta==2 ){
    DbLog *pLog = &pDb->treehdr.log;
    i64 iSyncedId;

    /* Read the snapshot-id of the snapshot stored on meta-page iMeta. Note
    ** that in theory, the value read is untrustworthy (due to a race 
    ** condition - see comments above lsmFsReadSyncedId()). So it is only 
    ** ever used to conclude that no log space can be reclaimed. If it seems
    ** to indicate that it may be possible to reclaim log space, a
    ** second call to lsmCheckpointSynced() (which does return trustworthy
    ** values) is made below to confirm.  */
    rc = lsmFsReadSyncedId(pDb, iMeta, &iSyncedId);

    if( rc==LSM_OK && pLog->iSnapshotId!=iSyncedId ){
      i64 iSnapshotId = 0;
      i64 iOff = 0;
      rc = lsmCheckpointSynced(pDb, &iSnapshotId, &iOff, 0);
      if( rc==LSM_OK && pLog->iSnapshotId<iSnapshotId ){
        int iRegion;
        for(iRegion=0; iRegion<3; iRegion++){
          LogRegion *p = &pLog->aRegion[iRegion];
          if( iOff>=p->iStart && iOff<=p->iEnd ) break;
          p->iStart = 0;
          p->iEnd = 0;
        }
        assert( iRegion<3 );
        pLog->aRegion[iRegion].iStart = iOff;
        pLog->iSnapshotId = iSnapshotId;
      }
    }
  }
  return rc;
}

/*
** This function is called when a write-transaction is first opened. It
** is assumed that the caller is holding the client-mutex when it is 
** called.
**
** Before returning, this function allocates the LogWriter object that
** will be used to write to the log file during the write transaction.
** LSM_OK is returned if no error occurs, otherwise an LSM error code.
*/
int lsmLogBegin(lsm_db *pDb){
  int rc = LSM_OK;
  LogWriter *pNew;
  LogRegion *aReg;

  if( pDb->bUseLog==0 ) return LSM_OK;

  /* If the log file has not yet been opened, open it now. Also allocate
  ** the LogWriter structure, if it has not already been allocated.  */
  rc = lsmFsOpenLog(pDb, 0);
  if( pDb->pLogWriter==0 ){
    pNew = lsmMallocZeroRc(pDb->pEnv, sizeof(LogWriter), &rc);
    if( pNew ){
      lsmStringInit(&pNew->buf, pDb->pEnv);
      rc = lsmStringExtend(&pNew->buf, 2);
    }
    pDb->pLogWriter = pNew;
  }else{
    pNew = pDb->pLogWriter;
    assert( (u8 *)(&pNew[1])==(u8 *)(&((&pNew->buf)[1])) );
    memset(pNew, 0, ((u8 *)&pNew->buf) - (u8 *)pNew);
    pNew->buf.n = 0;
  }

  if( rc==LSM_OK ){
    /* The following call detects whether or not a new snapshot has been 
    ** synced into the database file. If so, it updates the contents of
    ** the pDb->treehdr.log structure to reclaim any space in the log
    ** file that is no longer required. 
    **
    ** TODO: Calling this every transaction is overkill. And since the 
    ** call has to read and checksum a snapshot from the database file,
    ** it is expensive. It would be better to figure out a way so that
    ** this is only called occasionally - say for every 32KB written to 
    ** the log file.
    */
    rc = logReclaimSpace(pDb);
  }
  if( rc!=LSM_OK ){
    lsmLogClose(pDb);
    return rc;
  }

  /* Set the effective sector-size for this transaction. Sectors are assumed
  ** to be one byte in size if the safety-mode is OFF or NORMAL, or as
  ** reported by lsmFsSectorSize if it is FULL.  */
  if( pDb->eSafety==LSM_SAFETY_FULL ){
    pNew->szSector = lsmFsSectorSize(pDb->pFS);
    assert( pNew->szSector>0 );
  }else{
    pNew->szSector = 1;
  }

  /* There are now three scenarios:
  **
  **   1) Regions 0 and 1 are both zero bytes in size and region 2 begins
  **      at a file offset greater than LSM_MIN_LOGWRAP. In this case, wrap
  **      around to the start and write data into the start of the log file. 
  **
  **   2) Region 1 is zero bytes in size and region 2 occurs earlier in the 
  **      file than region 0. In this case, append data to region 2, but
  **      remember to jump over region 1 if required.
  **
  **   3) Region 2 is the last in the file. Append to it.
  */
  aReg = &pDb->treehdr.log.aRegion[0];

  assert( aReg[0].iEnd==0 || aReg[0].iEnd>aReg[0].iStart );
  assert( aReg[1].iEnd==0 || aReg[1].iEnd>aReg[1].iStart );

  pNew->cksum0 = pDb->treehdr.log.cksum0;
  pNew->cksum1 = pDb->treehdr.log.cksum1;

  if( aReg[0].iEnd==0 && aReg[1].iEnd==0 && aReg[2].iStart>=LSM_MIN_LOGWRAP ){
    /* Case 1. Wrap around to the start of the file. Write an LSM_LOG_JUMP 
    ** into the log file in this case. Pad it out to 8 bytes using a PAD2
    ** record so that the checksums can be updated immediately.  */
    u8 aJump[] = { 
      LSM_LOG_PAD2, 0x04, 0x00, 0x00, 0x00, 0x00, LSM_LOG_JUMP, 0x00 
    };

    lsmStringBinAppend(&pNew->buf, aJump, sizeof(aJump));
    logUpdateCksum(pNew, pNew->buf.n);
    rc = lsmFsWriteLog(pDb->pFS, aReg[2].iEnd, &pNew->buf);
    pNew->iCksumBuf = pNew->buf.n = 0;

    aReg[2].iEnd += 8;
    pNew->jump = aReg[0] = aReg[2];
    aReg[2].iStart = aReg[2].iEnd = 0;
  }else if( aReg[1].iEnd==0 && aReg[2].iEnd<aReg[0].iEnd ){
    /* Case 2. */
    pNew->iOff = aReg[2].iEnd;
    pNew->jump = aReg[0];
  }else{
    /* Case 3. */
    assert( aReg[2].iStart>=aReg[0].iEnd && aReg[2].iStart>=aReg[1].iEnd );
    pNew->iOff = aReg[2].iEnd;
  }

  if( pNew->jump.iStart ){
    i64 iRound;
    assert( pNew->jump.iStart>pNew->iOff );

    iRound = firstByteOnSector(pNew, pNew->jump.iStart);
    if( iRound>pNew->iOff ) pNew->jump.iStart = iRound;
    pNew->jump.iEnd = lastByteOnSector(pNew, pNew->jump.iEnd);
  }

  assert( pDb->pLogWriter==pNew );
  return rc;
}

/*
** This function is called when a write-transaction is being closed.
** Parameter bCommit is true if the transaction is being committed,
** or false otherwise. The caller must hold the client-mutex to call
** this function.
**
** A call to this function deletes the LogWriter object allocated by
** lsmLogBegin(). If the transaction is being committed, the shared state
** in *pLog is updated before returning.
*/
void lsmLogEnd(lsm_db *pDb, int bCommit){
  DbLog *pLog;
  LogWriter *p;
  p = pDb->pLogWriter;

  if( p==0 ) return;
  pLog = &pDb->treehdr.log;

  if( bCommit ){
    pLog->aRegion[2].iEnd = p->iOff;
    pLog->cksum0 = p->cksum0;
    pLog->cksum1 = p->cksum1;
    if( p->iRegion1End ){
      /* This happens when the transaction had to jump over some other
      ** part of the log.  */
      assert( pLog->aRegion[1].iEnd==0 );
      assert( pLog->aRegion[2].iStart<p->iRegion1End );
      pLog->aRegion[1].iStart = pLog->aRegion[2].iStart;
      pLog->aRegion[1].iEnd = p->iRegion1End;
      pLog->aRegion[2].iStart = p->iRegion2Start;
    }
  }
}

static int jumpIfRequired(
  lsm_db *pDb,
  LogWriter *pLog,
  int nReq,
  int *pbJump
){
  /* Determine if it is necessary to add an LSM_LOG_JUMP to jump over the
  ** jump region before writing the LSM_LOG_WRITE or DELETE record. This
  ** is necessary if there is insufficient room between the current offset
  ** and the jump region to fit the new WRITE/DELETE record and the largest
  ** possible JUMP record with up to 7 bytes of padding (a total of 17 
  ** bytes).  */
  if( (pLog->jump.iStart > (pLog->iOff + pLog->buf.n))
   && (pLog->jump.iStart < (pLog->iOff + pLog->buf.n + (nReq + 17))) 
  ){
    int rc;                       /* Return code */
    i64 iJump;                    /* Offset to jump to */
    u8 aJump[10];                 /* Encoded jump record */
    int nJump;                    /* Valid bytes in aJump[] */
    int nPad;                     /* Bytes of padding required */

    /* Serialize the JUMP record */
    iJump = pLog->jump.iEnd+1;
    aJump[0] = LSM_LOG_JUMP;
    nJump = 1 + lsmVarintPut64(&aJump[1], iJump);

    /* Adding padding to the contents of the buffer so that it will be a 
    ** multiple of 8 bytes in size after the JUMP record is appended. This
    ** is not strictly required, it just makes the keeping the running 
    ** checksum up to date in this file a little simpler.  */
    nPad = (pLog->buf.n + nJump) % 8;
    if( nPad ){
      u8 aPad[7] = {0,0,0,0,0,0,0};
      nPad = 8-nPad;
      if( nPad==1 ){
        aPad[0] = LSM_LOG_PAD1;
      }else{
        aPad[0] = LSM_LOG_PAD2;
        aPad[1] = (u8)(nPad-2);
      }
      rc = lsmStringBinAppend(&pLog->buf, aPad, nPad);
      if( rc!=LSM_OK ) return rc;
    }

    /* Append the JUMP record to the buffer. Then flush the buffer to disk
    ** and update the checksums. The next write to the log file (assuming
    ** there is no transaction rollback) will be to offset iJump (just past
    ** the jump region).  */
    rc = lsmStringBinAppend(&pLog->buf, aJump, nJump);
    if( rc!=LSM_OK ) return rc;
    assert( (pLog->buf.n % 8)==0 );
    rc = lsmFsWriteLog(pDb->pFS, pLog->iOff, &pLog->buf);
    if( rc!=LSM_OK ) return rc;
    logUpdateCksum(pLog, pLog->buf.n);
    pLog->iRegion1End = (pLog->iOff + pLog->buf.n);
    pLog->iRegion2Start = iJump;
    pLog->iOff = iJump;
    pLog->iCksumBuf = pLog->buf.n = 0;
    if( pbJump ) *pbJump = 1;
  }

  return LSM_OK;
}

static int logCksumAndFlush(lsm_db *pDb){
  int rc;                         /* Return code */
  LogWriter *pLog = pDb->pLogWriter;

  /* Calculate the checksum value. Append it to the buffer. */
  logUpdateCksum(pLog, pLog->buf.n);
  lsmPutU32((u8 *)&pLog->buf.z[pLog->buf.n], pLog->cksum0);
  pLog->buf.n += 4;
  lsmPutU32((u8 *)&pLog->buf.z[pLog->buf.n], pLog->cksum1);
  pLog->buf.n += 4;

  /* Write the contents of the buffer to disk. */
  rc = lsmFsWriteLog(pDb->pFS, pLog->iOff, &pLog->buf);
  pLog->iOff += pLog->buf.n;
  pLog->iCksumBuf = pLog->buf.n = 0;

  return rc;
}

/*
** Write the contents of the log-buffer to disk. Then write either a CKSUM
** or COMMIT record, depending on the value of parameter eType.
*/
static int logFlush(lsm_db *pDb, int eType){
  int rc;
  int nReq;
  LogWriter *pLog = pDb->pLogWriter;
  
  assert( eType==LSM_LOG_COMMIT );
  assert( pLog );

  /* Commit record is always 9 bytes in size. */
  nReq = 9;
  if( eType==LSM_LOG_COMMIT && pLog->szSector>1 ) nReq += pLog->szSector + 17;
  rc = jumpIfRequired(pDb, pLog, nReq, 0);

  /* If this is a COMMIT, add padding to the log so that the COMMIT record
  ** is aligned against the end of a disk sector. In other words, add padding
  ** so that the first byte following the COMMIT record lies on a different
  ** sector.  */
  if( eType==LSM_LOG_COMMIT && pLog->szSector>1 ){
    int nPad;                     /* Bytes of padding to add */

    /* Determine the value of nPad. */
    nPad = ((pLog->iOff + pLog->buf.n + 9) % pLog->szSector);
    if( nPad ) nPad = pLog->szSector - nPad;
    rc = lsmStringExtend(&pLog->buf, nPad);
    if( rc!=LSM_OK ) return rc;

    while( nPad ){
      if( nPad==1 ){
        pLog->buf.z[pLog->buf.n++] = LSM_LOG_PAD1;
        nPad = 0;
      }else{
        int n = LSM_MIN(200, nPad-2);
        pLog->buf.z[pLog->buf.n++] = LSM_LOG_PAD2;
        pLog->buf.z[pLog->buf.n++] = (char)n;
        nPad -= 2;
        memset(&pLog->buf.z[pLog->buf.n], 0x2B, n);
        pLog->buf.n += n;
        nPad -= n;
      }
    }
  }

  /* Make sure there is room in the log-buffer to add the CKSUM or COMMIT
  ** record. Then add the first byte of it.  */
  rc = lsmStringExtend(&pLog->buf, 9);
  if( rc!=LSM_OK ) return rc;
  pLog->buf.z[pLog->buf.n++] = (char)eType;
  memset(&pLog->buf.z[pLog->buf.n], 0, 8);

  rc = logCksumAndFlush(pDb);

  /* If this is a commit and synchronous=full, sync the log to disk. */
  if( rc==LSM_OK && eType==LSM_LOG_COMMIT && pDb->eSafety==LSM_SAFETY_FULL ){
    rc = lsmFsSyncLog(pDb->pFS);
  }
  return rc;
}

/*
** Append an LSM_LOG_WRITE (if nVal>=0) or LSM_LOG_DELETE (if nVal<0) 
** record to the database log.
*/
int lsmLogWrite(
  lsm_db *pDb,                    /* Database handle */
  int eType,
  void *pKey, int nKey,           /* Database key to write to log */
  void *pVal, int nVal            /* Database value (or nVal<0) to write */
){
  int rc = LSM_OK;
  LogWriter *pLog;                /* Log object to write to */
  int nReq;                       /* Bytes of space required in log */
  int bCksum = 0;                 /* True to embed a checksum in this record */

  assert( eType==LSM_WRITE || eType==LSM_DELETE || eType==LSM_DRANGE );
  assert( LSM_LOG_WRITE==LSM_WRITE );
  assert( LSM_LOG_DELETE==LSM_DELETE );
  assert( LSM_LOG_DRANGE==LSM_DRANGE );
  assert( (eType==LSM_LOG_DELETE)==(nVal<0) );

  if( pDb->bUseLog==0 ) return LSM_OK;
  pLog = pDb->pLogWriter;

  /* Determine how many bytes of space are required, assuming that a checksum
  ** will be embedded in this record (even though it may not be).  */
  nReq = 1 + lsmVarintLen32(nKey) + 8 + nKey;
  if( eType!=LSM_LOG_DELETE ) nReq += lsmVarintLen32(nVal) + nVal;

  /* Jump over the jump region if required. Set bCksum to true to tell the
  ** code below to include a checksum in the record if either (a) writing
  ** this record would mean that more than LSM_CKSUM_MAXDATA bytes of data
  ** have been written to the log since the last checksum, or (b) the jump
  ** is taken.  */
  rc = jumpIfRequired(pDb, pLog, nReq, &bCksum);
  if( (pLog->buf.n+nReq) > LSM_CKSUM_MAXDATA ) bCksum = 1;

  if( rc==LSM_OK ){
    rc = lsmStringExtend(&pLog->buf, nReq);
  }
  if( rc==LSM_OK ){
    u8 *a = (u8 *)&pLog->buf.z[pLog->buf.n];
    
    /* Write the record header - the type byte followed by either 1 (for
    ** DELETE) or 2 (for WRITE) varints.  */
    assert( LSM_LOG_WRITE_CKSUM == (LSM_LOG_WRITE | 0x0001) );
    assert( LSM_LOG_DELETE_CKSUM == (LSM_LOG_DELETE | 0x0001) );
    assert( LSM_LOG_DRANGE_CKSUM == (LSM_LOG_DRANGE | 0x0001) );
    *(a++) = (u8)eType | (u8)bCksum;
    a += lsmVarintPut32(a, nKey);
    if( eType!=LSM_LOG_DELETE ) a += lsmVarintPut32(a, nVal);

    if( bCksum ){
      pLog->buf.n = (a - (u8 *)pLog->buf.z);
      rc = logCksumAndFlush(pDb);
      a = (u8 *)&pLog->buf.z[pLog->buf.n];
    }

    memcpy(a, pKey, nKey);
    a += nKey;
    if( eType!=LSM_LOG_DELETE ){
      memcpy(a, pVal, nVal);
      a += nVal;
    }
    pLog->buf.n = a - (u8 *)pLog->buf.z;
    assert( pLog->buf.n<=pLog->buf.nAlloc );
  }

  return rc;
}

/*
** Append an LSM_LOG_COMMIT record to the database log.
*/
int lsmLogCommit(lsm_db *pDb){
  if( pDb->bUseLog==0 ) return LSM_OK;
  return logFlush(pDb, LSM_LOG_COMMIT);
}

/*
** Store the current offset and other checksum related information in the
** structure *pMark. Later, *pMark can be passed to lsmLogSeek() to "rewind"
** the LogWriter object to the current log file offset. This is used when
** rolling back savepoint transactions.
*/
void lsmLogTell(
  lsm_db *pDb,                    /* Database handle */
  LogMark *pMark                  /* Populate this object with current offset */
){
  LogWriter *pLog;
  int nCksum;

  if( pDb->bUseLog==0 ) return;
  pLog = pDb->pLogWriter;
  nCksum = pLog->buf.n & 0xFFFFFFF8;
  logUpdateCksum(pLog, nCksum);
  assert( pLog->iCksumBuf==nCksum );
  pMark->nBuf = pLog->buf.n - nCksum;
  memcpy(pMark->aBuf, &pLog->buf.z[nCksum], pMark->nBuf);

  pMark->iOff = pLog->iOff + pLog->buf.n;
  pMark->cksum0 = pLog->cksum0;
  pMark->cksum1 = pLog->cksum1;
}

/*
** Seek (rewind) back to the log file offset stored by an ealier call to
** lsmLogTell() in *pMark.
*/
void lsmLogSeek(
  lsm_db *pDb,                    /* Database handle */
  LogMark *pMark                  /* Object containing log offset to seek to */
){
  LogWriter *pLog;

  if( pDb->bUseLog==0 ) return;
  pLog = pDb->pLogWriter;

  assert( pMark->iOff<=pLog->iOff+pLog->buf.n );
  if( (pMark->iOff & 0xFFFFFFF8)>=pLog->iOff ){
    pLog->buf.n = (int)(pMark->iOff - pLog->iOff);
    pLog->iCksumBuf = (pLog->buf.n & 0xFFFFFFF8);
  }else{
    pLog->buf.n = pMark->nBuf;
    memcpy(pLog->buf.z, pMark->aBuf, pMark->nBuf);
    pLog->iCksumBuf = 0;
    pLog->iOff = pMark->iOff - pMark->nBuf;
  }
  pLog->cksum0 = pMark->cksum0;
  pLog->cksum1 = pMark->cksum1;

  if( pMark->iOff > pLog->iRegion1End ) pLog->iRegion1End = 0;
  if( pMark->iOff > pLog->iRegion2Start ) pLog->iRegion2Start = 0;
}

/*
** This function does the work for an lsm_info(LOG_STRUCTURE) request.
*/
int lsmInfoLogStructure(lsm_db *pDb, char **pzVal){
  int rc = LSM_OK;
  char *zVal = 0;

  /* If there is no read or write transaction open, read the latest 
  ** tree-header from shared-memory to report on. If necessary, update
  ** it based on the contents of the database header.  
  **
  ** No locks are taken here - these are passive read operations only.
  */
  if( pDb->pCsr==0 && pDb->nTransOpen==0 ){
    rc = lsmTreeLoadHeader(pDb, 0);
    if( rc==LSM_OK ) rc = logReclaimSpace(pDb);
  }

  if( rc==LSM_OK ){
    DbLog *pLog = &pDb->treehdr.log;
    zVal = lsmMallocPrintf(pDb->pEnv, 
        "%d %d %d %d %d %d", 
        (int)pLog->aRegion[0].iStart, (int)pLog->aRegion[0].iEnd,
        (int)pLog->aRegion[1].iStart, (int)pLog->aRegion[1].iEnd,
        (int)pLog->aRegion[2].iStart, (int)pLog->aRegion[2].iEnd
    );
    if( !zVal ) rc = LSM_NOMEM_BKPT;
  }

  *pzVal = zVal;
  return rc;
}

/*************************************************************************
** Begin code for log recovery.
*/

typedef struct LogReader LogReader;
struct LogReader {
  FileSystem *pFS;                /* File system to read from */
  i64 iOff;                       /* File offset at end of buf content */
  int iBuf;                       /* Current read offset in buf */
  LsmString buf;                  /* Buffer containing file content */

  int iCksumBuf;                  /* Offset in buf corresponding to cksum[01] */
  u32 cksum0;                     /* Checksum 0 at offset iCksumBuf */
  u32 cksum1;                     /* Checksum 1 at offset iCksumBuf */
};

static void logReaderBlob(
  LogReader *p,                   /* Log reader object */
  LsmString *pBuf,                /* Dynamic storage, if required */
  int nBlob,                      /* Number of bytes to read */
  u8 **ppBlob,                    /* OUT: Pointer to blob read */
  int *pRc                        /* IN/OUT: Error code */
){
  static const int LOG_READ_SIZE = 512;
  int rc = *pRc;                  /* Return code */
  int nReq = nBlob;               /* Bytes required */

  while( rc==LSM_OK && nReq>0 ){
    int nAvail;                   /* Bytes of data available in p->buf */
    if( p->buf.n==p->iBuf ){
      int nCksum;                 /* Total bytes requiring checksum */
      int nCarry = 0;             /* Total bytes requiring checksum */

      nCksum = p->iBuf - p->iCksumBuf;
      if( nCksum>0 ){
        nCarry = nCksum % 8;
        nCksum = ((nCksum / 8) * 8);
        if( nCksum>0 ){
          logCksumUnaligned(
              &p->buf.z[p->iCksumBuf], nCksum, &p->cksum0, &p->cksum1
          );
        }
      }
      if( nCarry>0 ) memcpy(p->buf.z, &p->buf.z[p->iBuf-nCarry], nCarry);
      p->buf.n = nCarry;
      p->iBuf = nCarry;

      rc = lsmFsReadLog(p->pFS, p->iOff, LOG_READ_SIZE, &p->buf);
      if( rc!=LSM_OK ) break;
      p->iCksumBuf = 0;
      p->iOff += LOG_READ_SIZE;
    }

    nAvail = p->buf.n - p->iBuf;
    if( ppBlob && nReq==nBlob && nBlob<=nAvail ){
      *ppBlob = (u8 *)&p->buf.z[p->iBuf];
      p->iBuf += nBlob;
      nReq = 0;
    }else{
      int nCopy = LSM_MIN(nAvail, nReq);
      if( nBlob==nReq ){
        pBuf->n = 0;
      }
      rc = lsmStringBinAppend(pBuf, (u8 *)&p->buf.z[p->iBuf], nCopy);
      nReq -= nCopy;
      p->iBuf += nCopy;
      if( nReq==0 && ppBlob ){
        *ppBlob = (u8*)pBuf->z;
      }
    }
  }

  *pRc = rc;
}

static void logReaderVarint(
  LogReader *p, 
  LsmString *pBuf,
  int *piVal,                     /* OUT: Value read from log */
  int *pRc                        /* IN/OUT: Error code */
){
  if( *pRc==LSM_OK ){
    u8 *aVarint;
    if( p->buf.n==p->iBuf ){
      logReaderBlob(p, 0, 10, &aVarint, pRc);
      if( LSM_OK==*pRc ) p->iBuf -= (10 - lsmVarintGet32(aVarint, piVal));
    }else{
      logReaderBlob(p, pBuf, lsmVarintSize(p->buf.z[p->iBuf]), &aVarint, pRc);
      if( LSM_OK==*pRc ) lsmVarintGet32(aVarint, piVal);
    }
  }
}

static void logReaderByte(LogReader *p, u8 *pByte, int *pRc){
  u8 *pPtr = 0;
  logReaderBlob(p, 0, 1, &pPtr, pRc);
  if( pPtr ) *pByte = *pPtr;
}

static void logReaderCksum(LogReader *p, LsmString *pBuf, int *pbEof, int *pRc){
  if( *pRc==LSM_OK ){
    u8 *pPtr = 0;
    u32 cksum0, cksum1;
    int nCksum = p->iBuf - p->iCksumBuf;

    /* Update in-memory (expected) checksums */
    assert( nCksum>=0 );
    logCksumUnaligned(&p->buf.z[p->iCksumBuf], nCksum, &p->cksum0, &p->cksum1);
    p->iCksumBuf = p->iBuf + 8;
    logReaderBlob(p, pBuf, 8, &pPtr, pRc);
    assert( pPtr || *pRc );

    /* Read the checksums from the log file. Set *pbEof if they do not match. */
    if( pPtr ){
      cksum0 = lsmGetU32(pPtr);
      cksum1 = lsmGetU32(&pPtr[4]);
      *pbEof = (cksum0!=p->cksum0 || cksum1!=p->cksum1);
      p->iCksumBuf = p->iBuf;
    }
  }
}

static void logReaderInit(
  lsm_db *pDb,                    /* Database handle */
  DbLog *pLog,                    /* Log object associated with pDb */
  int bInitBuf,                   /* True if p->buf is uninitialized */
  LogReader *p                    /* Initialize this LogReader object */
){
  p->pFS = pDb->pFS;
  p->iOff = pLog->aRegion[2].iStart;
  p->cksum0 = pLog->cksum0;
  p->cksum1 = pLog->cksum1;
  if( bInitBuf ){ lsmStringInit(&p->buf, pDb->pEnv); }
  p->buf.n = 0;
  p->iCksumBuf = 0;
  p->iBuf = 0;
}

/*
** This function is called after reading the header of a LOG_DELETE or
** LOG_WRITE record. Parameter nByte is the total size of the key and
** value that follow the header just read. Return true if the size and
** position of the record indicate that it should contain a checksum.
*/
static int logRequireCksum(LogReader *p, int nByte){
  return ((p->iBuf + nByte - p->iCksumBuf) > LSM_CKSUM_MAXDATA);
}

/*
** Recover the contents of the log file.
*/
int lsmLogRecover(lsm_db *pDb){
  LsmString buf1;                 /* Key buffer */
  LsmString buf2;                 /* Value buffer */
  LogReader reader;               /* Log reader object */
  int rc = LSM_OK;                /* Return code */
  int nCommit = 0;                /* Number of transactions to recover */
  int iPass;
  int nJump = 0;                  /* Number of LSM_LOG_JUMP records in pass 0 */
  DbLog *pLog;
  int bOpen;

  rc = lsmFsOpenLog(pDb, &bOpen);
  if( rc!=LSM_OK ) return rc;

  rc = lsmTreeInit(pDb);
  if( rc!=LSM_OK ) return rc;

  pLog = &pDb->treehdr.log;
  lsmCheckpointLogoffset(pDb->pShmhdr->aSnap2, pLog);

  logReaderInit(pDb, pLog, 1, &reader);
  lsmStringInit(&buf1, pDb->pEnv);
  lsmStringInit(&buf2, pDb->pEnv);

  /* The outer for() loop runs at most twice. The first iteration is to 
  ** count the number of committed transactions in the log. The second 
  ** iterates through those transactions and updates the in-memory tree 
  ** structure with their contents.  */
  if( bOpen ){
    for(iPass=0; iPass<2 && rc==LSM_OK; iPass++){
      int bEof = 0;

      while( rc==LSM_OK && !bEof ){
        u8 eType = 0;
        logReaderByte(&reader, &eType, &rc);

        switch( eType ){
          case LSM_LOG_PAD1:
            break;

          case LSM_LOG_PAD2: {
            int nPad;
            logReaderVarint(&reader, &buf1, &nPad, &rc);
            logReaderBlob(&reader, &buf1, nPad, 0, &rc);
            break;
          }

          case LSM_LOG_DRANGE:
          case LSM_LOG_DRANGE_CKSUM:
          case LSM_LOG_WRITE:
          case LSM_LOG_WRITE_CKSUM: {
            int nKey;
            int nVal;
            u8 *aVal;
            logReaderVarint(&reader, &buf1, &nKey, &rc);
            logReaderVarint(&reader, &buf2, &nVal, &rc);

            if( eType==LSM_LOG_WRITE_CKSUM || eType==LSM_LOG_DRANGE_CKSUM ){
              logReaderCksum(&reader, &buf1, &bEof, &rc);
            }else{
              bEof = logRequireCksum(&reader, nKey+nVal);
            }
            if( bEof ) break;

            logReaderBlob(&reader, &buf1, nKey, 0, &rc);
            logReaderBlob(&reader, &buf2, nVal, &aVal, &rc);
            if( iPass==1 && rc==LSM_OK ){ 
              if( eType==LSM_LOG_WRITE || eType==LSM_LOG_WRITE_CKSUM ){
                rc = lsmTreeInsert(pDb, (u8 *)buf1.z, nKey, aVal, nVal);
              }else{
                rc = lsmTreeDelete(pDb, (u8 *)buf1.z, nKey, aVal, nVal);
              }
            }
            break;
          }

          case LSM_LOG_DELETE:
          case LSM_LOG_DELETE_CKSUM: {
            int nKey; u8 *aKey;
            logReaderVarint(&reader, &buf1, &nKey, &rc);

            if( eType==LSM_LOG_DELETE_CKSUM ){
              logReaderCksum(&reader, &buf1, &bEof, &rc);
            }else{
              bEof = logRequireCksum(&reader, nKey);
            }
            if( bEof ) break;

            logReaderBlob(&reader, &buf1, nKey, &aKey, &rc);
            if( iPass==1 && rc==LSM_OK ){ 
              rc = lsmTreeInsert(pDb, aKey, nKey, NULL, -1);
            }
            break;
          }

          case LSM_LOG_COMMIT:
            logReaderCksum(&reader, &buf1, &bEof, &rc);
            if( bEof==0 ){
              nCommit++;
              assert( nCommit>0 || iPass==1 );
              if( nCommit==0 ) bEof = 1;
            }
            break;

          case LSM_LOG_JUMP: {
            int iOff = 0;
            logReaderVarint(&reader, &buf1, &iOff, &rc);
            if( rc==LSM_OK ){
              if( iPass==1 ){
                if( pLog->aRegion[2].iStart==0 ){
                  assert( pLog->aRegion[1].iStart==0 );
                  pLog->aRegion[1].iEnd = reader.iOff;
                }else{
                  assert( pLog->aRegion[0].iStart==0 );
                  pLog->aRegion[0].iStart = pLog->aRegion[2].iStart;
                  pLog->aRegion[0].iEnd = reader.iOff-reader.buf.n+reader.iBuf;
                }
                pLog->aRegion[2].iStart = iOff;
              }else{
                if( (nJump++)==2 ){
                  bEof = 1;
                }
              }

              reader.iOff = iOff;
              reader.buf.n = reader.iBuf;
            }
            break;
          }

          default:
            /* Including LSM_LOG_EOF */
            bEof = 1;
            break;
        }
      }

      if( rc==LSM_OK && iPass==0 ){
        if( nCommit==0 ){
          if( pLog->aRegion[2].iStart==0 ){
            iPass = 1;
          }else{
            pLog->aRegion[2].iStart = 0;
            iPass = -1;
            lsmCheckpointZeroLogoffset(pDb);
          }
        }
        logReaderInit(pDb, pLog, 0, &reader);
        nCommit = nCommit * -1;
      }
    }
  }

  /* Initialize DbLog object */
  if( rc==LSM_OK ){
    pLog->aRegion[2].iEnd = reader.iOff - reader.buf.n + reader.iBuf;
    pLog->cksum0 = reader.cksum0;
    pLog->cksum1 = reader.cksum1;
  }

  if( rc==LSM_OK ){
    rc = lsmFinishRecovery(pDb);
  }else{
    lsmFinishRecovery(pDb);
  }

  if( pDb->bRoTrans ){
    lsmFsCloseLog(pDb);
  }

  lsmStringClear(&buf1);
  lsmStringClear(&buf2);
  lsmStringClear(&reader.buf);
  return rc;
}

void lsmLogClose(lsm_db *db){
  if( db->pLogWriter ){
    lsmFree(db->pEnv, db->pLogWriter->buf.z);
    lsmFree(db->pEnv, db->pLogWriter);
    db->pLogWriter = 0;
  }
}
