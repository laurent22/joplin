# 2001 September 15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specfically
# it tests that the different storage classes (integer, real, text etc.)
# all work correctly.
#
# $Id: types.test,v 1.20 2009/06/29 06:00:37 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Tests in this file are organized roughly as follows:
#
# types-1.*.*: Test that values are stored using the expected storage
#              classes when various forms of literals are inserted into
#              columns with different affinities.
# types-1.1.*: INSERT INTO <table> VALUES(...)
# types-1.2.*: INSERT INTO <table> SELECT...
# types-1.3.*: UPDATE <table> SET...
#
# types-2.*.*: Check that values can be stored and retrieving using the
#              various storage classes.
# types-2.1.*: INTEGER
# types-2.2.*: REAL
# types-2.3.*: NULL
# types-2.4.*: TEXT
# types-2.5.*: Records with a few different storage classes.
#
# types-3.*: Test that the '=' operator respects manifest types.
#

# Disable encryption on the database for this test.
db close
set DB [sqlite3 db test.db; sqlite3_connection_pointer db]
sqlite3_rekey $DB {}

# Create a table with one column for each type of affinity
do_test types-1.1.0 {
  execsql {
    CREATE TABLE t1(i integer, n numeric, t text, o blob);
  }
} {}

# Each element of the following list represents one test case.
#
# The first value of each sub-list is an SQL literal. The following
# four value are the storage classes that would be used if the
# literal were inserted into a column with affinity INTEGER, NUMERIC, TEXT
# or NONE, respectively.
set values {
  { 5.0    integer integer text real    }
  { 5.1    real    real    text real    }
  { 5      integer integer text integer }
  { '5.0'  integer integer text text    }
  { '5.1'  real    real    text text    }
  { '-5.0' integer integer text text    }
  { '-5.0' integer integer text text    }
  { '5'    integer integer text text    }
  { 'abc'  text    text    text text    }
  { NULL   null    null    null null    }
}
ifcapable {bloblit} {
  lappend values  { X'00'  blob    blob    blob blob    }
}

# This code tests that the storage classes specified above (in the $values
# table) are correctly assigned when values are inserted using a statement
# of the form:
#
# INSERT INTO <table> VALUE(<values>);
#
set tnum 1
foreach val $values {
  set lit [lindex $val 0]
  execsql "DELETE FROM t1;"
  execsql "INSERT INTO t1 VALUES($lit, $lit, $lit, $lit);"
  do_test types-1.1.$tnum {
    execsql {
      SELECT typeof(i), typeof(n), typeof(t), typeof(o) FROM t1;
    }
  } [lrange $val 1 end]
  incr tnum
}

# This code tests that the storage classes specified above (in the $values
# table) are correctly assigned when values are inserted using a statement
# of the form:
#
# INSERT INTO t1 SELECT ....
#
set tnum 1
foreach val $values {
  set lit [lindex $val 0]
  execsql "DELETE FROM t1;"
  execsql "INSERT INTO t1 SELECT $lit, $lit, $lit, $lit;"
  do_test types-1.2.$tnum {
    execsql {
      SELECT typeof(i), typeof(n), typeof(t), typeof(o) FROM t1;
    }
  } [lrange $val 1 end]
  incr tnum
}

# This code tests that the storage classes specified above (in the $values
# table) are correctly assigned when values are inserted using a statement
# of the form:
#
# UPDATE <table> SET <column> = <value>;
#
set tnum 1
foreach val $values {
  set lit [lindex $val 0]
  execsql "UPDATE t1 SET i = $lit, n = $lit, t = $lit, o = $lit;"
  do_test types-1.3.$tnum {
    execsql {
      SELECT typeof(i), typeof(n), typeof(t), typeof(o) FROM t1;
    }
  } [lrange $val 1 end]
  incr tnum
}

execsql {
  DROP TABLE t1;
}

# Open the table with root-page $rootpage at the btree
# level. Return a list that is the length of each record
# in the table, in the tables default scanning order.
proc record_sizes {rootpage} {
  set bt [btree_open test.db 10]
  btree_begin_transaction $bt
  set c [btree_cursor $bt $rootpage 0]
  btree_first $c
  while 1 {
    lappend res [btree_payload_size $c]
    if {[btree_next $c]} break
  }
  btree_close_cursor $c
  btree_close $bt
  set res
}


# Create a table and insert some 1-byte integers. Make sure they 
# can be read back OK. These should be 3 byte records.
do_test types-2.1.1 {
  execsql {
    CREATE TABLE t1(a integer);
    INSERT INTO t1 VALUES(0);
    INSERT INTO t1 VALUES(120);
    INSERT INTO t1 VALUES(-120);
  }
} {}
do_test types-2.1.2 {
  execsql {
    SELECT a FROM t1;
  }
} {0 120 -120}

