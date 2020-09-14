# 2018-07-18
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
# Test case for SQLITE_FCNTL_DATA_VERSION
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Construct a database and get its initial data version
sqlite3 db test.db
do_test dataversion1-100 {
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1(x) VALUES(99);
    SELECT * FROM t1;
  }
} {99}
set dv1 [file_control_data_version db main]

# The data version does not change by ATTACH or by changes to
# other schemas within the same connection.
#
do_test dataversion1-101 {
  db eval {
    ATTACH ':memory:' AS aux1;
    CREATE TABLE aux1.t2(y);
    CREATE TEMP TABLE t3(z);
  }
  file_control_data_version db main
} $dv1

# The data version does change when SQL modifies the table
do_test dataversion1-110 {
  db eval {
    UPDATE t1 SET x=x+1;
  }
  set dv2 [file_control_data_version db]
  expr {$::dv1==$dv2}
} {0}

# But the data version is constant if there are changes to other
# schemas
set dv1 [file_control_data_version db main]
do_test dataversion1-120 {
  db eval {
    UPDATE t2 SET y=y+1;
  }
  file_control_data_version db
} $dv1

# Changes to the database via another connection are not detected
# until there is a read transaction.
#
sqlite3 db2 test.db
do_test dataversion1-130 {
  db2 eval {
    SELECT * FROM t1
  }
} {100}
do_test dataversion1-131 {
  file_control_data_version db
} $dv1
do_test dataversion1-132 {
  db2 eval {
    UPDATE t1 SET x=x+1;
  }
  set dv2 [file_control_data_version db]
  expr {$::dv1==$dv2}
} {1}
do_test dataversion1-133 {
  db eval {SELECT * FROM t1}
  set dv2 [file_control_data_version db]
  expr {$::dv1==$dv2}
} {0}


   
finish_test
