IN-Operator Implementation Notes
================================

## Definitions:

An IN operator has one of the following formats:

>
     x IN (y1,y2,y3,...,yN)
     x IN (subquery)

The "x" is referred to as the LHS (left-hand side).  The list or subquery
on the right is called the RHS (right-hand side).  If the RHS is a list
it must be a non-empty list.  But if the RHS is a subquery, it can be an
empty set.

The LHS can be a scalar (a single quantity) or a vector (a list of
two or or more values) or a subquery that returns one or more columns.
We use the term "vector" to mean an actually list of values or a
subquery that returns two or more columns.  An isolated value or
a subquery that returns a single columns is called a scalar.

The RHS can be a subquery that returns a single column, a subquery
that returns two or more columns, or a list of scalars.  It is not
currently support for the RHS to be a list of vectors.

The number of columns for LHS must match the number of columns for
the RHS.  If the RHS is a list of values, then the LHS must be a 
scalar.  If the RHS is a subquery returning N columns, then the LHS
must be a vector of size N.

NULL values can occur in either or both of the LHS and RHS.
If the LHS contains only
NULL values then we say that it is a "total-NULL".  If the LHS contains
some NULL values and some non-NULL values, then it is a "partial-NULL".
For a scalar, there is no difference between a partial-NULL and a total-NULL.
The RHS is a partial-NULL if any row contains a NULL value.  The RHS is
a total-NULL if it contains one or more rows that contain only NULL values.
The LHS is called "non-NULL" if it contains no NULL values.  The RHS is
called "non-NULL" if it contains no NULL values in any row.

The result of an IN operator is one of TRUE, FALSE, or NULL.  A NULL result
means that it cannot be determined if the LHS is contained in the RHS due
to the presence of NULL values.  In some contexts (for example, when the IN
operator occurs in a WHERE clause)
the system only needs a binary result: TRUE or NOT-TRUE.  One can also
to define a binary result of FALSE and NOT-FALSE, but
it turns out that no extra optimizations are possible in that case, so if
the FALSE/NOT-FALSE binary is needed, we have to compute the three-state
TRUE/FALSE/NULL result and then combine the TRUE and NULL values into 
NOT-FALSE.

A "NOT IN" operator is computed by first computing the equivalent IN
operator, then interchanging the TRUE and FALSE results.

## Simple Full-Scan Algorithm

The following algorithm always compute the correct answer.  However, this
algorithm is suboptimal, especially if there are many rows on the RHS.

  1.  Set the null-flag to false
  2.  For each row in the RHS:
      <ol type='a'>
      <li>  Compare the LHS against the RHS
      <li>  If the LHS exactly matches the RHS, immediately return TRUE
      <li>  If the comparison result is NULL, set the null-flag to true
      </ol>
  3.  If the null-flag is true, return NULL.
  4.  Return FALSE

## Optimized Algorithm

The following procedure computes the same answer as the simple full-scan
algorithm, though it does so with less work in the common case.  This
is the algorithm that is implemented in SQLite.

  1.  If the RHS is a constant list of length 1 or 2, then rewrite the
      IN operator as a simple expression.  Implement

            x IN (y1,y2)

      as if it were

            x=y1 OR x=y2

      This is the INDEX_NOOP optimization and is only undertaken if the
      IN operator is used for membership testing.  If the IN operator is
      driving a loop, then skip this step entirely.

  2.  Check the LHS to see if it is a partial-NULL and if it is, jump
      ahead to step 5.

  3.  Do a binary search of the RHS using the LHS as a probe.  If
      an exact match is found, return TRUE.

  4.  If the RHS is non-NULL then return FALSE.

  5.  If we do not need to distinguish between FALSE and NULL,
      then return FALSE.
  
  6.  For each row in the RHS, compare that row against the LHS and
      if the result is NULL, immediately return NULL.  In the case
      of a scalar IN operator, we only need to look at the very first
      row the RHS because for a scalar RHS, all NULLs will always come 
      first.  If the RHS is empty, this step is a no-op.

  7.  Return FALSE.
