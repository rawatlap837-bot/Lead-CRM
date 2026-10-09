export function flexibleRows(grid) {
  const rows = grid.filter((row) => row.some((value) => String(value ?? "").trim()));
  if (!rows.length) return [];
  // Preserve every nonblank row, including the first. No structure is required.
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) =>
    Object.fromEntries(
      Array.from({ length: width }, (_, i) => ["Column " + (i + 1), row[i] ?? ""]),
    ),
  );
}
