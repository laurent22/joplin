# 2007 May 10
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
# $Id: fuzz_common.tcl,v 1.2 2009/01/05 19:36:30 drh Exp $

proc fuzz {TemplateList} {
  set n [llength $TemplateList]
  set i [expr {int(rand()*$n)}]
  set r [uplevel 1 subst -novar [list [lindex $TemplateList $i]]]

  string map {"\n" " "} $r
}

# Fuzzy generation primitives:
#
#     Literal
#     UnaryOp
#     BinaryOp
#     Expr
#     Table
#     Select
#     Insert
#

# Returns a string representing an SQL literal.
#
proc Literal {} {
  set TemplateList {
    456 0 -456 1 -1 
    2147483648 2147483647 2147483649 -2147483647 -2147483648 -2147483649
    'The' 'first' 'experiments' 'in' 'hardware' 'fault' 'injection'
    zeroblob(1000)
    NULL
    56.1 -56.1
    123456789.1234567899
  }
  fuzz $TemplateList
}

# Returns a string containing an SQL unary operator (e.g. "+" or "NOT").
#
proc UnaryOp {} {
  set TemplateList {+ - NOT ~}
  fuzz $TemplateList
}

# Returns a string containing an SQL binary operator (e.g. "*" or "/").
#
proc BinaryOp {} {
  set TemplateList {
    || * / % + - << >> & | < <= > >= = == != <> AND OR
    LIKE GLOB {NOT LIKE}
  }
  fuzz $TemplateList
}

# Return the complete text of an SQL expression.
#
set ::ExprDepth 0
proc Expr { {c {}} } {
  incr ::ExprDepth

  set TemplateList [concat $c $c $c {[Literal]}]
  if {$::ExprDepth < 3} {
    lappend TemplateList \
      {[Expr $c] [BinaryOp] [Expr $c]}                              \
      {[UnaryOp] [Expr $c]}                                         \
      {[Expr $c] ISNULL}                                            \
      {[Expr $c] NOTNULL}                                           \
      {CAST([Expr $c] AS blob)}                                     \
      {CAST([Expr $c] AS text)}                                     \
      {CAST([Expr $c] AS integer)}                                  \
      {CAST([Expr $c] AS real)}                                     \
      {abs([Expr])}                                                 \
      {coalesce([Expr], [Expr])}                                    \
      {hex([Expr])}                                                 \
      {length([Expr])}                                              \
      {lower([Expr])}                                               \
      {upper([Expr])}                                               \
      {quote([Expr])}                                               \
      {random()}                                                    \
      {randomblob(min(max([Expr],1), 500))}                         \
      {typeof([Expr])}                                              \
      {substr([Expr],[Expr],[Expr])}                                \
      {CASE WHEN [Expr $c] THEN [Expr $c] ELSE [Expr $c] END}       \
      {[Literal]} {[Literal]} {[Literal]}                           \
      {[Literal]} {[Literal]} {[Literal]}                           \
      {[Literal]} {[Literal]} {[Literal]}                           \
      {[Literal]} {[Literal]} {[Literal]}
  }
  if {$::SelectDepth < 4} {
    lappend TemplateList \
      {([Select 1])}                       \
      {[Expr $c] IN ([Select 1])}          \
      {[Expr $c] NOT IN ([Select 1])}      \
      {EXISTS ([Select 1])}                \
  } 
  set res [fuzz $TemplateList]
  incr ::ExprDepth -1
  return $res
}

# Return a valid table name.
#
set ::TableList [list]
proc Table {} {
  set TemplateList [concat sqlite_master $::TableList]
  fuzz $TemplateList
}

# Return one of:
#
#     "SELECT DISTINCT", "SELECT ALL" or "SELECT"
#
proc SelectKw {} {
  set TemplateList {
    "SELECT DISTINCT"
    "SELECT ALL"
    "SELECT"
  }
  fuzz $TemplateList
}