# Try some 2-byte integers (4 byte records)
do_test types-2.1.3 {
  execsql {
    INSERT INTO t1 VALUES(30000);
    INSERT INTO t1 VALUES(-30000);
  }
} {}
do_test types-2.1.4 {
  execsql {
    SELECT a FROM t1;
  }
} {0 120 -120 30000 -30000}

# 4-byte integers (6 byte records)
do_test types-2.1.5 {
  execsql {
    INSERT INTO t1 VALUES(2100000000);
    INSERT INTO t1 VALUES(-2100000000);
  }
} {}
do_test types-2.1.6 {
  execsql {
    SELECT a FROM t1;
  }
} {0 120 -120 30000 -30000 2100000000 -2100000000}

# 8-byte integers (10 byte records)
do_test types-2.1.7 {
  execsql {
    INSERT INTO t1 VALUES(9000000*1000000*1000000);
    INSERT INTO t1 VALUES(-9000000*1000000*1000000);
  }
} {}
do_test types-2.1.8 {
  execsql {
    SELECT a FROM t1;
  }
} [list 0 120 -120 30000 -30000 2100000000 -2100000000 \
        9000000000000000000 -9000000000000000000]

# Check that all the record sizes are as we expected.
ifcapable legacyformat {
  do_test types-2.1.9 {
    set root [db eval {select rootpage from sqlite_master where name = 't1'}]
    record_sizes $root
  } {3 3 3 4 4 6 6 10 10}
} else {
  do_test types-2.1.9 {
    set root [db eval {select rootpage from sqlite_master where name = 't1'}]
    record_sizes $root
  } {2 3 3 4 4 6 6 10 10}
}
  
# Insert some reals. These should be 10 byte records.
do_test types-2.2.1 {
  execsql {
    CREATE TABLE t2(a float);
    INSERT INTO t2 VALUES(0.0);
    INSERT INTO t2 VALUES(12345.678);
    INSERT INTO t2 VALUES(-12345.678);
  }
} {}
do_test types-2.2.2 {
  execsql {
    SELECT a FROM t2;
  }
} {0.0 12345.678 -12345.678}

# Check that all the record sizes are as we expected.
ifcapable legacyformat {
  do_test types-2.2.3 {
    set root [db eval {select rootpage from sqlite_master where name = 't2'}]
    record_sizes $root
  } {3 10 10}
} else {
  do_test types-2.2.3 {
    set root [db eval {select rootpage from sqlite_master where name = 't2'}]
    record_sizes $root
  } {2 10 10}
}
  
# Insert a NULL. This should be a two byte record.
do_test types-2.3.1 {
  execsql {
    CREATE TABLE t3(a nullvalue);
    INSERT INTO t3 VALUES(NULL);
  }
} {}
do_test types-2.3.2 {
  execsql {
    SELECT a ISNULL FROM t3;
  }
} {1}

# Check that all the record sizes are as we expected.
do_test types-2.3.3 {
  set root [db eval {select rootpage from sqlite_master where name = 't3'}]
  record_sizes $root
} {2}

# Insert a couple of strings.
do_test types-2.4.1 {
  set string10 abcdefghij
  set string500 [string repeat $string10 50]
  set string500000 [string repeat $string10 50000]

  execsql "
    CREATE TABLE t4(a string);
    INSERT INTO t4 VALUES('$string10');
    INSERT INTO t4 VALUES('$string500');
    INSERT INTO t4 VALUES('$string500000');
  "
} {}
do_test types-2.4.2 {
  execsql {
    SELECT a FROM t4;
  }
} [list $string10 $string500 $string500000]

# Check that all the record sizes are as we expected. This is dependant on
# the database encoding.
if { $sqlite_options(utf16)==0 || [execsql {pragma encoding}] == "UTF-8" } {
  do_test types-2.4.3 {
    set root [db eval {select rootpage from sqlite_master where name = 't4'}]
    record_sizes $root
  } {12 503 500004}
} else {
  do_test types-2.4.3 {
    set root [db eval {select rootpage from sqlite_master where name = 't4'}]
    record_sizes $root
  } {22 1003 1000004}
}

do_test types-2.5.1 {
  execsql {
    DROP TABLE t1;
    DROP TABLE t2;
    DROP TABLE t3;
    DROP TABLE t4;
    CREATE TABLE t1(a, b, c);
  }
} {}
do_test types-2.5.2 {
  set string10 abcdefghij
  set string500 [string repeat $string10 50]
  set string500000 [string repeat $string10 50000]

  execsql "INSERT INTO t1 VALUES(NULL, '$string10', 4000);"
  execsql "INSERT INTO t1 VALUES('$string500', 4000, NULL);"
  execsql "INSERT INTO t1 VALUES(4000, NULL, '$string500000');"
} {}
do_test types-2.5.3 {
  execsql {
    SELECT * FROM t1;
  }
} [list {} $string10 4000 $string500 4000 {} 4000 {} $string500000]

finish_test
