import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareLeadImport, guessImportMapping } from "../src/lib/importLeads.js";
test("import accepts missing optional fields and forces selected page", () => {
  const rows = [
    {
      "Full Name": "Alice",
      "Mobile Number": "0012345",
      Source: "Other page",
      Budget: "100",
    },
  ];
  const mapping = guessImportMapping(Object.keys(rows[0]));
  const result = prepareLeadImport(rows, mapping, "LMS");
  assert.equal(result.invalid.length, 0);
  assert.deepEqual(result.valid[0], {
    name: "Alice",
    phone: "0012345",
    email: "",
    status: "new",
    source: "LMS",
    answers: { Budget: "100" },
  });
});
test("invalid contact rows are excluded and source is required", () => {
  const result = prepareLeadImport(
    [
      { name: "", phone: "123" },
      { name: "Bob", phone: "abc" },
    ],
    { name: "name", phone: "phone" },
    "LMS",
  );
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 2);
  assert.throws(
    () => prepareLeadImport([], { name: "name", phone: "phone" }, ""),
    /Choose a landing page/,
  );
});

test("automatically recognizes Meta and contact header variants", () => {
  const fields = guessImportMapping([
    "full_name",
    "p:phone_number",
    "e:email",
    "lead_status",
  ]);
  assert.deepEqual(fields, {
    name: "full_name",
    phone: "p:phone_number",
    email: "e:email",
    status: "lead_status",
  });
});
test("unambiguous values identify contact columns without guessing IDs", () => {
  const rows = [
    { Name: "Alice", Reach: "9876543210", Address: "a@example.com", id: "1234567890" },
    { Name: "Bob", Reach: "9876543211", Address: "b@example.com", id: "1234567891" },
  ];
  const fields = guessImportMapping(Object.keys(rows[0]), rows);
  assert.equal(fields.phone, "Reach");
  assert.equal(fields.email, "Address");
});

test("title and blank rows do not hide real headers", async () => {
  const { parseImportGrid } = await import("../src/lib/importLeads.js");
  const parsed = parseImportGrid([
    ["Digital Marketing Leads"],
    [],
    ["Customer Name", "Contact No", "City"],
    ["Alice", "9876543210", "Delhi"],
  ]);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.mapping.name, "Customer Name");
  assert.equal(parsed.mapping.phone, "Contact No");
});
test("headerless files preserve first lead and infer contact fields", async () => {
  const { parseImportGrid } = await import("../src/lib/importLeads.js");
  const parsed = parseImportGrid([
    ["Alice", "9876543210", "a@example.com"],
    ["Bob", "9876543211", "b@example.com"],
  ]);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.mapping.name, "Column 1");
  assert.equal(parsed.mapping.phone, "Column 2");
  assert.equal(parsed.mapping.email, "Column 3");
});
test("ambiguous text fields are not guessed as names", () => {
  const mapping = guessImportMapping(
    ["Column 1", "Column 2", "Column 3"],
    [
      { "Column 1": "Alice", "Column 2": "Delhi", "Column 3": "9876543210" },
      { "Column 1": "Bob", "Column 2": "Mumbai", "Column 3": "9876543211" },
    ],
  );
  assert.equal(mapping.name, "");
});
