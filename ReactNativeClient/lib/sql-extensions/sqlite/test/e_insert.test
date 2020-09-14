# 2010 September 18
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
# The majority of this file implements tests to verify that the "testable
# statements" in the lang_insert.html document are correct.
#
# Also, it contains tests to verify the statements in (the very short)
# lang_replace.html.
#
set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

# Organization of tests:
#
#   e_insert-0.*: Test the syntax diagram.
#
#   e_insert-1.*: Test statements of the form "INSERT ... VALUES(...)".
#   
#   e_insert-2.*: Test statements of the form "INSERT ... SELECT ...".
#
#   e_insert-3.*: Test statements of the form "INSERT ... DEFAULT VALUES".
#
#   e_insert-4.*: Test statements regarding the conflict clause.
#
#   e_insert-5.*: Test that the qualified table name and "DEFAULT VALUES"
#                 syntaxes do not work in trigger bodies.
#

do_execsql_test e_insert-0.0 {
  CREATE TABLE a1(a, b);
  CREATE TABLE a2(a, b, c DEFAULT 'xyz');
  CREATE TABLE a3(x DEFAULT 1.0, y DEFAULT 'string', z);
  CREATE TABLE a4(c UNIQUE, d);
} {}

proc do_insert_tests {args} {
  uplevel do_select_tests $args
}

