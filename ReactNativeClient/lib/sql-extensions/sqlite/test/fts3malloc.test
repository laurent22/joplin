# 2009 October 22
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
# This file contains tests to verify that malloc() errors that occur
# within the FTS3 module code are handled correctly. 
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !fts3 { finish_test ; return }
source $testdir/malloc_common.tcl
source $testdir/fts3_common.tcl

# Ensure the lookaside buffer is disabled for these tests.
#
sqlite3 db test.db
sqlite3_db_config_lookaside db 0 0 0

set sqlite_fts3_enable_parentheses 1
set DO_MALLOC_TEST 1

# Test organization:
#
# fts3_malloc-1.*: Test OOM during CREATE and DROP table statements.
# fts3_malloc-2.*: Test OOM during SELECT operations.
# fts3_malloc-3.*: Test OOM during SELECT operations with a larger database.
# fts3_malloc-4.*: Test OOM during database write operations.
# fts3_malloc-5.*: Test that a couple of memory leaks that could follow
#                  OOM in tokenizer code have been fixed.
#


proc normal_list {l} {
  set ret [list]
  foreach elem $l {lappend ret $elem}
  set ret
}

do_write_test fts3_malloc-1.1 sqlite_master {
  CREATE VIRTUAL TABLE ft1 USING fts3(a, b)
}
do_write_test fts3_malloc-1.2 sqlite_master {
  CREATE VIRTUAL TABLE ft2 USING fts3([a], [b]);
}
do_write_test fts3_malloc-1.3 sqlite_master {
  CREATE VIRTUAL TABLE ft3 USING fts3('a', "b");
}
do_write_test fts3_malloc-1.4 sqlite_master {
  CREATE VIRTUAL TABLE ft4 USING fts3(`a`, 'fred''s column');
}
do_error_test fts3_malloc-1.5 {
  CREATE VIRTUAL TABLE ft5 USING fts3(a, b, tokenize unknown)
} {unknown tokenizer: unknown}
do_write_test fts3_malloc-1.6 sqlite_master {
  CREATE VIRTUAL TABLE ft6 USING fts3(a, b, tokenize porter)
}
do_write_test fts3_malloc-1.7 sqlite_master {
  CREATE VIRTUAL TABLE ft7 USING fts4(a, b, notindexed=b)
}

# Test the xConnect/xDisconnect methods:
#db eval { ATTACH 'test2.db' AS aux }
#do_write_test fts3_malloc-1.6 aux.sqlite_master {
#  CREATE VIRTUAL TABLE aux.ft7 USING fts3(a, b, c);
#}
#do_write_test fts3_malloc-1.6 aux.sqlite_master {
#  CREATE VIRTUAL TABLE aux.ft7 USING fts3(a, b, c);
#}



do_test fts3_malloc-2.0 {
  execsql { 
    DROP TABLE ft1;
    DROP TABLE ft2;
    DROP TABLE ft3;
    DROP TABLE ft4;
    DROP TABLE ft6;
    DROP TABLE ft7;
  }
  execsql { CREATE VIRTUAL TABLE ft USING fts3(a, b) }
  for {set ii 1} {$ii < 32} {incr ii} {
    set a [list]
    set b [list]
    if {$ii & 0x01} {lappend a one   ; lappend b neung}
    if {$ii & 0x02} {lappend a two   ; lappend b song }
    if {$ii & 0x04} {lappend a three ; lappend b sahm }
    if {$ii & 0x08} {lappend a four  ; lappend b see  }
    if {$ii & 0x10} {lappend a five  ; lappend b hah  }
    execsql { INSERT INTO ft VALUES($a, $b) }
  }
} {}

