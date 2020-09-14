# 2013-08-01
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix corruptG

# This module uses hard-coded offsets which do not work if the reserved_bytes
# value is nonzero.
if {[nonzero_reserved_bytes]} {finish_test; return;}

# These tests deal with corrupt database files
#
database_may_be_corrupt

# Create a simple database with a single entry.  Then corrupt the
# header-size varint on the index payload so that it maps into a
# negative number.  Try to use the database.
#

do_execsql_test 1.1 {
  PRAGMA page_size=512;
  CREATE TABLE t1(a,b,c);
  INSERT INTO t1(rowid,a,b,c) VALUES(52,'abc','xyz','123');
  CREATE INDEX t1abc ON t1(a,b,c);
}

set idxroot [db one {SELECT rootpage FROM sqlite_master WHERE name = 't1abc'}]

# Corrupt the file
db close
hexio_write test.db [expr {$idxroot*512 - 15}] 888080807f
sqlite3 db test.db

# Try to use the file.
do_test 1.2 {
  catchsql {
    SELECT c FROM t1 WHERE a>'abc';
  }
} {1 {database disk image is malformed}}
do_test 1.3 {
  catchsql {
     PRAGMA integrity_check
  }
} {1 {database disk image is malformed}}
do_test 1.4 {
  catchsql {
    SELECT c FROM t1 ORDER BY a;
  }
} {1 {database disk image is malformed}}

# Corrupt the same file in a slightly different way.  Make the record header
# sane, but corrupt one of the serial_type value to indicate a huge payload
# such that the payload begins in allocated space but overflows the buffer.
#
db close
hexio_write test.db [expr {$idxroot*512-15}] 0513ff7f01
sqlite3 db test.db

do_test 2.1 {
  catchsql {
    SELECT rowid FROM t1 WHERE a='abc' and b='xyz123456789XYZ';
  }
} {1 {database disk image is malformed}}

finish_test