# -- syntax diagram insert-stmt
#
do_insert_tests e_insert-0 {
     1  "INSERT             INTO a1 DEFAULT VALUES"                   {}
     2  "INSERT             INTO main.a1 DEFAULT VALUES"              {}
     3  "INSERT OR ROLLBACK INTO main.a1 DEFAULT VALUES"              {}
     4  "INSERT OR ROLLBACK INTO a1 DEFAULT VALUES"                   {}
     5  "INSERT OR ABORT    INTO main.a1 DEFAULT VALUES"              {}
     6  "INSERT OR ABORT    INTO a1 DEFAULT VALUES"                   {}
     7  "INSERT OR REPLACE  INTO main.a1 DEFAULT VALUES"              {}
     8  "INSERT OR REPLACE  INTO a1 DEFAULT VALUES"                   {}
     9  "INSERT OR FAIL     INTO main.a1 DEFAULT VALUES"              {}
    10  "INSERT OR FAIL     INTO a1 DEFAULT VALUES"                   {}
    11  "INSERT OR FAIL     INTO main.a1 DEFAULT VALUES"              {}
    12  "INSERT OR IGNORE   INTO a1 DEFAULT VALUES"                   {}
    13  "REPLACE            INTO a1 DEFAULT VALUES"                   {}
    14  "REPLACE            INTO main.a1 DEFAULT VALUES"              {}
    15  "INSERT             INTO a1      VALUES(1, 2)"                {}
    16  "INSERT             INTO main.a1 VALUES(1, 2)"                {}
    17  "INSERT OR ROLLBACK INTO main.a1 VALUES(1, 2)"                {}
    18  "INSERT OR ROLLBACK INTO a1      VALUES(1, 2)"                {}
    19  "INSERT OR ABORT    INTO main.a1 VALUES(1, 2)"                {}
    20  "INSERT OR ABORT    INTO a1      VALUES(1, 2)"                {}
    21  "INSERT OR REPLACE  INTO main.a1 VALUES(1, 2)"                {}
    22  "INSERT OR REPLACE  INTO a1      VALUES(1, 2)"                {}
    23  "INSERT OR FAIL     INTO main.a1 VALUES(1, 2)"                {}
    24  "INSERT OR FAIL     INTO a1      VALUES(1, 2)"                {}
    25  "INSERT OR FAIL     INTO main.a1 VALUES(1, 2)"                {}
    26  "INSERT OR IGNORE   INTO a1      VALUES(1, 2)"                {}
    27  "REPLACE            INTO a1      VALUES(1, 2)"                {}
    28  "REPLACE            INTO main.a1 VALUES(1, 2)"                {}
    29  "INSERT             INTO a1      (b, a) VALUES(1, 2)"         {}
    30  "INSERT             INTO main.a1 (b, a) VALUES(1, 2)"         {}
    31  "INSERT OR ROLLBACK INTO main.a1 (b, a) VALUES(1, 2)"         {}
    32  "INSERT OR ROLLBACK INTO a1      (b, a) VALUES(1, 2)"         {}
    33  "INSERT OR ABORT    INTO main.a1 (b, a) VALUES(1, 2)"         {}
    34  "INSERT OR ABORT    INTO a1      (b, a) VALUES(1, 2)"         {}
    35  "INSERT OR REPLACE  INTO main.a1 (b, a) VALUES(1, 2)"         {}
    36  "INSERT OR REPLACE  INTO a1      (b, a) VALUES(1, 2)"         {}
    37  "INSERT OR FAIL     INTO main.a1 (b, a) VALUES(1, 2)"         {}
    38  "INSERT OR FAIL     INTO a1      (b, a) VALUES(1, 2)"         {}
    39  "INSERT OR FAIL     INTO main.a1 (b, a) VALUES(1, 2)"         {}
    40  "INSERT OR IGNORE   INTO a1      (b, a) VALUES(1, 2)"         {}
    41  "REPLACE            INTO a1      (b, a) VALUES(1, 2)"         {}
    42  "REPLACE            INTO main.a1 (b, a) VALUES(1, 2)"         {}
    43  "INSERT             INTO a1      SELECT c, b FROM a2"         {}
    44  "INSERT             INTO main.a1 SELECT c, b FROM a2"         {}
    45  "INSERT OR ROLLBACK INTO main.a1 SELECT c, b FROM a2"         {}
    46  "INSERT OR ROLLBACK INTO a1      SELECT c, b FROM a2"         {}
    47  "INSERT OR ABORT    INTO main.a1 SELECT c, b FROM a2"         {}
    48  "INSERT OR ABORT    INTO a1      SELECT c, b FROM a2"         {}
    49  "INSERT OR REPLACE  INTO main.a1 SELECT c, b FROM a2"         {}
    50  "INSERT OR REPLACE  INTO a1      SELECT c, b FROM a2"         {}
    51  "INSERT OR FAIL     INTO main.a1 SELECT c, b FROM a2"         {}
    52  "INSERT OR FAIL     INTO a1      SELECT c, b FROM a2"         {}
    53  "INSERT OR FAIL     INTO main.a1 SELECT c, b FROM a2"         {}
    54  "INSERT OR IGNORE   INTO a1      SELECT c, b FROM a2"         {}
    55  "REPLACE            INTO a1      SELECT c, b FROM a2"         {}
    56  "REPLACE            INTO main.a1 SELECT c, b FROM a2"         {}
    57  "INSERT             INTO a1      (b, a) SELECT c, b FROM a2"  {}
    58  "INSERT             INTO main.a1 (b, a) SELECT c, b FROM a2"  {}
    59  "INSERT OR ROLLBACK INTO main.a1 (b, a) SELECT c, b FROM a2"  {}
    60  "INSERT OR ROLLBACK INTO a1      (b, a) SELECT c, b FROM a2"  {}
    61  "INSERT OR ABORT    INTO main.a1 (b, a) SELECT c, b FROM a2"  {}
    62  "INSERT OR ABORT    INTO a1      (b, a) SELECT c, b FROM a2"  {}
    63  "INSERT OR REPLACE  INTO main.a1 (b, a) SELECT c, b FROM a2"  {}
    64  "INSERT OR REPLACE  INTO a1      (b, a) SELECT c, b FROM a2"  {}
    65  "INSERT OR FAIL     INTO main.a1 (b, a) SELECT c, b FROM a2"  {}
    66  "INSERT OR FAIL     INTO a1      (b, a) SELECT c, b FROM a2"  {}
    67  "INSERT OR FAIL     INTO main.a1 (b, a) SELECT c, b FROM a2"  {}
    68  "INSERT OR IGNORE   INTO a1      (b, a) SELECT c, b FROM a2"  {}
    69  "REPLACE            INTO a1      (b, a) SELECT c, b FROM a2"  {}
    70  "REPLACE            INTO main.a1 (b, a) SELECT c, b FROM a2"  {}
    71  "INSERT             INTO a1      (b, a) VALUES(1, 2),(3,4)"   {}
    72  "INSERT             INTO main.a1 (b, a) VALUES(1, 2),(3,4)"   {}
    73  "INSERT OR ROLLBACK INTO main.a1 (b, a) VALUES(1, 2),(3,4)"   {}
    74  "INSERT OR ROLLBACK INTO a1      (b, a) VALUES(1, 2),(3,4)"   {}
    75  "INSERT OR ABORT    INTO main.a1 (b, a) VALUES(1, 2),(3,4)"   {}
    76  "INSERT OR ABORT    INTO a1      (b, a) VALUES(1, 2),(3,4)"   {}
    77  "INSERT OR REPLACE  INTO main.a1 (b, a) VALUES(1, 2),(3,4)"   {}
    78  "INSERT OR REPLACE  INTO a1      (b, a) VALUES(1, 2),(3,4)"   {}
    79  "INSERT OR FAIL     INTO main.a1 (b, a) VALUES(1, 2),(3,4)"   {}
    80  "INSERT OR FAIL     INTO a1      (b, a) VALUES(1, 2),(3,4)"   {}
    81  "INSERT OR FAIL     INTO main.a1 (b, a) VALUES(1, 2),(3,4)"   {}
    82  "INSERT OR IGNORE   INTO a1      (b, a) VALUES(1, 2),(3,4)"   {}
    83  "REPLACE            INTO a1      (b, a) VALUES(1, 2),(3,4)"   {}
    84  "REPLACE            INTO main.a1 (b, a) VALUES(1, 2),(3,4)"   {}
}

