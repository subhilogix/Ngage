/**
 * Safely converts an array of headers and data rows into a standard CSV string.
 * It automatically handles quotes, commas, and newlines in values to remain fully RFC-4180 compliant.
 */
export function generateCSV(headers: string[], rows: any[][]): string {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val).trim();
    // Escape quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    // Wrap in quotes if it contains commas, quotes, or newlines
    if (
      escaped.includes(",") ||
      escaped.includes('"') ||
      escaped.includes("\n") ||
      escaped.includes("\r")
    ) {
      return `"${escaped}"`;
    }
    return escaped;
  };

  const headerLine = headers.map(sanitize).join(",");
  const dataLines = rows.map((row) => row.map(sanitize).join(","));
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
