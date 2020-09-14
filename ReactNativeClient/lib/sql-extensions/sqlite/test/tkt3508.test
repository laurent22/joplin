# 2008 November 22
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
# $Id: tkt3508.test,v 1.5 2009/05/28 01:00:56 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3508-1.1 {
  catchsql {
    CREATE TABLE modificationsTmp (
      SUBSTRATE_HPRD_ID VARCHAR(80),
      SUBSTRATE_GENE_SYMBOL VARCHAR(80),
      SUBSTRATE_ISOFORM_ID VARCHAR(80),
      SUBSTRATE_REFSEQ_ID VARCHAR(80),
      SITE INTEGER,
      RESIDUE VARCHAR(80),
      ENZYME_NAME VARCHAR(80),
      ENZYME_HPRD_ID VARCHAR(80),
      MODIFICATION_TYPE VARCHAR(80),
      EXPERIMENT_TYPE VARCHAR(80),
      REFERENCE_ID VARCHAR(80)
    );
    select SUBSTRATE_HPRD_ID, count(substrate_refseq_id) as c
      from modificationsTmp where c > 1 group by SUBSTRATE_HPRD_ID;
  }
} {1 {misuse of aggregate: count()}}

finish_test
