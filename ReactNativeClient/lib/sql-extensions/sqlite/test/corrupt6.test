# 2008 May 6
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
# on corrupt SerialTypeLen values.
#
# $Id: corrupt6.test,v 1.2 2008/05/19 15:37:10 shane Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# This module uses hard-coded offsets which do not work if the reserved_bytes
# value is nonzero.
if {[nonzero_reserved_bytes]} {finish_test; return;}

# These tests deal with corrupt database files
#
database_may_be_corrupt

# We must have the page_size pragma for these tests to work.
#
ifcapable !pager_pragmas {
  finish_test
  return
}

# Create a simple, small database.
#
do_test corrupt6-1.1 {
  execsql {
    PRAGMA auto_vacuum=OFF;
    PRAGMA page_size=1024;
    CREATE TABLE t1(x);
    INSERT INTO t1(x) VALUES('varint32-01234567890123456789012345678901234567890123456789');
    INSERT INTO t1(x) VALUES('varint32-01234567890123456789012345678901234567890123456789');
  }
  file size test.db
} [expr {1024*2}]

# Verify that the file format is as we expect.  The page size
# should be 1024 bytes.
#
do_test corrupt6-1.2 {
  hexio_get_int [hexio_read test.db 16 2]
} 1024   ;# The page size is 1024
do_test corrupt6-1.3 {
  hexio_get_int [hexio_read test.db 20 1]
} 0      ;# Unused bytes per page is 0

integrity_check corrupt6-1.4

# Verify SerialTypeLen for first field of two records as we expect.
# SerialTypeLen = (len*2+12) = 60*2+12 = 132
do_test corrupt6-1.5.1 {
  hexio_read test.db 1923 2
} 8103      ;# First text field size is 81 03 == 131
do_test corrupt6-1.5.2 {
  hexio_read test.db 1987 2
} 8103      ;# Second text field size is 81 03 == 131

# Verify simple query results as expected.
do_test corrupt6-1.6 {
  db close
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 0 {varint32 varint32} ]
integrity_check corrupt6-1.7

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Increase SerialTypeLen by 2.
do_test corrupt6-1.8.1 {
  db close
  hexio_write test.db 1923 8105
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Decrease SerialTypeLen by 2.
do_test corrupt6-1.8.2 {
  db close
  hexio_write test.db 1923 8101
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Put value of record 1 / field 1 SerialTypeLen back.
do_test corrupt6-1.8.3 {
  db close
  hexio_write test.db 1923 8103
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 0 {varint32 varint32} ]
integrity_check corrupt6-1.8.4

# Adjust value of record 2 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Increase SerialTypeLen by 2.
do_test corrupt6-1.9.1 {
  db close
  hexio_write test.db 1987 8105
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 2 / field 2 SerialTypeLen and see if the
# corruption is detected.
# Decrease SerialTypeLen by 2.
do_test corrupt6-1.9.2 {
  db close
  hexio_write test.db 1987 8101
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Put value of record 1 / field 2 SerialTypeLen back.
do_test corrupt6-1.9.3 {
  db close
  hexio_write test.db 1987 8103
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 0 {varint32 varint32} ]
integrity_check corrupt6-1.9.4

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF 7F (2 bytes)
do_test corrupt6-1.10.1 {
  db close
  hexio_write test.db 1923 FF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF FF 7F (3 bytes)
do_test corrupt6-1.10.2 {
  db close
  hexio_write test.db 1923 FFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF FF FF 7F (4 bytes)
do_test corrupt6-1.10.3 {
  db close
  hexio_write test.db 1923 FFFFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF FF FF FF 7F (5 bytes)
do_test corrupt6-1.10.4 {
  db close
  hexio_write test.db 1923 FFFFFFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF FF FF FF FF 7F (6 bytes, and overflows).
do_test corrupt6-1.10.5 {
  db close
  hexio_write test.db 1923 FFFFFFFFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF FF FF FF FF FF 7F (7 bytes, and overflows).
do_test corrupt6-1.10.6 {
  db close
  hexio_write test.db 1923 FFFFFFFFFFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF FF FF FF FF FF FF 7F (8 bytes, and overflows).
do_test corrupt6-1.10.7 {
  db close
  hexio_write test.db 1923 FFFFFFFFFFFFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FF FF FF FF FF FF FF FF 7F (9 bytes, and overflows).
do_test corrupt6-1.10.8 {
  db close
  hexio_write test.db 1923 FFFFFFFFFFFFFFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

# Adjust value of record 1 / field 1 SerialTypeLen and see if the
# corruption is detected.
# Set SerialTypeLen to FFFF FF FF FF FF FF FF FF 7F (10 bytes, and overflows).
do_test corrupt6-1.10.9 {
  db close
  hexio_write test.db 1923 FFFFFFFFFFFFFFFFFF7F
  sqlite3 db test.db
  catchsql {
    SELECT substr(x,1,8) FROM t1
  }
} [list 1 {database disk image is malformed}]

finish_test