delete_all_data

# EVIDENCE-OF: R-21490-41092 The first form (with the "VALUES" keyword)
# creates one or more new rows in an existing table.
#
do_insert_tests e_insert-1.1 {
    0    "SELECT count(*) FROM a2"           {0}

    1a   "INSERT INTO a2 VALUES(1, 2, 3)"    {}
    1b   "SELECT count(*) FROM a2"           {1}

    2a   "INSERT INTO a2(a, b) VALUES(1, 2)" {}
    2b   "SELECT count(*) FROM a2"           {2}

    3a   "INSERT INTO a2(a) VALUES(3),(4)"   {}
    3b   "SELECT count(*) FROM a2"           {4}
}

# EVIDENCE-OF: R-19218-01018 If the column-name list after table-name is
# omitted then the number of values inserted into each row must be the
# same as the number of columns in the table.
#
#   A test in the block above verifies that if the VALUES list has the
#   correct number of columns (for table a2, 3 columns) works. So these
#   tests just show that other values cause an error.
#
do_insert_tests e_insert-1.2 -error { 
  table %s has %d columns but %d values were supplied
} {
    1    "INSERT INTO a2 VALUES(1)"         {a2 3 1}
    2    "INSERT INTO a2 VALUES(1,2)"       {a2 3 2}
    3    "INSERT INTO a2 VALUES(1,2,3,4)"   {a2 3 4}
    4    "INSERT INTO a2 VALUES(1,2,3,4,5)" {a2 3 5}
}

# EVIDENCE-OF: R-29730-42609 In this case the result of evaluating the
# left-most expression from each term of the VALUES list is inserted
# into the left-most column of each new row, and so forth for each
# subsequent expression.
#
delete_all_data
do_insert_tests e_insert-1.3 {
    1a   "INSERT INTO a2 VALUES(1, 2, 3)"    {}
    1b   "SELECT * FROM a2 WHERE oid=last_insert_rowid()" {1 2 3}

    2a   "INSERT INTO a2 VALUES('abc', NULL, 3*3+1)"      {}
    2b   "SELECT * FROM a2 WHERE oid=last_insert_rowid()" {abc {} 10}

    3a   "INSERT INTO a2 VALUES((SELECT count(*) FROM a2), 'x', 'y')" {}
    3b   "SELECT * FROM a2 WHERE oid=last_insert_rowid()" {2 x y}
}

