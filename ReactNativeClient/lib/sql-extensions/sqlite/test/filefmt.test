# 2007 April 6
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests to verify database file format.
#
# $Id: filefmt.test,v 1.3 2009/06/18 11:34:43 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

db close
forcedelete test.db test.db-journal

# Database begins with valid 16-byte header string.
#
do_test filefmt-1.1 {
  sqlite3 db test.db
  db eval {CREATE TABLE t1(x)}
  db close
  hexio_read test.db 0 16
} {53514C69746520666F726D6174203300}

# If the 16-byte header is changed, the file will not open
#
do_test filefmt-1.2 {
  hexio_write test.db 0 54
  set x [catch {sqlite3 db test.db} err]
  lappend x $err
} {0 {}}
do_test filefmt-1.3 {
  catchsql {
    SELECT count(*) FROM sqlite_master
  }
} {1 {file is not a database}}
do_test filefmt-1.4 {
  db close
  hexio_write test.db 0 53
  sqlite3 db test.db
  catchsql {
    SELECT count(*) FROM sqlite_master
  }
} {0 1}

# The page-size is stored at offset 16
#
ifcapable pager_pragmas {
  foreach pagesize {512 1024 2048 4096 8192 16384 32768} {
     if {[info exists SQLITE_MAX_PAGE_SIZE]
          && $pagesize>$SQLITE_MAX_PAGE_SIZE} continue
     do_test filefmt-1.5.$pagesize.1 {
       db close
       forcedelete test.db
       sqlite3 db test.db
       db eval "PRAGMA auto_vacuum=OFF"
       db eval "PRAGMA page_size=$pagesize"
       db eval {CREATE TABLE t1(x)}
       file size test.db
     } [expr $pagesize*2]
     do_test filefmt-1.5.$pagesize.2 {
       hexio_get_int [hexio_read test.db 16 2]
     } $pagesize
  }
}

# The page-size must be a power of 2
#
do_test filefmt-1.6 {
  db close
  hexio_write test.db 16 [hexio_render_int16 1025]
  sqlite3 db test.db
  catchsql {
     SELECT count(*) FROM sqlite_master
  }
} {1 {file is not a database}}


# The page-size must be at least 512 bytes
#
do_test filefmt-1.7 {
  db close
  hexio_write test.db 16 [hexio_render_int16 256]
  sqlite3 db test.db
  catchsql {
     SELECT count(*) FROM sqlite_master
  }
} {1 {file is not a database}}

# Usable space per page (page-size minus unused space per page)
# must be at least 480 bytes
#
ifcapable pager_pragmas {
  do_test filefmt-1.8 {
    db close
    forcedelete test.db
    sqlite3 db test.db
    db eval {PRAGMA page_size=512; CREATE TABLE t1(x)}
    db close
    hexio_write test.db 20 21
    sqlite3 db test.db
    catchsql {
       SELECT count(*) FROM sqlite_master
    }
  } {1 {file is not a database}}
}

#-------------------------------------------------------------------------
# The following block of tests - filefmt-2.* - test that versions 3.7.0
# and later can read and write databases that have been modified or created
# by 3.6.23.1 and earlier. The difference difference is that 3.7.0 stores
# the size of the database in the database file header, whereas 3.6.23.1
# always derives this from the size of the file.
#
db close
forcedelete test.db

set a_string_counter 1
proc a_string {n} {
  incr ::a_string_counter
  string range [string repeat "${::a_string_counter}." $n] 1 $n
}
sqlite3 db test.db
db func a_string a_string

do_execsql_test filefmt-2.1.1 {
  PRAGMA page_size = 1024;
  PRAGMA auto_vacuum = 0;
  CREATE TABLE t1(a);
  CREATE INDEX i1 ON t1(a);
  INSERT INTO t1 VALUES(a_string(3000));
  CREATE TABLE t2(a);
  INSERT INTO t2 VALUES(1);
} {}
if {![nonzero_reserved_bytes]} {
  do_test filefmt-2.1.2 {
    hexio_read test.db 28 4
  } {00000009}
}

do_test filefmt-2.1.3 {
  sql36231 { INSERT INTO t1 VALUES(a_string(3000)) }
} {}

do_execsql_test filefmt-2.1.4 { INSERT INTO t2 VALUES(2) } {}
integrity_check filefmt-2.1.5
do_test         filefmt-2.1.6 { hexio_read test.db 28 4 } {00000010}

db close
forcedelete test.db
sqlite3 db test.db
db func a_string a_string

do_execsql_test filefmt-2.2.1 {
  PRAGMA page_size = 1024;
  PRAGMA auto_vacuum = 0;
  CREATE TABLE t1(a);
  CREATE INDEX i1 ON t1(a);
  INSERT INTO t1 VALUES(a_string(3000));
  CREATE TABLE t2(a);
  INSERT INTO t2 VALUES(1);
} {}
if {![nonzero_reserved_bytes]} {
  do_test filefmt-2.2.2 {
    hexio_read test.db 28 4
  } {00000009}
}

do_test filefmt-2.2.3 {
  sql36231 { INSERT INTO t1 VALUES(a_string(3000)) }
} {}

do_execsql_test filefmt-2.2.4 { 
  PRAGMA integrity_check;
  BEGIN;
    INSERT INTO t2 VALUES(2);
    SAVEPOINT a;
      INSERT INTO t2 VALUES(3);
    ROLLBACK TO a;
} {ok}

integrity_check filefmt-2.2.5
do_execsql_test filefmt-2.2.6 { COMMIT } {}
db close
sqlite3 db test.db
integrity_check filefmt-2.2.7

#--------------------------------------------------------------------------
# Check that ticket 89b8c9ac54 is fixed. Before the fix, the SELECT 
# statement would return SQLITE_CORRUPT. The database file was not actually
# corrupted, but SQLite was reporting that it was.
#
db close
forcedelete test.db
sqlite3 db test.db
do_execsql_test filefmt-3.1 {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE t1(a, b);
} {}
do_test filefmt-3.2 { 
  sql36231 { DROP TABLE t1 } 
} {}
do_execsql_test filefmt-3.3 {
  SELECT * FROM sqlite_master;
  PRAGMA integrity_check;
} {ok}

reset_db
do_execsql_test filefmt-4.1 {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE t1(x, y);
  CREATE TABLE t2(x, y);

  INSERT INTO t1 VALUES(randomblob(100), randomblob(100));
  INSERT INTO t1 VALUES(randomblob(100), randomblob(100));
  INSERT INTO t1 VALUES(randomblob(100), randomblob(100));
  INSERT INTO t1 VALUES(randomblob(100), randomblob(100));
  INSERT INTO t1 VALUES(randomblob(100), randomblob(100));
  INSERT INTO t1 VALUES(randomblob(100), randomblob(100));

  INSERT INTO t2 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t2 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t2 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t2 SELECT randomblob(100), randomblob(100) FROM t1;
}

do_test filefmt-4.2 { 
  sql36231 { INSERT INTO t2 SELECT * FROM t1 }
} {}

do_test filefmt-4.3 { 
  forcedelete bak.db
  db backup bak.db
} {}

do_test filefmt-4.4 { 
  sqlite3 db2 bak.db
  db2 eval { PRAGMA integrity_check }
} {ok}
db2 close

finish_test
