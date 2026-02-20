export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

export function strSim(a: string, b: string): number {
  if (!a || !b) return 0;
  const al = a.toLowerCase().trim(), bl = b.toLowerCase().trim();
  if (al === bl) return 100;
  const mx = Math.max(al.length, bl.length);
  return mx === 0 ? 100 : Math.round((1 - levenshtein(al, bl) / mx) * 100);
}

export function phoneNorm(p: string): string {
  return p.replace(/[\s\-\(\)\+]/g, '').replace(/^233/, '0').replace(/^0+/, '0');
}

export function normDrug(n: string): string {
  return n.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}
