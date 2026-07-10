function escapeCell(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return lines.join("\n");
}

// Parses one CSV line into cells, honoring double-quoted fields (with ""
// as an escaped quote) — the inverse of escapeCell above.
function parseLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

// Parses a raw CSV string (header row + data rows) into an array of
// objects keyed by the (trimmed) header names. Blank lines are skipped.
export function parseCsv(text) {
  const lines = String(text ?? "")
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}
