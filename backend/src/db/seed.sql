-- seed.sql
-- =============================================================================
-- Sample data so the platform has something to show immediately.
-- Run AFTER schema.sql:  psql "$DATABASE_URL" -f src/db/seed.sql
--
-- Each problem is stdin/stdout based: the user's C++ program reads from standard
-- input and prints the answer to standard output. Test cases store the exact
-- input text and the exact expected output text; the judge compares them.
-- =============================================================================

-- Start clean so re-seeding doesn't create duplicates.
TRUNCATE submissions, test_cases, problems, users RESTART IDENTITY CASCADE;

-- ---- A demo user (used later once auth exists) -------------------------------
INSERT INTO users (username, email) VALUES ('demo', 'demo@example.com');

-- =============================================================================
-- Problem 1 — Sum of Two Numbers (Easy)
-- =============================================================================
INSERT INTO problems (slug, title, difficulty, description) VALUES (
  'sum-of-two-numbers',
  'Sum of Two Numbers',
  'Easy',
$$Given two integers **a** and **b**, print their sum.

### Input
A single line containing two space-separated integers `a` and `b`
(-10^9 <= a, b <= 10^9).

### Output
Print a single integer: `a + b`.

### Example
```
Input:  3 5
Output: 8
```$$
);

-- Test cases for problem 1 (its id is 1 since we truncated + RESTART IDENTITY).
INSERT INTO test_cases (problem_id, ordinal, input, expected_output, is_sample) VALUES
  (1, 1, '3 5',                     '8',           true),   -- sample (shown to user)
  (1, 2, '0 0',                     '0',           false),
  (1, 3, '-4 10',                   '6',           false),
  (1, 4, '1000000000 1000000000',  '2000000000',  false);  -- large-value edge case

-- =============================================================================
-- Problem 2 — Maximum in an Array (Easy)
-- =============================================================================
INSERT INTO problems (slug, title, difficulty, description) VALUES (
  'maximum-in-array',
  'Maximum in an Array',
  'Easy',
$$You are given an array of integers. Print the largest value.

### Input
The first line contains an integer `n` (1 <= n <= 10^5), the number of elements.
The second line contains `n` space-separated integers.

### Output
Print the maximum value in the array.

### Example
```
Input:
5
3 1 9 7 2
Output: 9
```$$
);

INSERT INTO test_cases (problem_id, ordinal, input, expected_output, is_sample) VALUES
  (2, 1, E'5\n3 1 9 7 2',   '9',    true),
  (2, 2, E'1\n42',          '42',   false),   -- single element
  (2, 3, E'4\n-8 -3 -9 -1', '-1',   false),   -- all negative
  (2, 4, E'3\n5 5 5',       '5',    false);    -- all equal

-- =============================================================================
-- Problem 3 — Reverse a String (Easy)
-- =============================================================================
INSERT INTO problems (slug, title, difficulty, description) VALUES (
  'reverse-a-string',
  'Reverse a String',
  'Easy',
$$Read a single word and print it reversed.

### Input
A single line containing a string `s` of lowercase letters (1 <= |s| <= 1000).

### Output
Print `s` reversed.

### Example
```
Input:  hello
Output: olleh
```$$
);

INSERT INTO test_cases (problem_id, ordinal, input, expected_output, is_sample) VALUES
  (3, 1, 'hello', 'olleh', true),
  (3, 2, 'a',     'a',     false),   -- single character
  (3, 3, 'abcba', 'abcba', false);   -- palindrome

-- =============================================================================
-- Problem 4 — FizzBuzz (Easy)
-- =============================================================================
INSERT INTO problems (slug, title, difficulty, description) VALUES (
  'fizzbuzz',
  'FizzBuzz',
  'Easy',
$$Print the numbers from 1 to `n`, one per line, with two exceptions:
print `Fizz` for multiples of 3, `Buzz` for multiples of 5, and `FizzBuzz` for
multiples of both.

### Input
A single integer `n` (1 <= n <= 100).

### Output
`n` lines, each either the number, `Fizz`, `Buzz`, or `FizzBuzz`.

### Example
```
Input:  5
Output:
1
2
Fizz
4
Buzz
```$$
);

INSERT INTO test_cases (problem_id, ordinal, input, expected_output, is_sample) VALUES
  (4, 1, '5',  E'1\n2\nFizz\n4\nBuzz', true),
  (4, 2, '1',  '1', false),                                    -- smallest input
  (4, 3, '3',  E'1\n2\nFizz', false),
  (4, 4, '15', E'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', false); -- first FizzBuzz

-- =============================================================================
-- Problem 5 — Two Sum (Medium)
-- =============================================================================
INSERT INTO problems (slug, title, difficulty, description) VALUES (
  'two-sum',
  'Two Sum',
  'Medium',
$$Given an array of integers and a target, find the **0-based indices** of the two
numbers that add up to the target. Exactly one solution exists, and you may not
use the same element twice.

### Input
The first line contains two integers `n` and `target` (2 <= n <= 10^5).
The second line contains `n` space-separated integers.

### Output
Two 0-based indices `i j` (with `i < j`) of the numbers that sum to `target`.

### Example
```
Input:
4 9
2 7 11 15
Output: 0 1
```
(because 2 + 7 = 9)$$
);

INSERT INTO test_cases (problem_id, ordinal, input, expected_output, is_sample) VALUES
  (5, 1, E'4 9\n2 7 11 15',  '0 1', true),
  (5, 2, E'3 6\n3 2 4',      '1 2', false),
  (5, 3, E'2 6\n3 3',        '0 1', false),   -- duplicate values
  (5, 4, E'5 10\n1 5 3 7 9', '2 3', false);

-- =============================================================================
-- Problem 6 — Longest Increasing Subsequence (Hard)
-- =============================================================================
INSERT INTO problems (slug, title, difficulty, description) VALUES (
  'longest-increasing-subsequence',
  'Longest Increasing Subsequence',
  'Hard',
$$Given an array, print the length of its longest **strictly increasing**
subsequence (the elements need not be contiguous).

### Input
The first line contains an integer `n` (1 <= n <= 10^5).
The second line contains `n` space-separated integers.

### Output
A single integer: the length of the longest strictly increasing subsequence.

### Example
```
Input:
6
10 9 2 5 3 7
Output: 3
```
(one such subsequence is 2, 3, 7)$$
);

INSERT INTO test_cases (problem_id, ordinal, input, expected_output, is_sample) VALUES
  (6, 1, E'6\n10 9 2 5 3 7',          '3', true),
  (6, 2, E'8\n10 9 2 5 3 7 101 18',   '4', false),
  (6, 3, E'1\n5',                     '1', false),   -- single element
  (6, 4, E'4\n7 7 7 7',               '1', false),   -- all equal (strict)
  (6, 5, E'5\n1 2 3 4 5',             '5', false);    -- already increasing