# Return a result set for a SELECT statement.
#
proc ResultSet {{nRes 0} {c ""}} {
  if {$nRes == 0} {
    set nRes [expr {rand()*2 + 1}]
  }

  set aRes [list]
  for {set ii 0} {$ii < $nRes} {incr ii} {
    lappend aRes [Expr $c]
  }

  join $aRes ", "
}

set ::SelectDepth 0
set ::ColumnList [list]
proc SimpleSelect {{nRes 0}} {

  set TemplateList {
      {[SelectKw] [ResultSet $nRes]}
  }

  # The ::SelectDepth variable contains the number of ancestor SELECT
  # statements (i.e. for a top level SELECT it is set to 0, for a
  # sub-select 1, for a sub-select of a sub-select 2 etc.).
  #
  # If this is already greater than 3, do not generate a complicated
  # SELECT statement. This tends to cause parser stack overflow (too
  # boring to bother with).
  #
  if {$::SelectDepth < 4} {
    lappend TemplateList \
        {[SelectKw] [ResultSet $nRes $::ColumnList] FROM ([Select])}     \
        {[SelectKw] [ResultSet $nRes] FROM ([Select])}                   \
        {[SelectKw] [ResultSet $nRes $::ColumnList] FROM [Table]}        \
        {
             [SelectKw] [ResultSet $nRes $::ColumnList] 
             FROM ([Select]) 
             GROUP BY [Expr]
             HAVING [Expr]
        }                                                                \

    if {0 == $nRes} {
      lappend TemplateList                                               \
          {[SelectKw] * FROM ([Select])}                                 \
          {[SelectKw] * FROM [Table]}                                    \
          {[SelectKw] * FROM [Table] WHERE [Expr $::ColumnList]}         \
          {
             [SelectKw] * 
             FROM [Table],[Table] AS t2 
             WHERE [Expr $::ColumnList] 
          } {
             [SelectKw] * 
             FROM [Table] LEFT OUTER JOIN [Table] AS t2 
             ON [Expr $::ColumnList]
             WHERE [Expr $::ColumnList] 
          }
    }
  } 

  fuzz $TemplateList
}

# Return a SELECT statement.
#
# If boolean parameter $isExpr is set to true, make sure the
# returned SELECT statement returns a single column of data.
#
proc Select {{nMulti 0}} {
  set TemplateList {
    {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} 
    {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} 
    {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} 
    {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} {[SimpleSelect $nMulti]} 
    {[SimpleSelect $nMulti] ORDER BY [Expr] DESC}
    {[SimpleSelect $nMulti] ORDER BY [Expr] ASC}
    {[SimpleSelect $nMulti] ORDER BY [Expr] ASC, [Expr] DESC}
    {[SimpleSelect $nMulti] ORDER BY [Expr] LIMIT [Expr] OFFSET [Expr]}
  }

  if {$::SelectDepth < 4} {
    if {$nMulti == 0} {
      set nMulti [expr {(rand()*2)+1}]
    }
    lappend TemplateList                                             \
        {[SimpleSelect $nMulti] UNION     [Select $nMulti]}          \
        {[SimpleSelect $nMulti] UNION ALL [Select $nMulti]}          \
        {[SimpleSelect $nMulti] EXCEPT    [Select $nMulti]}          \
        {[SimpleSelect $nMulti] INTERSECT [Select $nMulti]}
  }

  incr ::SelectDepth
  set res [fuzz $TemplateList]
  incr ::SelectDepth -1
  set res
}

# Generate and return a fuzzy INSERT statement.
#
proc Insert {} {
  set TemplateList {
      {INSERT INTO [Table] VALUES([Expr], [Expr], [Expr]);}
      {INSERT INTO [Table] VALUES([Expr], [Expr], [Expr], [Expr]);}
      {INSERT INTO [Table] VALUES([Expr], [Expr]);}
  }
  fuzz $TemplateList
}

