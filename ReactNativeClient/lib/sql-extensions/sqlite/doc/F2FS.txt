
SQLite's OS layer contains the following definitions used in F2FS related
calls:

#define F2FS_IOCTL_MAGIC        0xf5
#define F2FS_IOC_START_ATOMIC_WRITE     _IO(F2FS_IOCTL_MAGIC, 1)
#define F2FS_IOC_COMMIT_ATOMIC_WRITE    _IO(F2FS_IOCTL_MAGIC, 2)
#define F2FS_IOC_START_VOLATILE_WRITE   _IO(F2FS_IOCTL_MAGIC, 3)
#define F2FS_IOC_ABORT_VOLATILE_WRITE   _IO(F2FS_IOCTL_MAGIC, 5)
#define F2FS_IOC_GET_FEATURES           _IOR(F2FS_IOCTL_MAGIC, 12, u32)
#define F2FS_FEATURE_ATOMIC_WRITE       0x0004

After opening a database file on Linux (including Android), SQLite determines
whether or not a file supports F2FS atomic commits as follows:

  u32 flags = 0;
  rc = ioctl(fd, F2FS_IOC_GET_FEATURES, &flags);
  if( rc==0 && (flags & F2FS_FEATURE_ATOMIC_WRITE) ){
    /* File supports F2FS atomic commits */
  }else{
    /* File does NOT support F2FS atomic commits */
  }

where "fd" is the file-descriptor open on the database file.

Usually, when writing to a database file that supports atomic commits, SQLite
accumulates the entire transaction in heap memory, deferring all writes to the
db file until the transaction is committed.

When it is time to commit a transaction on a file that supports atomic
commits, SQLite does:

  /* Take an F_WRLCK lock on the database file. This prevents any other
  ** SQLite clients from reading or writing the file until the lock
  ** is released.  */
  rc = fcntl(fd, F_SETLK, ...);
  if( rc!=0 ) goto failed;

  rc = ioctl(fd, F2FS_IOC_START_ATOMIC_WRITE);
  if( rc!=0 ) goto fallback_to_legacy_journal_commit;

  foreach (dirty page){
    rc = write(fd, ...dirty page...);
    if( rc!=0 ){
      ioctl(fd, F2FS_IOC_ABORT_VOLATILE_WRITE);
      goto fallback_to_legacy_journal_commit;
    }
  }

  rc = ioctl(fd, F2FS_IOC_COMMIT_ATOMIC_WRITE);
  if( rc!=0 ){
    ioctl(fd, F2FS_IOC_ABORT_VOLATILE_WRITE);
    goto fallback_to_legacy_journal_commit;
  }

  /* If we get there, the transaction has been successfully 
  ** committed to persistent storage. The following call
  ** relinquishes the F_WRLCK lock.  */
  fcntl(fd, F_SETLK, ...);

Assumptions:

1. After either of the F2FS_IOC_ABORT_VOLATILE_WRITE calls return,
   the database file is in the state that it was in before
   F2FS_IOC_START_ATOMIC_WRITE was invoked. Even if the ioctl()
   fails - we're ignoring the return code.

   This is true regardless of the type of error that occurred in
   ioctl() or write().

2. If the system fails before the F2FS_IOC_COMMIT_ATOMIC_WRITE is
   completed, then following a reboot the database file is in the
   state that it was in before F2FS_IOC_START_ATOMIC_WRITE was invoked.
   Or, if the write was commited right before the system failed, in a 
   state indicating that all write() calls were successfully committed
   to persistent storage before the failure occurred.

3. If the process crashes before the F2FS_IOC_COMMIT_ATOMIC_WRITE is
   completed then the file is automatically restored to the state that
   it was in before F2FS_IOC_START_ATOMIC_WRITE was called. This occurs
   before the posix advisory lock is automatically dropped - there is
   no chance that another client will be able to read the file in a
   half-committed state before the rollback operation occurs.




