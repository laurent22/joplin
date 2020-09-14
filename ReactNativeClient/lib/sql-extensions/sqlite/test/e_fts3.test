# 2009 November 28
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
# This file implements tests to verify the "testable statements" in the
# fts3.in document.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If this build does not include FTS3, skip the tests in this file.
#
ifcapable !fts3 { finish_test ; return }
source $testdir/fts3_common.tcl
source $testdir/malloc_common.tcl

# Procs used to make the tests in this file easier to read.
#
proc ddl_test {tn ddl} {
  uplevel [list do_write_test e_fts3-$tn sqlite_master $ddl]
}
proc write_test {tn tbl sql} {
  uplevel [list do_write_test e_fts3-$tn $tbl $sql]
}
proc read_test {tn sql result} {
  uplevel [list do_select_test e_fts3-$tn $sql $result]
}
proc error_test {tn sql result} {
  uplevel [list do_error_test e_fts3-$tn $sql $result]
}


#-------------------------------------------------------------------------
# The body of the following [foreach] block contains test cases to verify
# that the example code in fts3.html works as expected. The tests run three
# times, with different values for DO_MALLOC_TEST.
# 
#   DO_MALLOC_TEST=0: Run tests with no OOM errors.
#   DO_MALLOC_TEST=1: Run tests with transient OOM errors.
#   DO_MALLOC_TEST=2: Run tests with persistent OOM errors.
#
foreach {DO_MALLOC_TEST enc} {
  0 utf-8
  1 utf-8
  2 utf-8
  1 utf-16
} {

#if {$DO_MALLOC_TEST} break

# Reset the database and database connection. If this iteration of the 
# [foreach] loop is testing with OOM errors, disable the lookaside buffer.
#
db close
forcedelete test.db test.db-journal
sqlite3 db test.db
if {$DO_MALLOC_TEST} { sqlite3_db_config_lookaside db 0 0 0 }
db eval "PRAGMA encoding = '$enc'"

proc mit {blob} {
  set scan(littleEndian) i*
  set scan(bigEndian) I*
  binary scan $blob $scan($::tcl_platform(byteOrder)) r
  return $r
}
db func mit mit

##########################################################################
# Test the example CREATE VIRTUAL TABLE statements in section 1.1 
# of fts3.in.
#
ddl_test   1.1.1.1 {CREATE VIRTUAL TABLE data USING fts3()}
read_test  1.1.1.2 {PRAGMA table_info(data)} {0 content {} 0 {} 0}

ddl_test   1.1.2.1 {
  CREATE VIRTUAL TABLE pages USING fts3(title, keywords, body)
}
read_test  1.1.2.2 {
  PRAGMA table_info(pages)
} {0 title {} 0 {} 0 1 keywords {} 0 {} 0 2 body {} 0 {} 0}

ddl_test   1.1.3.1 {
  CREATE VIRTUAL TABLE mail USING fts3(
      subject VARCHAR(256) NOT NULL,
      body TEXT CHECK(length(body)<10240)
  )
}
read_test  1.1.3.2 {
  PRAGMA table_info(mail)
} {0 subject {} 0 {} 0 1 body {} 0 {} 0}

# A very large string. Used to test if the constraint on column "body" of
# table "mail" is enforced (it should not be - FTS3 tables do not support
# constraints).
set largetext [string repeat "the quick brown fox " 5000]
write_test 1.1.3.3 mail_content { INSERT INTO mail VALUES(NULL, $largetext) }
read_test  1.1.3.4 {
  SELECT subject IS NULL, length(body) FROM mail
} [list 1 100000]

ddl_test   1.1.4.1 {
  CREATE VIRTUAL TABLE papers USING fts3(author, document, tokenize=porter)
}
read_test  1.1.4.2 {
  PRAGMA table_info(papers)
} {0 author {} 0 {} 0 1 document {} 0 {} 0}

ddl_test   1.1.5.1 {
  CREATE VIRTUAL TABLE simpledata USING fts3(tokenize=simple)
}
read_test  1.1.5.2 {
  PRAGMA table_info(simpledata)
} {0 content {} 0 {} 0}

ifcapable icu {
  ddl_test 1.1.6.1 {
    CREATE VIRTUAL TABLE names USING fts3(a, b, tokenize=icu en_AU)
  }
  read_test  1.1.6.2 {
    PRAGMA table_info(names)
  } {0 a {} 0 {} 0 1 b {} 0 {} 0}
}

ddl_test   1.1.7.1 {DROP TABLE data}
ddl_test   1.1.7.2 {DROP TABLE pages}
ddl_test   1.1.7.3 {DROP TABLE mail}
ddl_test   1.1.7.4 {DROP TABLE papers}
ddl_test   1.1.7.5 {DROP TABLE simpledata}
read_test  1.1.7.6 {SELECT * FROM sqlite_master} {}

# The following is not one of the examples in section 1.1. It tests 
# specifying an FTS3 table with no module arguments using a slightly
# different syntax.
ddl_test   1.1.8.1 {CREATE VIRTUAL TABLE data USING fts3;}
read_test  1.1.8.2 {PRAGMA table_info(data)} {0 content {} 0 {} 0}
ddl_test   1.1.8.3 {DROP TABLE data}

##########################################################################
# Test the examples in section 1.2 (populating fts3 tables)
#
ddl_test   1.2.1.1 {
  CREATE VIRTUAL TABLE pages USING fts3(title, body);
}
write_test 1.2.1.2 pages_content {
  INSERT INTO pages(docid, title, body) 
  VALUES(53, 'Home Page', 'SQLite is a software...');
}
read_test  1.2.1.3 {
  SELECT docid, * FROM pages
} {53 {Home Page} {SQLite is a software...}}

write_test 1.2.1.4 pages_content {
  INSERT INTO pages(title, body) 
  VALUES('Download', 'All SQLite source code...');
}
read_test  1.2.1.5 {
  SELECT docid, * FROM pages
} {53 {Home Page} {SQLite is a software...} 54 Download {All SQLite source code...}}

write_test 1.2.1.6 pages_content {
  UPDATE pages SET title = 'Download SQLite' WHERE rowid = 54
}
read_test  1.2.1.7 {
  SELECT docid, * FROM pages
} {53 {Home Page} {SQLite is a software...} 54 {Download SQLite} {All SQLite source code...}}

write_test 1.2.1.8 pages_content { DELETE FROM pages }
read_test  1.2.1.9 { SELECT docid, * FROM pages } {}

do_error_test fts3-1.2.1.10 {
  INSERT INTO pages(rowid, docid, title, body) VALUES(1, 2, 'A title', 'A document body');
} {SQL logic error}

# Test the optimize() function example:
ddl_test   1.2.2.1 { CREATE VIRTUAL TABLE docs USING fts3 }
write_test 1.2.2.2 docs_content {
  INSERT INTO docs VALUES('Others translate the first clause as');
}
write_test 1.2.2.3 docs_content {
  INSERT INTO docs VALUES('"which is for Solomon," meaning that');
}
write_test 1.2.2.4 docs_content {
  INSERT INTO docs VALUES('the book is dedicated to Solomon.');
}
read_test  1.2.2.5 { SELECT count(*) FROM docs_segdir } {3}
write_test 1.2.2.6 docs_segdir {
  INSERT INTO docs(docs) VALUES('optimize');
}
read_test  1.2.2.7 { SELECT count(*) FROM docs_segdir } {1}
ddl_test   1.2.2.8 { DROP TABLE docs }

##########################################################################
# Test the examples in section 1.3 (querying FTS3 tables)
#
ddl_test   1.3.1.1 { CREATE VIRTUAL TABLE mail USING fts3(subject, body) }
read_test  1.3.1.2 { 
  SELECT * FROM mail WHERE rowid = 15;                -- Fast. Rowid lookup.
  SELECT * FROM mail WHERE body MATCH 'sqlite';       -- Fast. Full-text query.
  SELECT * FROM mail WHERE mail MATCH 'search';       -- Fast. Full-text query.
  SELECT * FROM mail WHERE rowid BETWEEN 15 AND 20;   -- Slow. Linear scan.
  SELECT * FROM mail WHERE subject = 'database';      -- Slow. Linear scan.
  SELECT * FROM mail WHERE subject MATCH 'database';  -- Fast. Full-text query.
} {}
ddl_test   1.3.1.3 { DROP TABLE mail }

ddl_test   1.3.2.1 { CREATE VIRTUAL TABLE mail USING fts3(subject, body) }

write_test 1.3.2.2 mail_content {
  INSERT INTO mail(docid, subject, body) 
  VALUES(1, 'software feedback', 'found it too slow')
}
write_test 1.3.2.3 mail_content {
  INSERT INTO mail(docid, subject, body) 
  VALUES(2, 'software feedback', 'no feedback')
}
write_test 1.3.2.4 mail_content {
  INSERT INTO mail(docid, subject, body) 
  VALUES(3, 'slow lunch order',  'was a software problem')
}
read_test  1.3.2.5 {
  SELECT * FROM mail WHERE subject MATCH 'software'
} {{software feedback} {found it too slow} {software feedback} {no feedback}}
read_test  1.3.2.6 {
  SELECT * FROM mail WHERE body MATCH 'feedback'
} {{software feedback} {no feedback}}
read_test  1.3.2.7 {
  SELECT * FROM mail WHERE mail MATCH 'software'
} {{software feedback} {found it too slow} {software feedback} {no feedback} {slow lunch order} {was a software problem}}
read_test  1.3.2.7 {
  SELECT * FROM mail WHERE mail MATCH 'slow'
} {{software feedback} {found it too slow} {slow lunch order} {was a software problem}}
ddl_test   1.3.2.8 { DROP TABLE mail }

ddl_test   1.3.3.1 { CREATE VIRTUAL TABLE docs USING fts3(content) }
read_test  1.3.3.2 { SELECT * FROM docs WHERE docs MATCH 'sqlite' } {}
read_test  1.3.3.3 { SELECT * FROM docs WHERE docs.docs MATCH 'sqlite' } {}
read_test  1.3.3.4 { SELECT * FROM docs WHERE main.docs.docs MATCH 'sqlite' } {}
do_error_test e_fts3-1.3.3.5 { 
  SELECT * FROM docs WHERE main.docs MATCH 'sqlite' 
} {no such column: main.docs}
ddl_test   1.3.2.8 { DROP TABLE docs }

##########################################################################
# Test the examples in section 3 (full-text index queries).
#
ddl_test   1.4.1.1 { CREATE VIRTUAL TABLE docs USING fts3(title, body) }
unset -nocomplain R
foreach {tn title body} {
  2 "linux driver" "a device"
  3 "driver"       "linguistic trick"
  4 "problems"     "linux problems"
  5 "linux"        "big problems"
  6 "linux driver" "a device driver problem"
  7 "good times"   "applications for linux"
  8 "not so good"  "linux applications"
  9 "alternative"  "linoleum appliances"
 10 "no L I N"     "to be seen"
} {
  write_test 1.4.1.$tn docs_content { INSERT INTO docs VALUES($title,$body) }
  set R($tn) [list $title $body]
}

read_test  1.4.1.11 { 
  SELECT * FROM docs WHERE docs MATCH 'linux'
} [concat $R(2) $R(4) $R(5) $R(6) $R(7) $R(8)]
read_test  1.4.1.12 { 
  SELECT * FROM docs WHERE docs MATCH 'lin*'
} [concat $R(2) $R(3) $R(4) $R(5) $R(6) $R(7) $R(8) $R(9)]
read_test  1.4.1.13 { 
  SELECT * FROM docs WHERE docs MATCH 'title:linux problems'
} [concat $R(5)]
read_test  1.4.1.14 { 
  SELECT * FROM docs WHERE body MATCH 'title:linux driver'
} [concat $R(6)]
read_test  1.4.1.15 { 
  SELECT * FROM docs WHERE docs MATCH '"linux applications"'
} [concat $R(8)]
read_test  1.4.1.16 { 
  SELECT * FROM docs WHERE docs MATCH '"lin* app*"'
} [concat $R(8) $R(9)]
ddl_test   1.4.1.17 { DROP TABLE docs }
unset R

ddl_test   1.4.2.1 { CREATE VIRTUAL TABLE docs USING fts3() }
write_test 1.4.2.2 docs_content { 
  INSERT INTO docs VALUES(
  'SQLite is an ACID compliant embedded relational database management system')
}
foreach {tn query hit} {
3 {SELECT * FROM docs WHERE docs MATCH 'sqlite NEAR database'} 1
4 {SELECT * FROM docs WHERE docs MATCH 'database NEAR/6 sqlite'} 1
5 {SELECT * FROM docs WHERE docs MATCH 'database NEAR/5 sqlite'} 0
6 {SELECT * FROM docs WHERE docs MATCH 'database NEAR/2 "ACID compliant"'} 1
7 {SELECT * FROM docs WHERE docs MATCH '"ACID compliant" NEAR/2 sqlite'} 1
8 {SELECT * FROM docs WHERE docs MATCH 'sqlite NEAR/2 acid NEAR/2 relational'} 1
9 {SELECT * FROM docs WHERE docs MATCH 'acid NEAR/2 sqlite NEAR/2 relational'} 0
} {
  set res [db eval {SELECT * FROM docs WHERE $hit}]
  read_test 1.4.2.$tn $query $res
}
ddl_test 1.4.2.10 { DROP TABLE docs }

##########################################################################
# Test the example in section 3.1 (set operators with enhanced syntax).
#
set sqlite_fts3_enable_parentheses 1
ddl_test 1.5.1.1 { CREATE VIRTUAL TABLE docs USING fts3() }
foreach {tn docid content} {
  2 1 "a database is a software system"
  3 2 "sqlite is a software system"
  4 3 "sqlite is a database"
} {
  set R($docid) $content
  write_test 1.5.1.$tn docs_content { 
    INSERT INTO docs(docid, content) VALUES($docid, $content)
  }
}
read_test 1.5.1.4 {
  SELECT * FROM docs WHERE docs MATCH 'sqlite AND database'
} [list $R(3)]
read_test 1.5.1.5 {
  SELECT * FROM docs WHERE docs MATCH 'database sqlite'
} [list $R(3)]
read_test 1.5.1.6 {
  SELECT * FROM docs WHERE docs MATCH 'sqlite OR database'
} [list $R(1) $R(2) $R(3)]
read_test 1.5.1.7 {
  SELECT * FROM docs WHERE docs MATCH 'database NOT sqlite'
} [list $R(1)]
read_test 1.5.1.8 {
  SELECT * FROM docs WHERE docs MATCH 'database and sqlite'
} {}

write_test 1.5.2.1 docs_content {
  INSERT INTO docs 
    SELECT 'sqlite is also a library' UNION ALL
    SELECT 'library software'
}
read_test 1.5.2.2 {
  SELECT docid FROM docs WHERE docs MATCH 'sqlite AND database OR library'
} {3 4 5}
read_test 1.5.2.3 {
  SELECT docid FROM docs WHERE docs MATCH 'sqlite AND database'
    UNION
  SELECT docid FROM docs WHERE docs MATCH 'library'
} {3 4 5}
write_test 1.5.2.4 docs_content {
  INSERT INTO docs 
    SELECT 'the sqlite library runs on linux' UNION ALL
    SELECT 'as does the sqlite database (on linux)' UNION ALL
    SELECT 'the sqlite database is accessed by the sqlite library'
}
read_test 1.5.2.2 {
  SELECT docid FROM docs 
  WHERE docs MATCH '("sqlite database" OR "sqlite library") AND linux';
} {6 7}
read_test 1.5.2.3 {
  SELECT docid FROM docs WHERE docs MATCH 'linux'
    INTERSECT
  SELECT docid FROM (
    SELECT docid FROM docs WHERE docs MATCH '"sqlite library"'
      UNION
    SELECT docid FROM docs WHERE docs MATCH '"sqlite database"'
  );
} {6 7}

##########################################################################
# Test the examples in section 3.2 (set operators with standard syntax).
# These tests reuse the table populated by the block above.
#
set sqlite_fts3_enable_parentheses 0
read_test 1.6.1.1 {
  SELECT * FROM docs WHERE docs MATCH 'sqlite -database'
} {{sqlite is a software system} {sqlite is also a library} {the sqlite library runs on linux}}
read_test 1.6.1.2 {
  SELECT * FROM docs WHERE docs MATCH 'sqlite OR database library'
} {{sqlite is also a library} {the sqlite library runs on linux} {the sqlite database is accessed by the sqlite library}}

set sqlite_fts3_enable_parentheses 1
read_test 1.6.1.3 {
  SELECT * FROM docs WHERE docs MATCH 'sqlite OR database library'
} {{sqlite is a software system} {sqlite is a database} {sqlite is also a library} {the sqlite library runs on linux} {as does the sqlite database (on linux)} {the sqlite database is accessed by the sqlite library}}
read_test 1.6.1.4 {
  SELECT * FROM docs WHERE docs MATCH '(sqlite OR database) library'
} {{sqlite is also a library} {the sqlite library runs on linux} {the sqlite database is accessed by the sqlite library}}
set sqlite_fts3_enable_parentheses 0
ddl_test  1.6.1.5 { DROP TABLE docs }

##########################################################################
# Test the examples in section 4 (auxillary functions).
#
ddl_test   1.7.1.1 { CREATE VIRTUAL TABLE mail USING fts3(subject, body) }

write_test 1.7.1.2 mail_content { 
  INSERT INTO mail VALUES(
    'hello world', 'This message is a hello world message.');
}
write_test 1.7.1.3 mail_content { 
  INSERT INTO mail VALUES(
    'urgent: serious', 'This mail is seen as a more serious mail');
}

read_test  1.7.1.4 { 
  SELECT offsets(mail) FROM mail WHERE mail MATCH 'world';
} {{0 0 6 5 1 0 24 5}}
read_test  1.7.1.5 { 
  SELECT offsets(mail) FROM mail WHERE mail MATCH 'message'
} {{1 0 5 7 1 0 30 7}}
read_test  1.7.1.6 { 
  SELECT offsets(mail) FROM mail WHERE mail MATCH '"serious mail"'
} {{1 0 28 7 1 1 36 4}}

ddl_test   1.7.2.1 { CREATE VIRTUAL TABLE text USING fts3() }

write_test 1.7.2.2 text_content {
  INSERT INTO text VALUES('
    During 30 Nov-1 Dec, 2-3oC drops. Cool in the upper portion, minimum temperature 14-16oC and cool elsewhere, minimum temperature 17-20oC. Cold to very cold on mountaintops, minimum temperature 6-12oC. Northeasterly winds 15-30 km/hr. After that, temperature increases. Northeasterly winds 15-30 km/hr.
  ');
}

read_test  1.7.2.3 {
  SELECT snippet(text) FROM text WHERE text MATCH 'cold'
} {{<b>...</b>cool elsewhere, minimum temperature 17-20oC. <b>Cold</b> to very <b>cold</b> on mountaintops, minimum temperature 6<b>...</b>}}

read_test  1.7.2.4 {
  SELECT snippet(text, '[', ']', '...') FROM text WHERE text MATCH '"min* tem*"'
} {{...the upper portion, [minimum] [temperature] 14-16oC and cool elsewhere, [minimum] [temperature] 17-20oC. Cold...}}

ddl_test   1.7.3.1 { DROP TABLE IF EXISTS t1 }
ddl_test   1.7.3.2 { CREATE VIRTUAL TABLE t1 USING fts3(a, b) }
write_test 1.7.3.3 t1_content { 
  INSERT INTO t1 VALUES(
    'transaction default models default', 'Non transaction reads');
}
write_test 1.7.3.4 t1_content { 
  INSERT INTO t1 VALUES('the default transaction', 'these semantics present');
}
write_test 1.7.3.5 t1_content { 
  INSERT INTO t1 VALUES('single request', 'default data');
}
read_test  1.7.3.6 { 
  SELECT mit(matchinfo(t1)) FROM t1 
    WHERE t1 MATCH 'default transaction "these semantics"';
} {{3 2 1 3 2 0 1 1 1 2 2 0 1 1 0 0 0 1 1 1}}

##########################################################################
# Test the example in section 5 (custom tokenizers).
#
ddl_test   1.8.1.1 { CREATE VIRTUAL TABLE simple USING fts3(tokenize=simple) } 
write_test 1.8.1.2 simple_content { 
  INSERT INTO simple VALUES('Right now they''re very frustrated')
}
read_test 1.8.1.3 {SELECT docid FROM simple WHERE simple MATCH 'Frustrated'} {1} 
read_test 1.8.1.4 {SELECT docid FROM simple WHERE simple MATCH 'Frustration'} {}

ddl_test   1.8.2.1 { CREATE VIRTUAL TABLE porter USING fts3(tokenize=porter) } 
write_test 1.8.2.2 porter_content { 
  INSERT INTO porter VALUES('Right now they''re very frustrated')
}
read_test 1.8.2.4 {
  SELECT docid FROM porter WHERE porter MATCH 'Frustration'
} {1}

}
# End of tests of example code in fts3.html
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Test that errors in the arguments passed to the snippet and offsets
# functions are handled correctly.
#
set DO_MALLOC_TEST 0
ddl_test   2.1.0 { DROP TABLE IF EXISTS t1 }
ddl_test   2.1.1 { CREATE VIRTUAL TABLE t1 USING fts3(a, b) }
write_test 2.1.2 t1_content { 
  INSERT INTO t1 VALUES('one two three', x'A1B2C3D4E5F6');
}
error_test 2.1.3 {
  SELECT offsets(a) FROM t1 WHERE a MATCH 'one'
} {illegal first argument to offsets}
error_test 2.1.4 {
  SELECT offsets(b) FROM t1 WHERE a MATCH 'one'
} {illegal first argument to offsets}
error_test 2.1.5 {
  SELECT optimize(a) FROM t1 LIMIT 1
} {illegal first argument to optimize}
error_test 2.1.6 {
  SELECT snippet(a) FROM t1 WHERE a MATCH 'one'
} {illegal first argument to snippet}
error_test 2.1.7 {
  SELECT snippet() FROM t1 WHERE a MATCH 'one'
} {unable to use function snippet in the requested context}
error_test 2.1.8 {
  SELECT snippet(a, b, 'A', 'B', 'C', 'D', 'E') FROM t1 WHERE a MATCH 'one'
} {wrong number of arguments to function snippet()}
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Test the effect of an OOM error while installing the FTS3 module (i.e.
# opening a database handle). This case was not tested by the OOM testing
# of the document examples above.
#
do_malloc_test e_fts3-3 -tclbody { 
  if {[catch {sqlite3 db test.db}]} { error "out of memory" }
}
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Verify the return values of the optimize() function. If no error occurs,
# the returned value should be "Index optimized" if the data structure
# was modified, or "Index already optimal" if it were not.
#
set DO_MALLOC_TEST 0
ddl_test   4.1 { CREATE VIRTUAL TABLE t4 USING fts3(a, b) }
write_test 4.2 t4_content {
  INSERT INTO t4 VALUES('In Xanadu', 'did Kubla Khan');
}
write_test 4.3 t4_content {
  INSERT INTO t4 VALUES('a stately pleasure', 'dome decree');
}
do_test e_fts3-4.4 {
  execsql { SELECT optimize(t4) FROM t4 LIMIT 1 } 
} {{Index optimized}}
do_test e_fts3-4.5 {
  execsql { SELECT optimize(t4) FROM t4 LIMIT 1 } 
} {{Index already optimal}}
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Test that the snippet function appears to work correctly with 1, 2, 3
# or 4 arguments passed to it.
#
set DO_MALLOC_TEST 0
ddl_test   5.1 { CREATE VIRTUAL TABLE t5 USING fts3(x) }
write_test 5.2 t5_content {
  INSERT INTO t5 VALUES('In Xanadu did Kubla Khan A stately pleasure-dome decree Where Alph, the sacred river, ran Through caverns measureless to man Down to a sunless sea.  So twice five miles of fertile ground With walls and towers were girdled round : And there were gardens bright with sinuous rills, Where blossomed many an incense-bearing tree ; And here were forests ancient as the hills, Enfolding sunny spots of greenery.');
}
read_test 5.3 { 
  SELECT snippet(t5) FROM t5 WHERE t5 MATCH 'miles'
} {{<b>...</b>to a sunless sea.  So twice five <b>miles</b> of fertile ground With walls and towers<b>...</b>}}
read_test 5.4 { 
  SELECT snippet(t5, '<i>') FROM t5 WHERE t5 MATCH 'miles'
} {{<b>...</b>to a sunless sea.  So twice five <i>miles</b> of fertile ground With walls and towers<b>...</b>}}
read_test 5.5 { 
  SELECT snippet(t5, '<i>', '</i>') FROM t5 WHERE t5 MATCH 'miles'
} {{<b>...</b>to a sunless sea.  So twice five <i>miles</i> of fertile ground With walls and towers<b>...</b>}}
read_test 5.6 { 
  SELECT snippet(t5, '<i>', '</i>', 'XXX') FROM t5 WHERE t5 MATCH 'miles'
} {{XXXto a sunless sea.  So twice five <i>miles</i> of fertile ground With walls and towersXXX}}
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Test that an empty MATCH expression returns an empty result set. As
# does passing a NULL value as a MATCH expression.
#
set DO_MALLOC_TEST 0
ddl_test   6.1 { CREATE VIRTUAL TABLE t6 USING fts3(x) }
write_test 6.2 t5_content { INSERT INTO t6 VALUES('a'); }
write_test 6.3 t5_content { INSERT INTO t6 VALUES('b'); }
write_test 6.4 t5_content { INSERT INTO t6 VALUES('c'); }
read_test  6.5 { SELECT * FROM t6 WHERE t6 MATCH '' } {}
read_test  6.6 { SELECT * FROM t6 WHERE x MATCH '' } {}
read_test  6.7 { SELECT * FROM t6 WHERE t6 MATCH NULL } {}
read_test  6.8 { SELECT * FROM t6 WHERE x MATCH NULL } {}
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Test a few facets of the FTS3 xFilter() callback implementation:
#
#   1. That the sqlite3_index_constraint.usable flag is respected.
#
#   2. That it is an error to use the "docid" or "rowid" column of
#      an FTS3 table as the LHS of a MATCH operator.
#
#   3. That it is an error to AND together two MATCH expressions in 
#      that refer to a single FTS3 table in a WHERE clause.
#
#
set DO_MALLOC_TEST 0
ddl_test   7.1.1 { CREATE VIRTUAL TABLE t7 USING fts3(a) }
ddl_test   7.1.2 { CREATE VIRTUAL TABLE t8 USING fts3(b) }
write_test 7.1.3 t7_content { INSERT INTO t7(docid, a) VALUES(4,'number four') }
write_test 7.1.4 t7_content { INSERT INTO t7(docid, a) VALUES(5,'number five') }
write_test 7.1.5 t8_content { INSERT INTO t8(docid, b) VALUES(4,'letter D') }
write_test 7.1.6 t8_content { INSERT INTO t8(docid, b) VALUES(5,'letter E') }
read_test  7.1.7 {
  SELECT a || ':' || b FROM t7 JOIN t8 USING(docid)
} {{number four:letter D} {number five:letter E}}

error_test 7.2.1 {
  SELECT * FROM t7 WHERE docid MATCH 'number'
} {unable to use function MATCH in the requested context}
error_test 7.2.2 {
  SELECT * FROM t7 WHERE rowid MATCH 'number'
} {unable to use function MATCH in the requested context}

error_test 7.3.1 {
  SELECT * FROM t7 WHERE a MATCH 'number' AND a MATCH 'four'
} {unable to use function MATCH in the requested context}
error_test 7.3.2 {
  SELECT * FROM t7, t8 WHERE a MATCH 'number' AND a MATCH 'four'
} {unable to use function MATCH in the requested context}
error_test 7.3.3 {
  SELECT * FROM t7, t8 WHERE b MATCH 'letter' AND b MATCH 'd'
} {unable to use function MATCH in the requested context}
read_test 7.3.4 {
  SELECT * FROM t7, t8 WHERE a MATCH 'number' AND b MATCH 'letter'
} {{number four} {letter D} {number four} {letter E} {number five} {letter D} {number five} {letter E}}
read_test 7.3.5 {
  SELECT * FROM t7 WHERE a MATCH 'number' AND docid = 4
} {{number four}}

#-------------------------------------------------------------------------
# Test the quoting of FTS3 table column names. Names may be quoted using
# any of "", '', ``` or [].
#
set DO_MALLOC_TEST 0
ddl_test  8.1.1 { CREATE VIRTUAL TABLE t9a USING fts3("c1", [c2]) }
ddl_test  8.1.2 { CREATE VIRTUAL TABLE t9b USING fts3('c1', `c2`) }
read_test 8.1.3 { PRAGMA table_info(t9a) } {0 c1 {} 0 {} 0 1 c2 {} 0 {} 0}
read_test 8.1.4 { PRAGMA table_info(t9b) } {0 c1 {} 0 {} 0 1 c2 {} 0 {} 0}
ddl_test  8.2.1 { CREATE VIRTUAL TABLE t9c USING fts3("c""1", 'c''2') }
read_test 8.2.2 { PRAGMA table_info(t9c) } {0 c\"1 {} 0 {} 0 1 c'2 {} 0 {} 0}
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Test that FTS3 tables can be renamed using the ALTER RENAME command.
# OOM errors are tested during ALTER RENAME commands also.
#
foreach DO_MALLOC_TEST {0 1 2} {
  db close
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  if {$DO_MALLOC_TEST} { sqlite3_db_config_lookaside db 0 0 0 }

  ddl_test   9.1.1             { CREATE VIRTUAL TABLE t10 USING fts3(x) }
  write_test 9.1.2 t10_content { INSERT INTO t10 VALUES('fts3 tables') }
  write_test 9.1.3 t10_content { INSERT INTO t10 VALUES('are renameable') }

  read_test  9.1.4 {
    SELECT * FROM t10 WHERE t10 MATCH 'table*'
  } {{fts3 tables}}
  read_test  9.1.5 {
    SELECT * FROM t10 WHERE x MATCH 'rename*'
  } {{are renameable}}

  ddl_test   9.1.6             { ALTER TABLE t10 RENAME TO t11 }

  read_test  9.1.7 {
    SELECT * FROM t11 WHERE t11 MATCH 'table*'
  } {{fts3 tables}}
  read_test  9.1.8 {
    SELECT * FROM t11 WHERE x MATCH 'rename*'
  } {{are renameable}}
}
#-------------------------------------------------------------------------

#-------------------------------------------------------------------------
# Test a couple of cases involving corrupt data structures:
#
#   1) A case where a document referenced by the full-text index is
#      not present in the %_content table.
#
#   2) A badly formatted b-tree segment node.
#
set DO_MALLOC_TEST 0
ddl_test   10.1.1 { CREATE VIRTUAL TABLE ta USING fts3 }
write_test 10.1.2 ta_content { 
  INSERT INTO ta VALUES('During a summer vacation in 1790') }
write_test 10.1.3 ta_content {
  INSERT INTO ta VALUES('Wordsworth went on a walking tour') }
sqlite3_db_config db DEFENSIVE 0
write_test 10.1.4 ta_content { DELETE FROM ta_content WHERE rowid = 2 }
read_test  10.1.5 {
  SELECT * FROM ta WHERE ta MATCH 'summer'
} {{During a summer vacation in 1790}}
error_test 10.1.6 {
  SELECT * FROM ta WHERE ta MATCH 'walking'
} {database disk image is malformed}

write_test 10.2.1 ta_content { DELETE FROM ta }
write_test 10.2.2 ta_content { 
  INSERT INTO ta VALUES('debate demonstrated the rising difficulty') }
write_test 10.2.3 ta_content { 
  INSERT INTO ta VALUES('Google released its browser beta') }

set blob [db one {SELECT root FROM ta_segdir WHERE rowid = 2}]
binary scan $blob "a6 a3 a*" start middle end
set middle "\x0E\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x06\x06"
set blob [binary format "a6 a* a*" $start $middle $end]
write_test 10.2.4 ta_segdir { 
  UPDATE ta_segdir SET root = $blob WHERE rowid = 2
}
error_test 10.2.5 {
  SELECT * FROM ta WHERE ta MATCH 'beta'
} {database disk image is malformed}


finish_test