foreach {tn sql result} {
  1 "SELECT count(*) FROM sqlite_master" {5}
  2 "SELECT * FROM ft WHERE docid = 1"   {one neung}
  3 "SELECT * FROM ft WHERE docid = 2"   {two song}
  4 "SELECT * FROM ft WHERE docid = 3"   {{one two} {neung song}}

  5 "SELECT a FROM ft" {
    {one}                     {two}                 {one two}
    {three}                   {one three}           {two three}     
    {one two three}           {four}                {one four} 
    {two four}                {one two four}        {three four}   
    {one three four}          {two three four}      {one two three four}  
    {five}                    {one five}            {two five}            
    {one two five}            {three five}          {one three five} 
    {two three five}          {one two three five}  {four five}
    {one four five}           {two four five}       {one two four five}
    {three four five}         {one three four five} {two three four five}
    {one two three four five}
  }

  6 "SELECT a FROM ft WHERE a MATCH 'one'" {
    {one} {one two} {one three} {one two three}
    {one four} {one two four} {one three four} {one two three four}
    {one five} {one two five} {one three five} {one two three five}
    {one four five} {one two four five} 
    {one three four five} {one two three four five}
  }

  7 "SELECT a FROM ft WHERE a MATCH 'o*'" {
    {one} {one two} {one three} {one two three}
    {one four} {one two four} {one three four} {one two three four}
    {one five} {one two five} {one three five} {one two three five}
    {one four five} {one two four five} 
    {one three four five} {one two three four five}
  }

  8 "SELECT a FROM ft WHERE a MATCH 'o* t*'" {
    {one two}             {one three}           {one two three} 
    {one two four}        {one three four}      {one two three four} 
    {one two five}        {one three five}      {one two three five} 
    {one two four five}   {one three four five} {one two three four five}
  }

  9 "SELECT a FROM ft WHERE a MATCH '\"o* t*\"'" {
    {one two}             {one three}           {one two three} 
    {one two four}        {one three four}      {one two three four} 
    {one two five}        {one three five}      {one two three five} 
    {one two four five}   {one three four five} {one two three four five}
  }

  10 {SELECT a FROM ft WHERE a MATCH '"o* f*"'} {
    {one four}            {one five}            {one four five}
  }

  11 {SELECT a FROM ft WHERE a MATCH '"one two three"'} {
    {one two three}
    {one two three four}  
    {one two three five}
    {one two three four five}
  }

  12 {SELECT a FROM ft WHERE a MATCH '"two three four"'} {
    {two three four}
    {one two three four}
    {two three four five}
    {one two three four five}
  }

  12 {SELECT a FROM ft WHERE a MATCH '"two three" five'} {
    {two three five}         {one two three five}
    {two three four five}    {one two three four five}
  }

  13 {SELECT a FROM ft WHERE ft MATCH '"song sahm" hah'} {
    {two three five}         {one two three five}
    {two three four five}    {one two three four five}
  }

  14 {SELECT a FROM ft WHERE b MATCH 'neung'} {
    {one}                    {one two} 
    {one three}              {one two three}
    {one four}               {one two four} 
    {one three four}         {one two three four}
    {one five}               {one two five} 
    {one three five}         {one two three five}
    {one four five}          {one two four five} 
    {one three four five}    {one two three four five}
  }

  15 {SELECT a FROM ft WHERE b MATCH '"neung song sahm"'} {
    {one two three}          {one two three four}  
    {one two three five}     {one two three four five}
  }

  16 {SELECT a FROM ft WHERE b MATCH 'hah "song sahm"'} {
    {two three five}         {one two three five}
    {two three four five}    {one two three four five}
  }

  17 {SELECT a FROM ft WHERE b MATCH 'song OR sahm'} {
    {two}                     {one two}             {three}
    {one three}               {two three}           {one two three}
    {two four}                {one two four}        {three four}   
    {one three four}          {two three four}      {one two three four}  
    {two five}                {one two five}        {three five}
    {one three five}          {two three five}      {one two three five}
    {two four five}           {one two four five}   {three four five}
    {one three four five}     {two three four five} {one two three four five}
  }

  18 {SELECT a FROM ft WHERE a MATCH 'three NOT two'} {
    {three}                   {one three}           {three four}   
    {one three four}          {three five}          {one three five}
    {three four five}         {one three four five}
  }

  19 {SELECT a FROM ft WHERE b MATCH 'sahm NOT song'} {
    {three}                   {one three}           {three four}   
    {one three four}          {three five}          {one three five}
    {three four five}         {one three four five}
  }

  20 {SELECT a FROM ft WHERE ft MATCH 'sahm NOT song'} {
    {three}                   {one three}           {three four}   
    {one three four}          {three five}          {one three five}
    {three four five}         {one three four five}
  }

  21 {SELECT a FROM ft WHERE b MATCH 'neung NEAR song NEAR sahm'} {
    {one two three}           {one two three four}  
    {one two three five}      {one two three four five}
  }

} {
  set result [normal_list $result]
  do_select_test fts3_malloc-2.$tn $sql $result
}

