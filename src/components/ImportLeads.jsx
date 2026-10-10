import { useState, useRef } from "react";
import { useAuth } from "../context/auth-state";
import { flexibleRows, saveFileRows } from "../lib/flexibleImports";
import { sourceName } from "../lib/personalWorkspace";
import { createSection } from "../lib/sections";

export default function ImportLeads({
  sources,
  pageNames,
  defaultSource,
  onImported,
  onBusyChange,
}) {
  const { access } = useAuth();
  const admin = access?.is_admin === true;
  const [source, setSource] = useState(
    defaultSource || (admin ? "" : access?.personal_source) || "",
  );
  const [book, setBook] = useState(null);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState("existing");
  const [sectionName, setSectionName] = useState("");
  const [createdSource, setCreatedSource] = useState(null);
  const createdSection = useRef(null);
  // The ref locks immediately; React state updates alone cannot stop two rapid clicks.
  const pending = useRef(false);
  const options = [
    ...new Set([
      ...sources,
      ...(access?.sources || []),
      ...(createdSource ? [createdSource] : []),
    ]),
  ];
  function selectSheet(workbook, name, XLSX) {
    const data = flexibleRows(
      XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      }),
    );
    if (data.length > 1000) throw new Error("Upload up to 1,000 rows at a time.");
    setSheet(name);
    setRows(data);
    setSummary("");
    setError("");
  }
  async function read(file) {
    setError("");
    setRows([]);
    setBook(null);
    if (!file) return;
    setFileName(file.name);
    setSectionName(
      (previous) => previous || file.name.replace(/\.(xlsx?|csv)$/i, "").slice(0, 200),
    );
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a file smaller than 5 MB.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      if (!workbook.SheetNames.length) throw new Error("No worksheets found.");
      setBook(workbook);
      selectSheet(workbook, workbook.SheetNames[0], XLSX);
    } catch (issue) {
      setError(issue.message);
    }
  }
  async function upload() {
    if (pending.current) return;
    setError("");
    setSummary("");
    if (!rows.length) return;
    if (destination === "new" && !sectionName.trim()) {
      setError("Enter a name for the new section.");
      return;
    }
    if (destination === "existing" && !source.trim()) {
      setError("Enter a landing page name.");
      return;
    }
    if (destination === "existing" && !admin && !options.includes(source.trim())) {
      setError("Choose a page shared with you.");
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    try {
      let selectedSource = source;
      if (destination === "new") {
        const name = sectionName.trim();
        if (createdSection.current?.name !== name) {
          createdSection.current = { name, source: await createSection(name) };
        }
        selectedSource = createdSection.current.source;
        setCreatedSource(selectedSource);
      }
      await saveFileRows(rows, selectedSource, fileName.trim() || "Untitled import");
      setSummary(
        rows.length +
          " rows uploaded into " +
          (destination === "new"
            ? sectionName.trim()
            : sourceName(selectedSource, pageNames, access?.personal_source)) +
          ".",
      );
      setRows([]);
      setSource(selectedSource);
      setDestination("existing");
      await onImported(selectedSource);
    } catch (issue) {
      setError(issue.message);
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Upload any Excel or CSV table. No name, phone or fixed headings are required. All
        nonblank rows and columns are preserved in this page, including the first row. You
        can edit them after uploading.
      </p>
      <label className="field">
        Import destination
        <select
          className="input"
          value={destination}
          disabled={busy}
          onChange={(event) => setDestination(event.target.value)}
        >
          <option value="existing">Existing section</option>
          <option value="new">New named section</option>
        </select>
      </label>
      {destination === "new" ? (
        <label className="field">
          New section name
          <input
            className="input"
            value={sectionName}
            maxLength={200}
            disabled={busy}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder="e.g. October marketing leads"
          />
        </label>
      ) : (
        <>
          <label className="block text-sm">
            Section
            {admin ? (
              <input
                className="input mt-2"
                list="import-pages"
                value={source}
                maxLength={200}
                disabled={busy}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Choose or enter a page name"
              />
            ) : (
              <select
                className="input mt-2"
                value={source}
                disabled={busy}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Choose a page</option>
                {options.map((x) => (
                  <option key={x} value={x}>
                    {sourceName(x, pageNames, access?.personal_source)}
                  </option>
                ))}
              </select>
            )}
            <datalist id="import-pages">
              {options.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
        </>
      )}
      <label className="block text-sm">
        Excel or CSV file
        <input
          className="input mt-2"
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={busy}
          onChange={(e) => read(e.target.files[0])}
        />
      </label>
      {fileName && (
        <label className="field">
          Import name
          <input
            className="input"
            value={fileName}
            maxLength={200}
            disabled={busy}
            onChange={(event) => setFileName(event.target.value)}
            placeholder="Name for this uploaded file"
          />
        </label>
      )}
      {book && (
        <label className="block text-sm">
          Worksheet
          <select
            className="input mt-2"
            value={sheet}
            disabled={busy}
            onChange={async (e) => {
              try {
                selectSheet(book, e.target.value, await import("xlsx"));
              } catch (issue) {
                setError(issue.message);
              }
            }}
          >
            {book.SheetNames.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      )}
      {!!rows.length && (
        <>
          <p>
            {rows.length} rows · {Object.keys(rows[0]).length} columns. All fields will be
            saved.
          </p>
          <button
            className="btn-primary"
            disabled={
              busy || (destination === "new" ? !sectionName.trim() : !source.trim())
            }
            onClick={upload}
          >
            {busy ? "Uploading…" : "Upload " + rows.length + " rows into this page"}
          </button>
        </>
      )}
      {summary && (
        <p role="status" className="text-sm text-emerald-700">
          {summary}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
