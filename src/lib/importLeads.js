import { validateLead } from "./validation.js";
const norm = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function prepareLeadImport(rows, mapping, source) {
  if (!source?.trim()) throw new Error("Choose a landing page before importing.");
  const valid = [];
  const invalid = [];
  rows.forEach((row, index) => {
    const get = (field) => String(row[mapping[field]] ?? "").trim();
    const phone = get("phone").replace(/[\s()-]/g, "");
    const supplied = get("status").toLowerCase();
    const status =
      { followup: "follow-up", "follow up": "follow-up" }[supplied] || supplied || "new";
    const values = {
      name: get("name"),
      phone,
      email: get("email"),
      status,
      source: source.trim(),
      answers: {},
    };
    Object.entries(row).forEach(([key, value]) => {
      if (
        !Object.values(mapping).includes(key) &&
        ![
          "source",
          "land ingpage",
          "landingpage",
          "leadsource",
          "pagename",
          "id",
          "createdat",
        ].includes(norm(key)) &&
        value !== "" &&
        value != null
      )
        values.answers[key] = value;
    });
    const issue = validateLead(values);
    if (issue) invalid.push({ row: index + 2, error: issue });
    else valid.push(values);
  });
  return { valid, invalid };
}
export function guessImportMapping(headers, rows = []) {
  const aliases = {
    name: [
      "name",
      "fullname",
      "leadname",
      "contactname",
      "personname",
      "nameofperson",
      "nameofcustomer",
      "customername",
      "clientname",
      "yourname",
      "firstname",
      "studentname",
    ],
    phone: [
      "phone",
      "phonenumber",
      "mobile",
      "mobilenumber",
      "contactnumber",
      "contactno",
      "contact",
      "number",
      "phone1",
      "mobile1",
      "whatsappno",
      "phoneno",
      "whatsapp",
      "whatsappnumber",
      "telephone",
      "tel",
      "cellphone",
      "mobilephone",
      "yourphonenumber",
    ],
    email: ["email", "emailaddress", "youremail", "workemail"],
    status: ["status", "leadstatus"],
  };
  const clean = (header) => norm(String(header).replace(/^[a-z]:/i, ""));
  const mapping = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.find((h) => names.includes(clean(h))) || "",
    ]),
  );
  // Only infer contact fields from values when one column is unambiguous.
  for (const field of ["email", "phone"]) {
    if (mapping[field]) continue;
    const candidates = headers.filter((header) => {
      if (
        Object.values(mapping).includes(header) ||
        /id|score|budget|date|time|amount|price|revenue/i.test(header)
      )
        return false;
      const values = rows
        .slice(0, 30)
        .map((row) => String(row[header] ?? "").trim())
        .filter(Boolean);
      if (values.length < 2) return false;
      const matches = values.filter((value) =>
        field === "email"
          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          : /^\+?\d{7,15}$/.test(value.replace(/[\s()-]/g, "")),
      ).length;
      return matches / values.length >= 0.9;
    });
    if (candidates.length === 1) mapping[field] = candidates[0];
  }
  if (!mapping.name && mapping.phone) {
    const candidates = headers.filter((header) => {
      if (
        Object.values(mapping).includes(header) ||
        /id|city|country|address|company|business|source|status|course|category|question|budget/i.test(
          header,
        )
      )
        return false;
      const values = rows
        .slice(0, 30)
        .map((row) => String(row[header] ?? "").trim())
        .filter(Boolean);
      return (
        values.length >= 2 &&
        values.filter((value) => /^[\p{L}][\p{L}\p{M} .’'-]{1,79}$/u.test(value)).length /
          values.length >=
          0.9
      );
    });
    if (candidates.length === 1) mapping.name = candidates[0];
  }
  return mapping;
}

export function parseImportGrid(grid) {
  const nonempty = grid
    .map((cells, index) => ({ cells, index }))
    .filter(({ cells }) => cells.some((value) => String(value ?? "").trim()));
  if (!nonempty.length) return { rows: [], mapping: {} };
  function uniqueHeaders(cells, width) {
    const used = new Set();
    return Array.from({ length: width }, (_, i) => {
      let label = String(cells[i] ?? "").trim() || "Column " + (i + 1);
      const original = label;
      let suffix = 2;
      while (used.has(label)) label = original + " (" + suffix++ + ")";
      used.add(label);
      return label;
    });
  }
  const width = Math.max(...nonempty.map(({ cells }) => cells.length));
  // Find real headings below any introductory title rows.
  const headerIndex = nonempty.slice(0, 30).findIndex(({ cells }) => {
    const m = guessImportMapping(cells.map(String));
    return Boolean(m.name && (m.phone || m.email));
  });
  let start;
  let headers;
  if (headerIndex >= 0) {
    headers = uniqueHeaders(nonempty[headerIndex].cells, width);
    start = headerIndex + 1;
  } else {
    // If first row contains contact values, it is data, not headings.
    const first = nonempty[0].cells;
    const contact = (value) =>
      /^\+?\d{7,15}$/.test(String(value ?? "").replace(/[\s()-]/g, "")) ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? ""));
    const dataIndex = nonempty.findIndex(({ cells }) => cells.some(contact));
    if (
      dataIndex >= 0 &&
      (dataIndex === 0 || nonempty[0].cells.filter(Boolean).length === 1)
    ) {
      headers = uniqueHeaders([], width);
      start = dataIndex;
    } else {
      headers = uniqueHeaders(first, width);
      start = 1;
    }
  }
  const rows = nonempty
    .slice(start)
    .map(({ cells }) =>
      Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""])),
    );
  return { rows, mapping: guessImportMapping(headers, rows) };
}
