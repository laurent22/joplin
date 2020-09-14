# 2008 July 9
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
# This file implements tests to make sure SQLite does not crash or
# segfault if it sees a corrupt database file.  It specifically focuses
# on corruption in the form of duplicate entries on the freelist.
#
# $Id: corrupt9.test,v 1.3 2009/06/04 02:47:04 shane Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# These tests deal with corrupt database files
#
database_may_be_corrupt

# We must have the page_size pragma for these tests to work.
#
ifcapable !pager_pragmas {
  finish_test
  return
}

# Return the offset to the first (trunk) page of the freelist.  Return
# zero of the freelist is empty.
#
proc freelist_trunk_offset {filename} {
  if {[hexio_read $filename 36 4]==0} {return 0}
  set pgno [hexio_get_int [hexio_read $filename 32 4]]
  return [expr {($pgno-1)*[hexio_get_int [hexio_read $filename 16 2]]}]
}

# This procedure looks at the first trunk page of the freelist and
# corrupts that page by overwriting up to N entries with duplicates
# of the first entry.
#
proc corrupt_freelist {filename N} {
  set offset [freelist_trunk_offset $filename]
  if {$offset==0} {error "Freelist is empty"}
  set cnt [hexio_get_int [hexio_read $filename [expr {$offset+4}] 4]]
  set pgno [hexio_read $filename [expr {$offset+8}] 4]
  for {set i 12} {$N>0 && $i<8+4*$cnt} {incr i 4; incr N -1} {
    hexio_write $filename [expr {$offset+$i}] $pgno
  }
}

# Create a database to work with.  Make sure there are plenty of
# entries on the freelist.
#
do_test corrupt9-1.1 {
  execsql {
    PRAGMA auto_vacuum=NONE;
    PRAGMA page_size=1024;
    CREATE TABLE t1(x);
    INSERT INTO t1(x) VALUES(1);
    INSERT INTO t1(x) VALUES(2);
    INSERT INTO t1(x) SELECT x+2 FROM t1;
    INSERT INTO t1(x) SELECT x+4 FROM t1;
    INSERT INTO t1(x) SELECT x+8 FROM t1;
    INSERT INTO t1(x) SELECT x+16 FROM t1;
    INSERT INTO t1(x) SELECT x+32 FROM t1;
    INSERT INTO t1(x) SELECT x+64 FROM t1;
    INSERT INTO t1(x) SELECT x+128 FROM t1;
    INSERT INTO t1(x) SELECT x+256 FROM t1;
    CREATE TABLE t2(a,b);
    INSERT INTO t2 SELECT x, x*x FROM t1;
    CREATE INDEX i1 ON t1(x);
    CREATE INDEX i2 ON t2(b,a);
    DROP INDEX i2;
  }
  expr {[file size test.db]>1024*24}
} {1}
integrity_check corrupt9-1.2

# Corrupt the freelist by adding duplicate entries to the freelist.
# Make sure the corruption is detected.
#
db close
forcecopy test.db test.db-template

corrupt_freelist test.db 1
sqlite3 db test.db
do_test corrupt9-2.1 {
  set x [db eval {PRAGMA integrity_check}]
  expr {$x!="ok"}
} {1}
do_test corrupt9-2.2 {
  catchsql {
    CREATE INDEX i2 ON t2(b,a);
    REINDEX;
  }
} {1 {database disk image is malformed}}


db close
forcecopy test.db-template test.db
corrupt_freelist test.db 2
sqlite3 db test.db
do_test corrupt9-3.1 {
  set x [db eval {PRAGMA integrity_check}]
  expr {$x!="ok"}
} {1}
do_test corrupt9-3.2 {
  catchsql {
    CREATE INDEX i2 ON t2(b,a);
    REINDEX;
  }
} {1 {database disk image is malformed}}

db close
forcecopy test.db-template test.db
corrupt_freelist test.db 3
sqlite3 db test.db
do_test corrupt9-4.1 {
  set x [db eval {PRAGMA integrity_check}]
  expr {$x!="ok"}
} {1}
do_test corrupt9-4.2 {
  catchsql {
    CREATE INDEX i2 ON t2(b,a);
    REINDEX;
  }
} {1 {database disk image is malformed}}
 

finish_test
