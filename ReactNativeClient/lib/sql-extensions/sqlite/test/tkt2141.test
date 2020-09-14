# 2007 January 03
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
# This file implements tests to verify that ticket #2141 has been
# fixed.  
#
#
# $Id: tkt2141.test,v 1.2 2007/09/12 17:01:45 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !subquery {
  finish_test
  return
}

do_test tkt2141-1.1 {
  execsql {
      CREATE TABLE tab1 (t1_id integer PRIMARY KEY, t1_desc);
      INSERT INTO tab1 VALUES(1,'rec 1 tab 1');
      CREATE TABLE tab2 (t2_id integer PRIMARY KEY, t2_id_t1, t2_desc);
      INSERT INTO tab2 VALUES(1,1,'rec 1 tab 2');
      CREATE TABLE tab3 (t3_id integer PRIMARY KEY, t3_id_t2, t3_desc);
      INSERT INTO tab3 VALUES(1,1,'aa');
      SELECT *
      FROM tab1 t1 LEFT JOIN tab2 t2 ON t1.t1_id = t2.t2_id_t1
      WHERE t2.t2_id IN
           (SELECT t2_id FROM tab2, tab3 ON t2_id = t3_id_t2
             WHERE t3_id IN (1,2) GROUP BY t2_id);
  }
} {1 {rec 1 tab 1} 1 1 {rec 1 tab 2}}
do_test tkt2141-1.2 {
  execsql {
      SELECT *
      FROM tab1 t1 LEFT JOIN tab2 t2 ON t1.t1_id = t2.t2_id_t1
      WHERE t2.t2_id IN
           (SELECT t2_id FROM tab2, tab3 ON t2_id = t3_id_t2
             WHERE t3_id IN (1,2));
  }
} {1 {rec 1 tab 1} 1 1 {rec 1 tab 2}}
do_test tkt2141-1.3 {
  execsql {
      SELECT *
      FROM tab1 t1 LEFT JOIN tab2 t2
      WHERE t2.t2_id IN
           (SELECT t2_id FROM tab2, tab3 ON t2_id = t3_id_t2
             WHERE t3_id IN (1,2));
  }
} {1 {rec 1 tab 1} 1 1 {rec 1 tab 2}}

finish_test
