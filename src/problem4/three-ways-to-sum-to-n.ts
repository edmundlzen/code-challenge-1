function sum_to_n_a(n: number): number {
  // Arithmetic formula: sum = n * (n + 1) / 2
  // Time Complexity: O(1) - constant time, single calculation regardless of n
  // Space Complexity: O(1) - no additional space needed
  // Most efficient approach - always preferred for large n
  return (n * (n + 1)) / 2;
}

function sum_to_n_b(n: number): number {
  // Looping from 1 to n
  // Time Complexity: O(n) - linear time, iterates n times
  // Space Complexity: O(1) - only stores sum variable
  // More intuitive but slower for large n
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

function sum_to_n_c(n: number): number {
  // Recursion
  // Time Complexity: O(n) - makes n recursive calls
  // Space Complexity: O(n) - uses call stack with n frames
  // Least efficient, risk of stack overflow for large n
  if (n <= 0) return 0;
  return n + sum_to_n_c(n - 1);
}