# EVIDENCE-OF: R-21115-58321 If a column-name list is specified, then
# the number of values in each term of the VALUE list must match the
# number of specified columns.
#
do_insert_tests e_insert-1.4 -error { 
  %d values for %d columns
} {
    1    "INSERT INTO a2(a, b, c) VALUES(1)"         {1 3}
    2    "INSERT INTO a2(a, b, c) VALUES(1,2)"       {2 3}
    3    "INSERT INTO a2(a, b, c) VALUES(1,2,3,4)"   {4 3}
    4    "INSERT INTO a2(a, b, c) VALUES(1,2,3,4,5)" {5 3}

    5    "INSERT INTO a2(c, a) VALUES(1)"            {1 2}
    6    "INSERT INTO a2(c, a) VALUES(1,2,3)"        {3 2}
    7    "INSERT INTO a2(c, a) VALUES(1,2,3,4)"      {4 2}
    8    "INSERT INTO a2(c, a) VALUES(1,2,3,4,5)"    {5 2}
}

# EVIDENCE-OF: R-07016-26442 Each of the named columns of the new row is
# populated with the results of evaluating the corresponding VALUES
# expression.
#
# EVIDENCE-OF: R-12183-43719 Table columns that do not appear in the
# column list are populated with the default column value (specified as
# part of the CREATE TABLE statement), or with NULL if no default value
# is specified.
#
delete_all_data
do_insert_tests e_insert-1.5 {
    1a   "INSERT INTO a2(b, c) VALUES('b', 'c')"     {}
    1b   "SELECT * FROM a2"                          {{} b c}

    2a   "INSERT INTO a2(a, b) VALUES('a', 'b')"     {}
    2b   "SELECT * FROM a2"                          {{} b c  a b xyz}
}

# EVIDENCE-OF: R-52173-30215 A new entry is inserted into the table for
# each row of data returned by executing the SELECT statement.
#
delete_all_data
do_insert_tests e_insert-2.1 {
    0    "SELECT count(*) FROM a1"            {0}

    1a   "SELECT count(*) FROM (SELECT 1, 2)" {1}
    1b   "INSERT INTO a1 SELECT 1, 2"         {}
    1c   "SELECT count(*) FROM a1"            {1}

    2a   "SELECT count(*) FROM (SELECT b, a FROM a1)"           {1}
    2b   "INSERT INTO a1 SELECT b, a FROM a1"                   {}
    2c   "SELECT count(*) FROM a1"                              {2}

    3a   "SELECT count(*) FROM (SELECT b, a FROM a1)"           {2}
    3b   "INSERT INTO a1 SELECT b, a FROM a1"                   {}
    3c   "SELECT count(*) FROM a1"                              {4}

    4a   "SELECT count(*) FROM (SELECT b, a FROM a1)"           {4}
    4b   "INSERT INTO a1 SELECT b, a FROM a1"                   {}
    4c   "SELECT count(*) FROM a1"                              {8}

    4a   "SELECT count(*) FROM (SELECT min(b), min(a) FROM a1)" {1}
    4b   "INSERT INTO a1 SELECT min(b), min(a) FROM a1"         {}
    4c   "SELECT count(*) FROM a1"                              {9}
}


# EVIDENCE-OF: R-63614-47421 If a column-list is specified, the number
# of columns in the result of the SELECT must be the same as the number
# of items in the column-list.
#
do_insert_tests e_insert-2.2 -error {
  %d values for %d columns
} {
    1    "INSERT INTO a3(x, y) SELECT a, b, c FROM a2"            {3 2}
    2    "INSERT INTO a3(x, y) SELECT * FROM a2"                  {3 2}
    3    "INSERT INTO a3(x, y) SELECT * FROM a2 CROSS JOIN a1"    {5 2}
    4    "INSERT INTO a3(x, y) SELECT * FROM a2 NATURAL JOIN a1"  {3 2}
    5    "INSERT INTO a3(x, y) SELECT a2.a FROM a2,a1"            {1 2}

    6    "INSERT INTO a3(z) SELECT a, b, c FROM a2"               {3 1}
    7    "INSERT INTO a3(z) SELECT * FROM a2"                     {3 1}
    8    "INSERT INTO a3(z) SELECT * FROM a2 CROSS JOIN a1"       {5 1}
    9    "INSERT INTO a3(z) SELECT * FROM a2 NATURAL JOIN a1"     {3 1}
    10   "INSERT INTO a3(z) SELECT a1.* FROM a2,a1"               {2 1}
}

