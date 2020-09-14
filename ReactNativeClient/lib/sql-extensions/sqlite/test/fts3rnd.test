# 2009 December 03
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Brute force (random data) tests for FTS3.
#

#-------------------------------------------------------------------------
#
# The FTS3 tests implemented in this file focus on testing that FTS3
# returns the correct set of documents for various types of full-text
# query. This is done using pseudo-randomly generated data and queries.
# The expected result of each query is calculated using Tcl code.
#
#   1. The database is initialized to contain a single table with three
#      columns. 100 rows are inserted into the table. Each of the three
#      values in each row is a document consisting of between 0 and 100
#      terms. Terms are selected from a vocabulary of $G(nVocab) terms.
#
#   2. The following is performed 100 times:
#
#      a. A row is inserted into the database. The row contents are 
#         generated as in step 1. The docid is a pseudo-randomly selected
#         value between 0 and 1000000.
# 
#      b. A psuedo-randomly selected row is updated. One of its columns is
#         set to contain a new document generated in the same way as the
#         documents in step 1.
# 
#      c. A psuedo-randomly selected row is deleted.
# 
#      d. For each of several types of fts3 queries, 10 SELECT queries
#         of the form:
# 
#           SELECT docid FROM <tbl> WHERE <tbl> MATCH '<query>'
# 
#         are evaluated. The results are compared to those calculated by
#         Tcl code in this file. The patterns used for the different query
#         types are:
# 
#           1.  query = <term>
#           2.  query = <prefix>
#           3.  query = "<term> <term>"
#           4.  query = "<term> <term> <term>"
#           5.  query = "<prefix> <prefix> <prefix>"
#           6.  query = <term> NEAR <term>
#           7.  query = <term> NEAR/11 <term> NEAR/11 <term>
#           8.  query = <term> OR <term>
#           9.  query = <term> NOT <term>
#           10. query = <term> AND <term>
#           11. query = <term> NEAR <term> OR <term> NEAR <term>
#           12. query = <term> NEAR <term> NOT <term> NEAR <term>
#           13. query = <term> NEAR <term> AND <term> NEAR <term>
# 
#         where <term> is a term psuedo-randomly selected from the vocabulary
#         and prefix is the first 2 characters of such a term followed by
#         a "*" character.
#     
#      Every second iteration, steps (a) through (d) above are performed
#      within a single transaction. This forces the queries in (d) to
#      read data from both the database and the in-memory hash table
#      that caches the full-text index entries created by steps (a), (b)
#      and (c) until the transaction is committed.
#
# The procedure above is run 5 times, using advisory fts3 node sizes of 50,
# 500, 1000 and 2000 bytes.
#
# After the test using an advisory node-size of 50, an OOM test is run using
# the database. This test is similar to step (d) above, except that it tests
# the effects of transient and persistent OOM conditions encountered while
# executing each query.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If this build does not include FTS3, skip the tests in this file.
#
ifcapable !fts3 { finish_test ; return }
source $testdir/fts3_common.tcl
source $testdir/malloc_common.tcl

set G(nVocab) 100

set nVocab 100
set lVocab [list]

expr srand(0)

# Generate a vocabulary of nVocab words. Each word is 3 characters long.
#
set lChar {a b c d e f g h i j k l m n o p q r s t u v w x y z}
for {set i 0} {$i < $nVocab} {incr i} {
  set len [expr int(rand()*3)+2]
  set    word [lindex $lChar [expr int(rand()*26)]]
  append word [lindex $lChar [expr int(rand()*26)]]
  if {$len>2} { append word [lindex $lChar [expr int(rand()*26)]] }
  if {$len>3} { append word [lindex $lChar [expr int(rand()*26)]] }
  lappend lVocab $word
}

proc random_term {} {
  lindex $::lVocab [expr {int(rand()*$::nVocab)}]
}

# Return a document consisting of $nWord arbitrarily selected terms
# from the $::lVocab list.
#
proc generate_doc {nWord} {
  set doc [list]
  for {set i 0} {$i < $nWord} {incr i} {
    lappend doc [random_term]
  }
  return $doc
}



# Primitives to update the table.
#
unset -nocomplain t1
proc insert_row {rowid} {
  set a [generate_doc [expr int((rand()*100))]]
  set b [generate_doc [expr int((rand()*100))]]
  set c [generate_doc [expr int((rand()*100))]]
  execsql { INSERT INTO t1(docid, a, b, c) VALUES($rowid, $a, $b, $c) }
  set ::t1($rowid) [list $a $b $c]
}
proc delete_row {rowid} {
  execsql { DELETE FROM t1 WHERE rowid = $rowid }
  catch {unset ::t1($rowid)}
}
proc update_row {rowid} {
  set cols {a b c}
  set iCol [expr int(rand()*3)]
  set doc  [generate_doc [expr int((rand()*100))]]
  lset ::t1($rowid) $iCol $doc
  execsql "UPDATE t1 SET [lindex $cols $iCol] = \$doc WHERE rowid = \$rowid"
}