do_test fts3_malloc-3.0 {
  execsql BEGIN
  for {set ii 32} {$ii < 1024} {incr ii} {
    set a [list]
    set b [list]
    if {$ii & 0x0001} {lappend a one   ; lappend b neung }
    if {$ii & 0x0002} {lappend a two   ; lappend b song  }
    if {$ii & 0x0004} {lappend a three ; lappend b sahm  }
    if {$ii & 0x0008} {lappend a four  ; lappend b see   }
    if {$ii & 0x0010} {lappend a five  ; lappend b hah   }
    if {$ii & 0x0020} {lappend a six   ; lappend b hok   }
    if {$ii & 0x0040} {lappend a seven ; lappend b jet   }
    if {$ii & 0x0080} {lappend a eight ; lappend b bairt }
    if {$ii & 0x0100} {lappend a nine  ; lappend b gow   }
    if {$ii & 0x0200} {lappend a ten   ; lappend b sip   }
    execsql { INSERT INTO ft VALUES($a, $b) }
  }
  execsql COMMIT
} {}
foreach {tn sql result} {
  1 "SELECT count(*) FROM ft" {1023}

  2 "SELECT a FROM ft WHERE a MATCH 'one two three four five six seven eight'" {
     {one two three four five six seven eight}
     {one two three four five six seven eight nine}
     {one two three four five six seven eight ten}
     {one two three four five six seven eight nine ten}
  }

  3 {SELECT count(*), sum(docid) FROM ft WHERE a MATCH 'o*'} {
    512 262144
  }

  4 {SELECT count(*), sum(docid) FROM ft WHERE a MATCH '"two three four"'} {
    128 66368
  }
} {
  set result [normal_list $result]
  do_select_test fts3_malloc-3.$tn $sql $result
}

do_test fts3_malloc-4.0 {
  execsql { DELETE FROM ft WHERE docid>=32 }
} {}
foreach {tn sql} {
  1 "DELETE FROM ft WHERE ft MATCH 'one'"
  2 "DELETE FROM ft WHERE ft MATCH 'three'"
  3 "DELETE FROM ft WHERE ft MATCH 'five'"
} {
  do_write_test fts3_malloc-4.1.$tn ft_content $sql
}
do_test fts3_malloc-4.2 {
  execsql { SELECT a FROM ft }
} {two four {two four}}

do_write_test fts3_malloc-5.1 ft_content {
  INSERT INTO ft VALUES('short alongertoken reallyquitealotlongerimeanit andthistokenisjustsolongthatonemightbeforgivenforimaginingthatitwasmerelyacontrivedexampleandnotarealtoken', 'cynics!')
}
do_test fts3_malloc-5.2 {
  execsql { CREATE VIRTUAL TABLE ft8 USING fts3(x, tokenize porter) }
} {}

do_write_test fts3_malloc-5.3 ft_content {
  INSERT INTO ft8 VALUES('short alongertoken reallyquitealotlongerimeanit andthistokenisjustsolongthatonemightbeforgivenforimaginingthatitwasmerelyacontrivedexampleandnotarealtoken')
}


finish_test
