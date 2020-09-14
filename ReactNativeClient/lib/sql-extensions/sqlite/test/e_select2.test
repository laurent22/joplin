# 2010 September 24
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
# This file implements tests to verify that the "testable statements" in 
# the lang_select.html document are correct.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

#-------------------------------------------------------------------------
# te_* commands:
#
#
#   te_read_sql DB SELECT-STATEMENT
#   te_read_tbl DB TABLENAME
#
# These two commands are used to read a dataset from the database. A dataset
# consists of N rows of M named columns of values each, where each value has a
# type (null, integer, real, text or blob) and a value within the types domain.
# The tcl format for a "dataset" is a list of two elements:
#
#   * A list of the column names.
#   * A list of data rows. Each row is itself a list, where each element is
#     the contents of a column of the row. Each of these is a list of two
#     elements, the type name and the actual value.
#
# For example, the contents of table [t1] as a dataset is:
#
#   CREATE TABLE t1(a, b);
#   INSERT INTO t1 VALUES('abc', NULL);
#   INSERT INTO t1 VALUES(43.1, 22);
#
#   {a b} {{{TEXT abc} {NULL {}}} {{REAL 43.1} {INTEGER 22}}}
#
# The [te_read_tbl] command returns a dataset read from a table. The
# [te_read_sql] returns the dataset that results from executing a SELECT
# command.
#
#
#   te_tbljoin ?SWITCHES? LHS-TABLE RHS-TABLE
#   te_join ?SWITCHES? LHS-DATASET RHS-DATASET
#
# This command joins the two datasets and returns the resulting dataset. If 
# there are no switches specified, then the results is the cartesian product
# of the two inputs.  The [te_tbljoin] command reads the left and right-hand
# datasets from the specified tables. The [te_join] command is passed the
# datasets directly.
#
# Optional switches are as follows:
#
#   -on SCRIPT
#   -using COLUMN-LIST
#   -left
#
# The -on option specifies a tcl script that is executed for each row in the
# cartesian product of the two datasets. The script has 4 arguments appended
# to it, in the following order:
#
#   * The list of column-names from the left-hand dataset.
#   * A single row from the left-hand dataset (one "data row" list as 
#     described above.
#   * The list of column-names from the right-hand dataset.
#   * A single row from the right-hand dataset.
#
# The script must return a boolean value - true if the combination of rows
# should be included in the output dataset, or false otherwise.
#
# The -using option specifies a list of the columns from the right-hand
# dataset that should be omitted from the output dataset.
#
# If the -left option is present, the join is done LEFT JOIN style. 
# Specifically, an extra row is inserted if after the -on script is run there
# exist rows in the left-hand dataset that have no corresponding rows in
# the output. See the implementation for more specific comments.
#
#
#   te_equals ?SWITCHES? COLNAME1 COLNAME2 <-on script args>
#
# The only supported switch is "-nocase". If it is present, then text values
# are compared in a case-independent fashion. Otherwise, they are compared
# as if using the SQLite BINARY collation sequence.
#
#
#   te_and ONSCRIPT1 ONSCRIPT2...
#
#


#
#   te_read_tbl DB TABLENAME
#   te_read_sql DB SELECT-STATEMENT
#
# These two procs are used to extract datasets from the database, either
# by reading the contents of a named table (te_read_tbl), or by executing
# a SELECT statement (t3_read_sql).  
#
# See the comment above, describing "te_* commands", for details of the
# return values.
#
proc te_read_tbl {db tbl} {
 te_read_sql $db "SELECT * FROM '$tbl'"
}
proc te_read_sql {db sql} {
  set S [sqlite3_prepare_v2 $db $sql -1 DUMMY]

  set cols [list]
  for {set i 0} {$i < [sqlite3_column_count $S]} {incr i} {
    lappend cols [sqlite3_column_name $S $i]
  }

  set rows [list]
  while {[sqlite3_step $S] == "SQLITE_ROW"} {
    set r [list]
    for {set i 0} {$i < [sqlite3_column_count $S]} {incr i} {
      lappend r [list [sqlite3_column_type $S $i] [sqlite3_column_text $S $i]]
    }
    lappend rows $r
  }
  sqlite3_finalize $S

  return [list $cols $rows]
}