proc simple_phrase {zPrefix} {
  set ret [list]

  set reg [string map {* {[^ ]*}} $zPrefix]
  set reg " $reg "

  foreach key [lsort -integer [array names ::t1]] {
    set value $::t1($key)
    set cnt [list]
    foreach col $value {
      if {[regexp $reg " $col "]} { lappend ret $key ; break }
    }
  }

  #lsort -uniq -integer $ret
  set ret
}

# This [proc] is used to test the FTS3 matchinfo() function.
# 
proc simple_token_matchinfo {zToken bDesc} {

  set nDoc(0) 0
  set nDoc(1) 0
  set nDoc(2) 0
  set nHit(0) 0
  set nHit(1) 0
  set nHit(2) 0

  set dir -inc
  if {$bDesc} { set dir -dec }

  foreach key [array names ::t1] {
    set value $::t1($key)
    set a($key) [list]
    foreach i {0 1 2} col $value {
      set hit [llength [lsearch -all $col $zToken]]
      lappend a($key) $hit
      incr nHit($i) $hit
      if {$hit>0} { incr nDoc($i) }
    }
  }

  set ret [list]
  foreach docid [lsort -integer $dir [array names a]] {
    if { [lindex [lsort -integer $a($docid)] end] } {
      set matchinfo [list 1 3]
      foreach i {0 1 2} hit $a($docid) {
        lappend matchinfo $hit $nHit($i) $nDoc($i)
      }
      lappend ret $docid $matchinfo
    }
  }

  set ret
} 

proc simple_near {termlist nNear} {
  set ret [list]

  foreach {key value} [array get ::t1] {
    foreach v $value {

      set l [lsearch -exact -all $v [lindex $termlist 0]]
      foreach T [lrange $termlist 1 end] {
        set l2 [list]
        foreach i $l {
          set iStart [expr $i - $nNear - 1]
          set iEnd [expr $i + $nNear + 1]
          if {$iStart < 0} {set iStart 0}
          foreach i2 [lsearch -exact -all [lrange $v $iStart $iEnd] $T] {
            incr i2 $iStart
            if {$i2 != $i} { lappend l2 $i2 } 
          }
        }
        set l [lsort -uniq -integer $l2]
      }

      if {[llength $l]} {
#puts "MATCH($key): $v"
        lappend ret $key
      } 
    }
  }

  lsort -unique -integer $ret
}

# The following three procs:
# 
#   setup_not A B
#   setup_or  A B
#   setup_and A B
#
# each take two arguments. Both arguments must be lists of integer values
# sorted by value. The return value is the list produced by evaluating
# the equivalent of "A op B", where op is the FTS3 operator NOT, OR or
# AND.
#
proc setop_not {A B} {
  foreach b $B { set n($b) {} }
  set ret [list]
  foreach a $A { if {![info exists n($a)]} {lappend ret $a} }
  return $ret
}
proc setop_or {A B} {
  lsort -integer -uniq [concat $A $B]
}
proc setop_and {A B} {
  foreach b $B { set n($b) {} }
  set ret [list]
  foreach a $A { if {[info exists n($a)]} {lappend ret $a} }
  return $ret
}

proc mit {blob} {
  set scan(littleEndian) i*
  set scan(bigEndian) I*
  binary scan $blob $scan($::tcl_platform(byteOrder)) r
  return $r
}
db func mit mit
set sqlite_fts3_enable_parentheses 1

proc do_orderbydocid_test {tn sql res} {
  uplevel [list do_select_test $tn.asc "$sql ORDER BY docid ASC" $res]
  uplevel [list do_select_test $tn.desc "$sql ORDER BY docid DESC" \
    [lsort -int -dec $res]
  ]
}

set NUM_TRIALS 100

