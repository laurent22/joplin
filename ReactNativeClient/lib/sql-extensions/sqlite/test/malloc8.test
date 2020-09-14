# 2007 April 25
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file contains additional out-of-memory checks (see malloc.tcl)
# added to expose a bug in out-of-memory handling for sqlite3_value_text()
#
# $Id: malloc8.test,v 1.7 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping malloc8 tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}


# The setup is a database with UTF-16 encoding that contains a single
# large string.  We will be running lots of queries against this 
# database.  Because we will be extracting the string as UTF-8, there
# is a type conversion that occurs and thus an opportunity for malloc()
# to fail and for sqlite3_value_text() to return 0 even though
# sqlite3_value_type() returns SQLITE_TEXT.
#

do_malloc_test malloc8-1 -sqlprep {
  PRAGMA encoding='UTF-16';
  CREATE TABLE t1(a);
  INSERT INTO t1 
  VALUES('0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ');
} -sqlbody {
  SELECT lower(a), upper(a), quote(a), trim(a), trim('x',a) FROM t1;
}
do_malloc_test malloc8-2 -sqlprep {
  PRAGMA encoding='UTF-16';
  CREATE TABLE t1(a);
  INSERT INTO t1 
  VALUES('0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ');
} -sqlbody {
  SELECT replace(a,'x','y'), replace('x',a,'y'), replace('x','y',a)
    FROM t1;
}
do_malloc_test malloc8-3 -sqlprep {
  PRAGMA encoding='UTF-16';
  CREATE TABLE t1(a);
  INSERT INTO t1 
  VALUES('0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ');
} -sqlbody {
  SELECT length(a), substr(a, 4, 4) FROM t1;
}
ifcapable datetime {
  do_malloc_test malloc8-4 -sqlprep {
    PRAGMA encoding='UTF-16';
    CREATE TABLE t1(a);
    INSERT INTO t1 
    VALUES('0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ');
  } -sqlbody {
    SELECT julianday(a,a) FROM t1;
  }
}
do_malloc_test malloc8-5 -sqlprep {
  PRAGMA encoding='UTF-16';
  CREATE TABLE t1(a);
  INSERT INTO t1 
  VALUES('0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ');
} -sqlbody {
  SELECT 1 FROM t1 WHERE a LIKE 'hello' ESCAPE NULL;
}
do_malloc_test malloc8-6 -sqlprep {
  PRAGMA encoding='UTF-16';
  CREATE TABLE t1(a);
  INSERT INTO t1 
  VALUES('0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ');
} -sqlbody {
  SELECT hex(randomblob(100));
}

# Ensure that no file descriptors were leaked.
do_test malloc-99.X {
  catch {db close}
  set sqlite_open_file_count
} {0}

finish_test