#-------
# Usage:   te_join <table-data1> <table-data2> <join spec>...
#
# Where a join-spec is an optional list of arguments as follows:
#
#   ?-left?
#   ?-using colname-list?
#   ?-on on-expr-proc?
#
proc te_join {data1 data2 args} {

  set testproc ""
  set usinglist [list]
  set isleft 0
  for {set i 0} {$i < [llength $args]} {incr i} {
    set a [lindex $args $i]
    switch -- $a {
      -on     { set testproc [lindex $args [incr i]] }
      -using  { set usinglist [lindex $args [incr i]] }
      -left   { set isleft 1 }
      default {
        error "Unknown argument: $a"
      }
    }
  }

  set c1 [lindex $data1 0]
  set c2 [lindex $data2 0]
  set omitlist [list]
  set nullrowlist [list]
  set cret $c1

  set cidx 0
  foreach col $c2 {
    set idx [lsearch $usinglist $col]
    if {$idx>=0} {lappend omitlist $cidx}
    if {$idx<0} {
      lappend nullrowlist {NULL {}}
      lappend cret $col
    }
    incr cidx
  }
  set omitlist [lsort -integer -decreasing $omitlist]


  set rret [list]
  foreach r1 [lindex $data1 1] {
    set one 0
    foreach r2 [lindex $data2 1] {
      set ok 1
      if {$testproc != ""} {
        set ok [eval $testproc [list $c1 $r1 $c2 $r2]]
      }
      if {$ok} {
        set one 1
        foreach idx $omitlist {set r2 [lreplace $r2 $idx $idx]}
        lappend rret [concat $r1 $r2]
      }
    }

    if {$isleft && $one==0} {
      lappend rret [concat $r1 $nullrowlist]
    }
  }
  
  list $cret $rret
}

proc te_tbljoin {db t1 t2 args} {
  te_join [te_read_tbl $db $t1] [te_read_tbl $db $t2] {*}$args
}

proc te_apply_affinity {affinity typevar valvar} {
  upvar $typevar type
  upvar $valvar val

  switch -- $affinity {
    integer {
      if {[string is double $val]} { set type REAL }
      if {[string is wideinteger $val]} { set type INTEGER }
      if {$type == "REAL" && int($val)==$val} { 
        set type INTEGER 
        set val [expr {int($val)}]
      }
    }
    text {
      set type TEXT
    }
    none { }

    default { error "invalid affinity: $affinity" }
  }
}

#----------
# te_equals ?SWITCHES? c1 c2 cols1 row1 cols2 row2
#
proc te_equals {args} {

  if {[llength $args]<6} {error "invalid arguments to te_equals"}
  foreach {c1 c2 cols1 row1 cols2 row2} [lrange $args end-5 end] break

  set nocase 0
  set affinity none

  for {set i 0} {$i < ([llength $args]-6)} {incr i} {
    set a [lindex $args $i]
    switch -- $a {
      -nocase {
        set nocase 1
      }
      -affinity {
        set affinity [string tolower [lindex $args [incr i]]]
      }
      default {
        error "invalid arguments to te_equals"
      }
    }
  }

  set idx2 [if {[string is integer $c2]} { set c2 } else { lsearch $cols2 $c2 }]
  set idx1 [if {[string is integer $c1]} { set c1 } else { lsearch $cols1 $c1 }]

  set t1 [lindex $row1 $idx1 0]
  set t2 [lindex $row2 $idx2 0]
  set v1 [lindex $row1 $idx1 1]
  set v2 [lindex $row2 $idx2 1]

  te_apply_affinity $affinity t1 v1
  te_apply_affinity $affinity t2 v2

  if {$t1 == "NULL" || $t2 == "NULL"} { return 0 }
  if {$nocase && $t1 == "TEXT"} { set v1 [string tolower $v1] }
  if {$nocase && $t2 == "TEXT"} { set v2 [string tolower $v2] }


  set res [expr {$t1 == $t2 && [string equal $v1 $v2]}]
  return $res
}

proc te_false {args} { return 0 }
proc te_true  {args} { return 1 }

proc te_and {args} {
  foreach a [lrange $args 0 end-4] {
    set res [eval $a [lrange $args end-3 end]]
    if {$res == 0} {return 0}
  }
  return 1
}


proc te_dataset_eq {testname got expected} {
  uplevel #0 [list do_test $testname [list set {} $got] $expected]
}
proc te_dataset_eq_unordered {testname got expected} {
  lset got      1 [lsort [lindex $got 1]]
  lset expected 1 [lsort [lindex $expected 1]]
  te_dataset_eq $testname $got $expected
}

proc te_dataset_ne {testname got unexpected} {
  uplevel #0 [list do_test $testname [list string equal $got $unexpected] 0]
}
proc te_dataset_ne_unordered {testname got unexpected} {
  lset got      1 [lsort [lindex $got 1]]
  lset unexpected 1 [lsort [lindex $unexpected 1]]
  te_dataset_ne $testname $got $unexpected
}