foreach {nodesize order} {
  50    DESC
  50    ASC
  500   ASC
  1000  DESC
  2000  ASC
} {
  catch { array unset ::t1 }
  set testname "$nodesize/$order"

  # Create the FTS3 table. Populate it (and the Tcl array) with 100 rows.
  #
  db transaction {
    catchsql { DROP TABLE t1 }
    execsql "CREATE VIRTUAL TABLE t1 USING fts4(a, b, c, order=$order)"
    execsql "INSERT INTO t1(t1) VALUES('nodesize=$nodesize')"
    for {set i 0} {$i < 100} {incr i} { insert_row $i }
  }
  
  for {set iTest 1} {$iTest <= $NUM_TRIALS} {incr iTest} {
    catchsql COMMIT

    set DO_MALLOC_TEST 0
    set nRep 10
    if {$iTest==100 && $nodesize==50} { 
      set DO_MALLOC_TEST 1 
      set nRep 2
    }

    set ::testprefix fts3rnd-1.$testname.$iTest
  
    # Delete one row, update one row and insert one row.
    #
    set rows [array names ::t1]
    set nRow [llength $rows]
    set iUpdate [lindex $rows [expr {int(rand()*$nRow)}]]
    set iDelete $iUpdate
    while {$iDelete == $iUpdate} {
      set iDelete [lindex $rows [expr {int(rand()*$nRow)}]]
    }
    set iInsert $iUpdate
    while {[info exists ::t1($iInsert)]} {
      set iInsert [expr {int(rand()*1000000)}]
    }
    execsql BEGIN
      insert_row $iInsert
      update_row $iUpdate
      delete_row $iDelete
    if {0==($iTest%2)} { execsql COMMIT }

    if {0==($iTest%2)} { 
      #do_test 0 { fts3_integrity_check t1 } ok 
    }

    # Pick 10 terms from the vocabulary. Check that the results of querying
    # the database for the set of documents containing each of these terms
    # is the same as the result obtained by scanning the contents of the Tcl 
    # array for each term.
    #
    for {set i 0} {$i < 10} {incr i} {
      set term [random_term]
      do_select_test 1.$i.asc {
        SELECT docid, mit(matchinfo(t1)) FROM t1 WHERE t1 MATCH $term
        ORDER BY docid ASC
      } [simple_token_matchinfo $term 0]
      do_select_test 1.$i.desc {
        SELECT docid, mit(matchinfo(t1)) FROM t1 WHERE t1 MATCH $term
        ORDER BY docid DESC
      } [simple_token_matchinfo $term 1]
    }

    # This time, use the first two characters of each term as a term prefix
    # to query for. Test that querying the Tcl array produces the same results
    # as querying the FTS3 table for the prefix.
    #
    for {set i 0} {$i < $nRep} {incr i} {
      set prefix [string range [random_term] 0 end-1]
      set match "${prefix}*"
      do_orderbydocid_test 2.$i {
        SELECT docid FROM t1 WHERE t1 MATCH $match
      } [simple_phrase $match]
    }

    # Similar to the above, except for phrase queries.
    #
    for {set i 0} {$i < $nRep} {incr i} {
      set term [list [random_term] [random_term]]
      set match "\"$term\""
      do_orderbydocid_test 3.$i {
        SELECT docid FROM t1 WHERE t1 MATCH $match
      } [simple_phrase $term]
    }

    # Three word phrases.
    #
    for {set i 0} {$i < $nRep} {incr i} {
      set term [list [random_term] [random_term] [random_term]]
      set match "\"$term\""
      do_orderbydocid_test 4.$i {
        SELECT docid FROM t1 WHERE t1 MATCH $match
      } [simple_phrase $term]
    }

    # Three word phrases made up of term-prefixes.
    #
    for {set i 0} {$i < $nRep} {incr i} {
      set    query "[string range [random_term] 0 end-1]* "
      append query "[string range [random_term] 0 end-1]* "
      append query "[string range [random_term] 0 end-1]*"

      set match "\"$query\""
      do_orderbydocid_test 5.$i {
        SELECT docid FROM t1 WHERE t1 MATCH $match
      } [simple_phrase $query]
    }

    # A NEAR query with terms as the arguments:
    #
    #     ... MATCH '$term1 NEAR $term2' ...
    #
    for {set i 0} {$i < $nRep} {incr i} {
      set terms [list [random_term] [random_term]]
      set match [join $terms " NEAR "]
      do_orderbydocid_test 6.$i {
        SELECT docid FROM t1 WHERE t1 MATCH $match 
      } [simple_near $terms 10]
    }

    # A 3-way NEAR query with terms as the arguments.
    #
    for {set i 0} {$i < $nRep} {incr i} {
      set terms [list [random_term] [random_term] [random_term]]
      set nNear 11
      set match [join $terms " NEAR/$nNear "]
      do_orderbydocid_test 7.$i {
        SELECT docid FROM t1 WHERE t1 MATCH $match
      } [simple_near $terms $nNear]
    }
    
    # Set operations on simple term queries.
    #
    foreach {tn op proc} {
      8  OR  setop_or
      9  NOT setop_not
      10 AND setop_and
    } {
      for {set i 0} {$i < $nRep} {incr i} {
        set term1 [random_term]
        set term2 [random_term]
        set match "$term1 $op $term2"
        do_orderbydocid_test $tn.$i {
          SELECT docid FROM t1 WHERE t1 MATCH $match
        } [$proc [simple_phrase $term1] [simple_phrase $term2]]
      }
    }
 
    # Set operations on NEAR queries.
    #
    foreach {tn op proc} {
      11 OR  setop_or
      12 NOT setop_not
      13 AND setop_and
    } {
      for {set i 0} {$i < $nRep} {incr i} {
        set term1 [random_term]
        set term2 [random_term]
        set term3 [random_term]
        set term4 [random_term]
        set match "$term1 NEAR $term2 $op $term3 NEAR $term4"
        do_orderbydocid_test $tn.$i {
          SELECT docid FROM t1 WHERE t1 MATCH $match
        } [$proc                                  \
            [simple_near [list $term1 $term2] 10] \
            [simple_near [list $term3 $term4] 10]
          ]
      }
    }

    catchsql COMMIT
  }
}

finish_test
