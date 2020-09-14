# The new-security-options branch

## The problem that the [new-security-options](/timeline?r=new-security-options) branch tries to solve

An attacker might modify the schema of an SQLite database by adding
structures that cause code to run when some other application opens and
reads the database.  For example, the attacker might replace a table
definition with a view.  Or the attacker might add triggers to tables
or views, or add new CHECK constraints or generated columns or indexes
with expressions in the index list or in the WHERE clause.  If the
added features invoke SQL functions or virtual tables with side effects,
that might cause harm to the system if run by a high-privilege victim.
Or, the added features might exfiltrate information if the database is
read by a high-privilege victim.

The changes in this branch strive to make it easier for high-privilege
applications to safely read SQLite database files that might have been
maliciously corrupted by an attacker.

## Overview of changes in [new-security-options](/timeline?r=new-security-options)

The basic idea is to tag every SQL function and virtual table with one
of three risk levels:

  1.  Innocuous
  2.  Normal
  3.  Direct-Only

Innocuous functions/vtabs are safe and can be used at any time.
Direct-only elements, in contrast, might have cause side-effects and
should only be used from top-level SQL, not from within triggers or views nor
in elements of the schema such as CHECK constraint, DEFAULT values, 
generated columns, index expressions, or in the WHERE clause of a 
partial index that are potentially under the control of an attacker.
Normal elements behave like Innocuous if TRUSTED\_SCHEMA=on
and behave like direct-only if TRUSTED\_SCHEMA=off.

Application-defined functions and virtual tables go in as Normal unless
the application takes deliberate steps to change the risk level.

For backwards compatibility, the default is TRUSTED\_SCHEMA=on.  Documentation
will be updated to recommend applications turn TRUSTED\_SCHEMA to off.

An innocuous function or virtual table is one that can only read content
from the database file in which it resides, and can only alter the database
in which it resides.  Most SQL functions are innocuous.  For example, there
is no harm in an attacker running the abs() function.

Direct-only elements that have side-effects that go outside the database file
in which it lives, or return information from outside of the database file.
Examples of direct-only elements include:

  1.  The fts3\_tokenizer() function
  2.  The writefile() function
  3.  The readfile() function
  4.  The zipvfs virtual table
  5.  The csv virtual table

We do not want an attacker to be able to add these kinds of things to
the database schema and possibly trick a high-privilege application 
from performing any of these actions.  Therefore, functions and vtabs
with side-effects are marked as Direct-Only.

Legacy applications might add other risky functions or vtabs.  Those will
go in as "Normal" by default.  For optimal security, we want those risky
app-defined functions and vtabs to be direct-only, but making that the
default might break some legacy applications.  Hence, all app-defined
functions and vtabs go in as Normal, but the application can switch them
over to "Direct-Only" behavior using a single pragma.

The restrictions on the use of functions and virtual tables do not apply
to TEMP.  A TEMP VIEW or a TEMP TRIGGER can use any valid SQL function
or virtual table.  The idea is that TEMP views and triggers must be
directly created by the application and are thus under the control of the
application.  TEMP views and triggers cannot be created by an attacker who
corrupts the schema of a persistent database file.  Hence TEMP views and
triggers are safe.

## Specific changes

  1.  New sqlite3\_db\_config() option SQLITE\_DBCONFIG\_TRUSTED\_SCHEMA for
      turning TRUSTED\_SCHEMA on and off.  It defaults to ON.

  2.  Compile-time option -DSQLITE\_TRUSTED\_SCHEMA=0 causes the default
      TRUSTED\_SCHEMA setting to be off.

  3.  New pragma "PRAGMA trusted\_schema=(ON\|OFF);".  This provides access
      to the TRUSTED_SCHEMA setting for application coded using scripting
      languages or other secondary languages where they are unable to make
      calls to sqlite3\_db\_config().

  4.  New options for the "enc" parameter to sqlite3\_create\_function() and
      its kin:
      <ol type="a">
      <li>  _SQLITE\_INNOCUOUS_  &rarr; tags the new functions as Innocuous
      <li>  _SQLITE\_DIRECTONLY_ &rarr; tags the new functions as Direct-Only
      </ol>

  5.  New options to sqlite3\_vtab\_config():
      <ol type="a">
      <li>  _SQLITE\_VTAB\_INNOCUOUS_   &rarr; tags the vtab as Innocuous
      <li>  _SQLITE\_VTAB\_DIRECTONLY_  &rarr; tags the vtab as Direct-Only
      </ol>

  6.  Change many of the functions and virtual tables in the SQLite source
      tree to use one of the tags above.

  7.  Enhanced PRAGMA function\_list and virtual-table "pragma\_function\_list"
      with additional columns.  The columns now are:
      <ul>
      <li> _name_      &rarr;  Name of the function
      <li> _builtin_   &rarr;  1 for built-in functions.  0 otherwise.
      <li> _type_      &rarr;  's'=Scalar, 'a'=Aggregate, 'w'=Window
      <li> _enc_       &rarr;  'utf8', 'utf16le', or 'utf16be'
      <li> _narg_      &rarr;  number of argument
      <li> _flags_     &rarr;  Bitmask of SQLITE\_INNOCUOUS, SQLITE\_DIRECTONLY,
                               SQLITE\_DETERMINISTIC, SQLITE\_SUBTYPE, and
                               SQLITE\_FUNC\_INTERNAL flags.
      </ul>
      <p>The last four columns are new.

  8.  The function\_list PRAGMA now also shows all entries for each function.
      So, for example, if a function can take either 2 or 3 arguments,
      there are separate rows for the 2-argument and 3-argument versions of
      the function.

## Additional Notes

The function_list enhancements allow the application to query the set
of SQL functions that meet various criteria.  For example, to see all
SQL functions that are never allowed to be used in the schema or in
trigger or views:

~~~
    SELECT DISTINCT name FROM pragma_function_list
     WHERE (flags & 0x80000)!=0
     ORDER BY name;
~~~

Doing the same is not possible for virtual tables, as a virtual table
might be Innocuous, Normal, or Direct-Only depending on the arguments
passed into the xConnect method.