#-------------------------------------------------------------------------
#
proc test_join {tn sqljoin tbljoinargs} {
  set sql [te_read_sql db "SELECT * FROM $sqljoin"]
  set te  [te_tbljoin db {*}$tbljoinargs]
  te_dataset_eq_unordered $tn $sql $te
}

drop_all_tables
do_execsql_test e_select-2.0 {
  CREATE TABLE t1(a, b);
  CREATE TABLE t2(a, b);
  CREATE TABLE t3(b COLLATE nocase);

  INSERT INTO t1 VALUES(2, 'B');
  INSERT INTO t1 VALUES(1, 'A');
  INSERT INTO t1 VALUES(4, 'D');
  INSERT INTO t1 VALUES(NULL, NULL);
  INSERT INTO t1 VALUES(3, NULL);

  INSERT INTO t2 VALUES(1, 'A');
  INSERT INTO t2 VALUES(2, NULL);
  INSERT INTO t2 VALUES(5, 'E');
  INSERT INTO t2 VALUES(NULL, NULL);
  INSERT INTO t2 VALUES(3, 'C');

  INSERT INTO t3 VALUES('a');
  INSERT INTO t3 VALUES('c');
  INSERT INTO t3 VALUES('b');
} {}

foreach {tn indexes} {
  e_select-2.1.1 { }
  e_select-2.1.2 { CREATE INDEX i1 ON t1(a) }
  e_select-2.1.3 { CREATE INDEX i1 ON t2(a) }
  e_select-2.1.4 { CREATE INDEX i1 ON t3(b) }
} {

  catchsql { DROP INDEX i1 }
  catchsql { DROP INDEX i2 }
  catchsql { DROP INDEX i3 }
  execsql $indexes

  # EVIDENCE-OF: R-49872-03192 If the join-operator is "CROSS JOIN",
  # "INNER JOIN", "JOIN" or a comma (",") and there is no ON or USING
  # clause, then the result of the join is simply the cartesian product of
  # the left and right-hand datasets.
  #
  # EVIDENCE-OF: R-46256-57243 There is no difference between the "INNER
  # JOIN", "JOIN" and "," join operators.
  #
  # EVIDENCE-OF: R-25071-21202 The "CROSS JOIN" join operator produces the
  # same result as the "INNER JOIN", "JOIN" and "," operators
  #
  test_join $tn.1.1  "t1, t2"                {t1 t2}
  test_join $tn.1.2  "t1 INNER JOIN t2"      {t1 t2}
  test_join $tn.1.3  "t1 CROSS JOIN t2"      {t1 t2}
  test_join $tn.1.4  "t1 JOIN t2"            {t1 t2}
  test_join $tn.1.5  "t2, t3"                {t2 t3}
  test_join $tn.1.6  "t2 INNER JOIN t3"      {t2 t3}
  test_join $tn.1.7  "t2 CROSS JOIN t3"      {t2 t3}
  test_join $tn.1.8  "t2 JOIN t3"            {t2 t3}
  test_join $tn.1.9  "t2, t2 AS x"           {t2 t2}
  test_join $tn.1.10 "t2 INNER JOIN t2 AS x" {t2 t2}
  test_join $tn.1.11 "t2 CROSS JOIN t2 AS x" {t2 t2}
  test_join $tn.1.12 "t2 JOIN t2 AS x"       {t2 t2}

  # EVIDENCE-OF: R-38465-03616 If there is an ON clause then the ON
  # expression is evaluated for each row of the cartesian product as a
  # boolean expression. Only rows for which the expression evaluates to
  # true are included from the dataset.
  #
  test_join $tn.2.1  "t1, t2 ON (t1.a=t2.a)"  {t1 t2 -on {te_equals a a}}
  test_join $tn.2.2  "t2, t1 ON (t1.a=t2.a)"  {t2 t1 -on {te_equals a a}}
  test_join $tn.2.3  "t2, t1 ON (1)"          {t2 t1 -on te_true}
  test_join $tn.2.4  "t2, t1 ON (NULL)"       {t2 t1 -on te_false}
  test_join $tn.2.5  "t2, t1 ON (1.1-1.1)"    {t2 t1 -on te_false}
  test_join $tn.2.6  "t1, t2 ON (1.1-1.0)"    {t1 t2 -on te_true}


  test_join $tn.3 "t1 LEFT JOIN t2 ON (t1.a=t2.a)" {t1 t2 -left -on {te_equals a a}}
  test_join $tn.4 "t1 LEFT JOIN t2 USING (a)" {
    t1 t2 -left -using a -on {te_equals a a}
  }
  test_join $tn.5 "t1 CROSS JOIN t2 USING(b, a)" {
    t1 t2 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.6 "t1 NATURAL JOIN t2" {
    t1 t2 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.7 "t1 NATURAL INNER JOIN t2" {
    t1 t2 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.8 "t1 NATURAL CROSS JOIN t2" {
    t1 t2 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.9 "t1 NATURAL INNER JOIN t2" {
    t1 t2 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.10 "t1 NATURAL LEFT JOIN t2" {
    t1 t2 -left -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.11 "t1 NATURAL LEFT OUTER JOIN t2" {
    t1 t2 -left -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.12 "t2 NATURAL JOIN t1" {
    t2 t1 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.13 "t2 NATURAL INNER JOIN t1" {
    t2 t1 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.14 "t2 NATURAL CROSS JOIN t1" {
    t2 t1 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.15 "t2 NATURAL INNER JOIN t1" {
    t2 t1 -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.16 "t2 NATURAL LEFT JOIN t1" {
    t2 t1 -left -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.17 "t2 NATURAL LEFT OUTER JOIN t1" {
    t2 t1 -left -using {a b} -on {te_and {te_equals a a} {te_equals b b}}
  }
  test_join $tn.18 "t1 LEFT JOIN t2 USING (b)" {
    t1 t2 -left -using b -on {te_equals b b}
  }
  test_join $tn.19 "t1 JOIN t3 USING(b)" {t1 t3 -using b -on {te_equals b b}}
  test_join $tn.20 "t3 JOIN t1 USING(b)" {
    t3 t1 -using b -on {te_equals -nocase b b}
  }
  test_join $tn.21 "t1 NATURAL JOIN t3"  {
    t1 t3 -using b -on {te_equals b b}
  }
  test_join $tn.22 "t3 NATURAL JOIN t1"  {
    t3 t1 -using b -on {te_equals -nocase b b}
  }
  test_join $tn.23 "t1 NATURAL LEFT JOIN t3" {
    t1 t3 -left -using b -on {te_equals b b}
  }
  test_join $tn.24 "t3 NATURAL LEFT JOIN t1" {
    t3 t1 -left -using b -on {te_equals -nocase b b}
  }
  test_join $tn.25 "t1 LEFT JOIN t3 ON (t3.b=t1.b)" {
    t1 t3 -left -on {te_equals -nocase b b}
  }
  test_join $tn.26 "t1 LEFT JOIN t3 ON (t1.b=t3.b)" {
    t1 t3 -left -on {te_equals b b}
  }
  test_join $tn.27 "t1 JOIN t3 ON (t1.b=t3.b)" { t1 t3 -on {te_equals b b} }

  # EVIDENCE-OF: R-28760-53843 When more than two tables are joined
  # together as part of a FROM clause, the join operations are processed
  # in order from left to right. In other words, the FROM clause (A
  # join-op-1 B join-op-2 C) is computed as ((A join-op-1 B) join-op-2 C).
  #
  #   Tests 28a and 28b show that the statement above is true for this case.
  #   Test 28c shows that if the parenthesis force a different order of
  #   evaluation the result is different. Test 28d verifies that the result
  #   of the query with the parenthesis forcing a different order of evaluation
  #   is as calculated by the [te_*] procs.
  #
  set t3_natural_left_join_t2 [
    te_tbljoin db t3 t2 -left -using {b} -on {te_equals -nocase b b}
  ]
  set t1 [te_read_tbl db t1]
  te_dataset_eq_unordered $tn.28a [
    te_read_sql db "SELECT * FROM t3 NATURAL LEFT JOIN t2 NATURAL JOIN t1"
  ] [te_join $t3_natural_left_join_t2 $t1                                \
      -using {a b} -on {te_and {te_equals a a} {te_equals -nocase b b}}  \
  ]

  te_dataset_eq_unordered $tn.28b [
    te_read_sql db "SELECT * FROM (t3 NATURAL LEFT JOIN t2) NATURAL JOIN t1"
  ] [te_join $t3_natural_left_join_t2 $t1                                \
      -using {a b} -on {te_and {te_equals a a} {te_equals -nocase b b}}  \
  ]

  te_dataset_ne_unordered $tn.28c [
    te_read_sql db "SELECT * FROM (t3 NATURAL LEFT JOIN t2) NATURAL JOIN t1"
  ] [
    te_read_sql db "SELECT * FROM t3 NATURAL LEFT JOIN (t2 NATURAL JOIN t1)"
  ]

  set t2_natural_join_t1 [te_tbljoin db t2 t1 -using {a b}                 \
        -using {a b} -on {te_and {te_equals a a} {te_equals -nocase b b}}  \
  ]
  set t3 [te_read_tbl db t3]
  te_dataset_eq_unordered $tn.28d [
    te_read_sql db "SELECT * FROM t3 NATURAL LEFT JOIN (t2 NATURAL JOIN t1)"
  ] [te_join $t3 $t2_natural_join_t1                                       \
      -left -using {b} -on {te_equals -nocase b b}                         \
  ]
}

do_execsql_test e_select-2.2.0 {
  CREATE TABLE t4(x TEXT COLLATE nocase);
  CREATE TABLE t5(y INTEGER, z TEXT COLLATE binary);

  INSERT INTO t4 VALUES('2.0');
  INSERT INTO t4 VALUES('TWO');
  INSERT INTO t5 VALUES(2, 'two');
} {}

# EVIDENCE-OF: R-59237-46742 A subquery specified in the
# table-or-subquery following the FROM clause in a simple SELECT
# statement is handled as if it was a table containing the data returned
# by executing the subquery statement.
#
# EVIDENCE-OF: R-27438-53558 Each column of the subquery has the
# collation sequence and affinity of the corresponding expression in the
# subquery statement.
#
foreach {tn subselect select spec} {
  1   "SELECT * FROM t2"   "SELECT * FROM t1 JOIN %ss%" 
      {t1 %ss%}

  2   "SELECT * FROM t2"   "SELECT * FROM t1 JOIN %ss% AS x ON (t1.a=x.a)" 
      {t1 %ss% -on {te_equals 0 0}}

  3   "SELECT * FROM t2"   "SELECT * FROM %ss% AS x JOIN t1 ON (t1.a=x.a)" 
      {%ss% t1 -on {te_equals 0 0}}

  4   "SELECT * FROM t1, t2" "SELECT * FROM %ss% AS x JOIN t3"
      {%ss% t3}

  5   "SELECT * FROM t1, t2" "SELECT * FROM %ss% NATURAL JOIN t3"
      {%ss% t3 -using b -on {te_equals 1 0}}

  6   "SELECT * FROM t1, t2" "SELECT * FROM t3 NATURAL JOIN %ss%"
      {t3 %ss% -using b -on {te_equals -nocase 0 1}}

  7   "SELECT * FROM t1, t2" "SELECT * FROM t3 NATURAL LEFT JOIN %ss%"
      {t3 %ss% -left -using b -on {te_equals -nocase 0 1}}

  8   "SELECT count(*) AS y FROM t4"   "SELECT * FROM t5, %ss% USING (y)"
      {t5 %ss% -using y -on {te_equals -affinity text 0 0}}

  9   "SELECT count(*) AS y FROM t4"   "SELECT * FROM %ss%, t5 USING (y)"
      {%ss% t5 -using y -on {te_equals -affinity text 0 0}}

  10  "SELECT x AS y FROM t4"   "SELECT * FROM %ss% JOIN t5 USING (y)"
      {%ss% t5 -using y -on {te_equals -nocase -affinity integer 0 0}}

  11  "SELECT x AS y FROM t4"   "SELECT * FROM t5 JOIN %ss% USING (y)"
      {t5 %ss% -using y -on {te_equals -nocase -affinity integer 0 0}}

  12  "SELECT y AS x FROM t5"   "SELECT * FROM %ss% JOIN t4 USING (x)"
      {%ss% t4 -using x -on {te_equals -nocase -affinity integer 0 0}}

  13  "SELECT y AS x FROM t5"   "SELECT * FROM t4 JOIN %ss% USING (x)"
      {t4 %ss% -using x -on {te_equals -nocase -affinity integer 0 0}}

  14  "SELECT +y AS x FROM t5"   "SELECT * FROM %ss% JOIN t4 USING (x)"
      {%ss% t4 -using x -on {te_equals -nocase -affinity text 0 0}}

  15  "SELECT +y AS x FROM t5"   "SELECT * FROM t4 JOIN %ss% USING (x)"
      {t4 %ss% -using x -on {te_equals -nocase -affinity text 0 0}}
} {

  # Create a temporary table named %ss% containing the data returned by
  # the sub-select. Then have the [te_tbljoin] proc use this table to
  # compute the expected results of the $select query. Drop the temporary
  # table before continuing.
  #
  execsql "CREATE TEMP TABLE '%ss%' AS $subselect"
  set te [eval te_tbljoin db $spec]
  execsql "DROP TABLE '%ss%'"

  # Check that the actual data returned by the $select query is the same
  # as the expected data calculated using [te_tbljoin] above.
  #
  te_dataset_eq_unordered e_select-2.2.1.$tn [
    te_read_sql db [string map [list %ss% "($subselect)"] $select]
  ] $te
}

finish_test