# EVIDENCE-OF: R-58951-07798 Otherwise, if no column-list is specified,
# the number of columns in the result of the SELECT must be the same as
# the number of columns in the table.
#
do_insert_tests e_insert-2.3 -error {
  table %s has %d columns but %d values were supplied
} {
    1    "INSERT INTO a1 SELECT a, b, c FROM a2"            {a1 2 3}
    2    "INSERT INTO a1 SELECT * FROM a2"                  {a1 2 3}
    3    "INSERT INTO a1 SELECT * FROM a2 CROSS JOIN a1"    {a1 2 5}
    4    "INSERT INTO a1 SELECT * FROM a2 NATURAL JOIN a1"  {a1 2 3}
    5    "INSERT INTO a1 SELECT a2.a FROM a2,a1"            {a1 2 1}
}

# EVIDENCE-OF: R-31074-37730 Any SELECT statement, including compound
# SELECTs and SELECT statements with ORDER BY and/or LIMIT clauses, may
# be used in an INSERT statement of this form.
#
delete_all_data
do_execsql_test e_insert-2.3.0 {
  INSERT INTO a1 VALUES('x', 'y');
} {}
do_insert_tests e_insert-2.3 {
  1  "INSERT INTO a1 SELECT a,b FROM a1 UNION SELECT b,a FROM a1 ORDER BY 1" {}
  2  "INSERT INTO a1(b, a) SELECT * FROM a1 LIMIT 1"                         {}
  3  "INSERT INTO a1 SELECT 'a'||a, 'b'||b FROM a1 LIMIT 2 OFFSET 1"         {}
  4  "INSERT INTO a1 SELECT * FROM a1 ORDER BY b, a"                         {}
  S  "SELECT * FROM a1" {
      x y 
      x y y x
      y x
      ax by ay bx 
      ay bx ax by y x y x x y x y
  }
}

# EVIDENCE-OF: R-25149-22012 The INSERT ... DEFAULT VALUES statement
# inserts a single new row into the named table.
#
delete_all_data
do_insert_tests e_insert-3.1 {
    1    "SELECT count(*) FROM a3"           {0}
    2a   "INSERT INTO a3 DEFAULT VALUES"     {}
    2b   "SELECT count(*) FROM a3"           {1}
}

# EVIDENCE-OF: R-18927-01951 Each column of the new row is populated
# with its default value, or with a NULL if no default value is
# specified as part of the column definition in the CREATE TABLE
# statement.
#
delete_all_data
do_insert_tests e_insert-3.2 {
    1.1    "INSERT INTO a3 DEFAULT VALUES"     {}
    1.2    "SELECT * FROM a3"                  {1.0 string {}}

    2.1    "INSERT INTO a3 DEFAULT VALUES"     {}
    2.2    "SELECT * FROM a3"                  {1.0 string {} 1.0 string {}}

    3.1    "INSERT INTO a2 DEFAULT VALUES"     {}
    3.2    "SELECT * FROM a2"                  {{} {} xyz}

    4.1    "INSERT INTO a2 DEFAULT VALUES"     {}
    4.2    "SELECT * FROM a2"                  {{} {} xyz {} {} xyz}

    5.1    "INSERT INTO a1 DEFAULT VALUES"     {}
    5.2    "SELECT * FROM a1"                  {{} {}}

    6.1    "INSERT INTO a1 DEFAULT VALUES"     {}
    6.2    "SELECT * FROM a1"                  {{} {} {} {}}
}

