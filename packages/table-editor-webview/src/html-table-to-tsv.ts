export function htmlTableToTsv(table: HTMLTableElement) {
  const tbody = table.children[0];
  const trs = tbody.children;
  const rows: string[][] = [];
  for (let i = 0; i < trs.length; i++) {
    const newRow = [];
    const tr = trs[i];
    const tds = tr.children;
    for (let j = 0; j < tds.length; j++) {
      newRow.push(tds[j].textContent || '');
    }
    rows.push(newRow);
  }
  return rows.map(row => row.join('\t')).join('\n');
}