proc Column {} {
  fuzz $::ColumnList
}

# Generate and return a fuzzy UPDATE statement.
#
proc Update {} {
  set TemplateList {
    {UPDATE [Table] 
     SET [Column] = [Expr $::ColumnList] 
     WHERE [Expr $::ColumnList]}
  }
  fuzz $TemplateList
}

proc Delete {} {
  set TemplateList {
    {DELETE FROM [Table] WHERE [Expr $::ColumnList]}
  }
  fuzz $TemplateList
}

proc Statement {} {
  set TemplateList {
    {[Update]}
    {[Insert]}
    {[Select]}
    {[Delete]}
  }
  fuzz $TemplateList
}

# Return an identifier. This just chooses randomly from a fixed set
# of strings.
proc Identifier {} {
  set TemplateList {
    This just chooses randomly a fixed 
    We would also thank the developers 
    for their analysis Samba
  }
  fuzz $TemplateList
}

proc Check {} {
  # Use a large value for $::SelectDepth, because sub-selects are
  # not allowed in expressions used by CHECK constraints.
  #
  set sd $::SelectDepth 
  set ::SelectDepth 500
  set TemplateList {
    {}
    {CHECK ([Expr])}
  }
  set res [fuzz $TemplateList]
  set ::SelectDepth $sd
  set res
}

proc Coltype {} {
  set TemplateList {
    {INTEGER PRIMARY KEY}
    {VARCHAR [Check]}
    {PRIMARY KEY}
  }
  fuzz $TemplateList
}

proc DropTable {} {
  set TemplateList {
    {DROP TABLE IF EXISTS [Identifier]}
  }
  fuzz $TemplateList
}

proc CreateView {} {
  set TemplateList {
    {CREATE VIEW [Identifier] AS [Select]}
  }
  fuzz $TemplateList
}
proc DropView {} {
  set TemplateList {
    {DROP VIEW IF EXISTS [Identifier]}
  }
  fuzz $TemplateList
}

proc CreateTable {} {
  set TemplateList {
    {CREATE TABLE [Identifier]([Identifier] [Coltype], [Identifier] [Coltype])}
    {CREATE TEMP TABLE [Identifier]([Identifier] [Coltype])}
  }
  fuzz $TemplateList
}

proc CreateOrDropTableOrView {} {
  set TemplateList {
    {[CreateTable]}
    {[DropTable]}
    {[CreateView]}
    {[DropView]}
  }
  fuzz $TemplateList
}

########################################################################

set ::log [open fuzzy.log w]

#
# Usage: do_fuzzy_test <testname> ?<options>?
# 
#     -template
#     -errorlist
#     -repeats
#     
proc do_fuzzy_test {testname args} {
  set ::fuzzyopts(-errorlist) [list]
  set ::fuzzyopts(-repeats) $::REPEATS
  array set ::fuzzyopts $args

  lappend ::fuzzyopts(-errorlist) {parser stack overflow} 
  lappend ::fuzzyopts(-errorlist) {ORDER BY}
  lappend ::fuzzyopts(-errorlist) {GROUP BY}
  lappend ::fuzzyopts(-errorlist) {datatype mismatch}
  lappend ::fuzzyopts(-errorlist) {non-deterministic functions prohibited}

  for {set ii 0} {$ii < $::fuzzyopts(-repeats)} {incr ii} {
    do_test ${testname}.$ii {
      set ::sql [subst $::fuzzyopts(-template)]
      puts $::log $::sql
      flush $::log
      set rc [catch {execsql $::sql} msg]
      set e 1
      if {$rc} {
        set e 0
        foreach error $::fuzzyopts(-errorlist) {
          if {[string first $error $msg]>=0} {
            set e 1
            break
          }
        }
      }
      if {$e == 0} {
        puts ""
        puts $::sql
        puts $msg
      }
      set e
    } {1}
  }
}
