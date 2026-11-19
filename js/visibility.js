export function matches(expr, state) {
  return expr.split('&').every((clause) => {
    const neg = clause.includes('!=');
    const [k, v] = clause.split(neg ? '!=' : '=');
    const ok = v.split('|').includes(String(state[k]));
    return neg ? !ok : ok;
  });
}