# EVIDENCE-OF: R-00267-47727 The initial "INSERT" keyword can be
# replaced by "REPLACE" or "INSERT OR action" to specify an alternative
# constraint conflict resolution algorithm to use during that one INSERT
# command.
#
# EVIDENCE-OF: R-23110-47146 the parser allows the use of the single
# keyword REPLACE as an alias for "INSERT OR REPLACE".
#
#    The two requirements above are tested by e_select-4.1.* and
#    e_select-4.2.*, respectively.
#
# EVIDENCE-OF: R-03421-22330 The REPLACE command is an alias for the
# "INSERT OR REPLACE" variant of the INSERT command.
#
#    This is a dup of R-23110-47146. Therefore it is also verified 
#    by e_select-4.2.*. This requirement is the only one from
#    lang_replace.html.
#
do_execsql_test e_insert-4.1.0 {
  INSERT INTO a4 VALUES(1, 'a');
  INSERT INTO a4 VALUES(2, 'a');
  INSERT INTO a4 VALUES(3, 'a');
} {}
foreach {tn sql error ac data } {
  1.1  "INSERT INTO a4 VALUES(2,'b')"  {UNIQUE constraint failed: a4.c}  1 {1 a 2 a 3 a}
  1.2  "INSERT OR REPLACE INTO a4 VALUES(2, 'b')"            {}  1 {1 a 3 a 2 b}
  1.3  "INSERT OR IGNORE INTO a4 VALUES(3, 'c')"             {}  1 {1 a 3 a 2 b}
  1.4  "BEGIN" {} 0 {1 a 3 a 2 b}
  1.5  "INSERT INTO a4 VALUES(1, 'd')" {UNIQUE constraint failed: a4.c}  0 {1 a 3 a 2 b}
  1.6  "INSERT OR ABORT INTO a4 VALUES(1, 'd')" 
        {UNIQUE constraint failed: a4.c}  0 {1 a 3 a 2 b}
  1.7  "INSERT OR ROLLBACK INTO a4 VALUES(1, 'd')" 
        {UNIQUE constraint failed: a4.c}  1 {1 a 3 a 2 b}
  1.8  "INSERT INTO a4 SELECT 4, 'e' UNION ALL SELECT 3, 'e'"
        {UNIQUE constraint failed: a4.c}  1 {1 a 3 a 2 b}
  1.9  "INSERT OR FAIL INTO a4 SELECT 4, 'e' UNION ALL SELECT 3, 'e'"
        {UNIQUE constraint failed: a4.c}  1 {1 a 3 a 2 b 4 e}

  2.1  "INSERT INTO a4 VALUES(2,'f')"  
        {UNIQUE constraint failed: a4.c}  1 {1 a 3 a 2 b 4 e}
  2.2  "REPLACE INTO a4 VALUES(2, 'f')" {}  1 {1 a 3 a 4 e 2 f}
} {
  do_catchsql_test e_insert-4.1.$tn.1 $sql [list [expr {$error!=""}] $error]
  do_execsql_test  e_insert-4.1.$tn.2 {SELECT * FROM a4} [list {*}$data]
  do_test          e_insert-4.1.$tn.3 {sqlite3_get_autocommit db} $ac
}

# EVIDENCE-OF: R-59829-49719 The optional "schema-name." prefix on the
# table-name is supported for top-level INSERT statements only.
#
# EVIDENCE-OF: R-05731-00924 The table name must be unqualified for
# INSERT statements that occur within CREATE TRIGGER statements.
#
set err {1 {qualified table names are not allowed on INSERT, UPDATE, and DELETE statements within triggers}}

do_catchsql_test e_insert-5.1.1 {
  CREATE TRIGGER AFTER UPDATE ON a1 BEGIN
    INSERT INTO main.a4 VALUES(new.a, new.b);
  END;
} $err
do_catchsql_test e_insert-5.1.2 {
  CREATE TEMP TABLE IF NOT EXISTS tmptable(a, b);
  CREATE TRIGGER AFTER DELETE ON a3 BEGIN
    INSERT INTO temp.tmptable VALUES(1, 2);
  END;
} $err

# EVIDENCE-OF: R-15888-36326 Similarly, the "DEFAULT VALUES" form of the
# INSERT statement is supported for top-level INSERT statements only and
# not for INSERT statements within triggers.
#
do_catchsql_test e_insert-5.2.1 {
  CREATE TRIGGER AFTER UPDATE ON a1 BEGIN
    INSERT INTO a4 DEFAULT VALUES;
  END;
} {1 {near "DEFAULT": syntax error}}


delete_all_data

finish_test
