import UpdateIndicator from "../components/UpdateIndicator";
import { sourceName } from "../lib/personalWorkspace";
import PageName from "../components/PageName";
import { fetchPageNames } from "../lib/pageNames";
import { useAuth } from "../context/auth-state";
import PageSharing from "../components/PageSharing";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, RefreshCw, TableProperties } from "lucide-react";
import { useToast } from "../context/toast-state";
import { receiverUrl, checkReceiver } from "../lib/integrations";
import { supabase, supabaseAnonKey } from "../lib/supabase";
import { fetchLeadSourceStats } from "../lib/leads";
import useLoad from "../lib/useLoad";
import PageHeader from "../components/PageHeader";
import sheetSyncCode from "../../google-sheets-sync.gs?raw";
import LoadError from "../components/LoadError";

export default function Integrations() {
  const toast = useToast();
  const { data: pageNames, reload: reloadNames } = useLoad(fetchPageNames, []);
  const { access } = useAuth();
  const isAdmin = access?.is_admin === true;
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");
  const pending = useRef(false);
  const [pageName, setPageName] = useState("");
  const [sheetLink, setSheetLink] = useState("");
  const [tabName, setTabName] = useState("Leads");
  const [preparedCode, setPreparedCode] = useState("");
  const [sheetToken, setSheetToken] = useState("");
  const [connectingSheet, setConnectingSheet] = useState(false);
  const [sheetConnectionError, setSheetConnectionError] = useState("");
  const [receiverStatus, setReceiverStatus] = useState("");
  function prepareConnection(event) {
    event.preventDefault();
    const match = sheetLink
      .trim()
      .match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      toast("Paste the Google Sheet link from your browser address bar.");
      return;
    }
    if (!tabName.trim()) {
      toast("Enter the Sheet tab name.");
      return;
    }
    if (!receiverUrl() || !supabaseAnonKey || !sheetToken) {
      toast("Create a secure Sheet connection first.");
      return;
    }
    const settings = {
      CRM_SHEET_ENDPOINT: receiverUrl() + "/sheet",
      CRM_SHEET_ANON_KEY: supabaseAnonKey,
      CRM_SHEET_TOKEN: sheetToken,
      CRM_SOURCE_SHEET_ID: match[1],
      CRM_SOURCE_SHEET_NAME: tabName.trim(),
      CRM_LEAD_SOURCE: pageName.trim() || "My leads",
    };
    setPreparedCode(
      `${sheetSyncCode}\n\nfunction setupMyCrmSheet() {\n  PropertiesService.getScriptProperties().setProperties(${JSON.stringify(settings, null, 2)});\n  installCrmSheetSync();\n}\n`,
    );
    toast("Your connector is ready. Follow the three steps below.", "success");
  }
  async function createSheetConnection() {
    if (connectingSheet) return;
    if (
      sheetToken &&
      !window.confirm(
        "Create a new token? Existing Google Sheets using this token will stop syncing until updated.",
      )
    )
      return;
    setConnectingSheet(true);
    setSheetConnectionError("");
    try {
      if (!supabase)
        throw new Error(
          "CRM is not connected to Supabase. Check the app configuration and reload.",
        );
      const { data, error } = await supabase.rpc("crm_rotate_sheet_connection");
      if (error) {
        if (["42883", "PGRST202"].includes(error.code))
          throw new Error(
            "Run supabase/google-sheets-connections.sql in Supabase first.",
          );
        throw error;
      }
      setSheetToken(data);
      setPreparedCode("");
      toast("Secure Sheet connection created. Keep it private.", "success");
    } catch (error) {
      const message = error.message || "Could not create the Sheet connection.";
      setSheetConnectionError(message);
      toast(message);
    } finally {
      setConnectingSheet(false);
    }
  }
  const {
    data: sourceStatsData,
    loading: sourcesLoading,
    error: sourcesError,
    reload: reloadSources,
  } = useLoad(() => fetchLeadSourceStats(), []);
  const sourceStats = sourceStatsData || {};
  const visibleSources = new Set([
    ...Object.keys(sourceStats),
    ...(access?.sources || []),
  ]);
  const landingPages = [...visibleSources]
    .map((source) => [source, sourceStats[source] || { total: 0, new: 0, converted: 0 }])
    .filter(([source]) => source !== "__unassigned__")
    .sort(([a], [b]) => a.localeCompare(b));

  async function copy(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied.`, "success");
    } catch {
      toast(`Clipboard unavailable. Select and copy the ${label.toLowerCase()} below.`);
    }
  }
  async function check() {
    if (pending.current) return;
    pending.current = true;
    setChecking(true);
    setStatus("");
    try {
      await checkReceiver();
      setStatus("ready");
    } catch (error) {
      setStatus(error.message);
    } finally {
      pending.current = false;
      setChecking(false);
    }
  }
  async function checkSheetSetup() {
    setReceiverStatus("checking");
    try {
      await checkReceiver();
      setReceiverStatus("ready");
    } catch (error) {
      setReceiverStatus(error.message || "Receiver check failed.");
    }
  }
  return (
    <>
      <PageHeader
        title={isAdmin ? "Admin panel" : "My landing pages"}
        description={
          isAdmin
            ? "Manage all landing pages, lead connections and team access."
            : "Add your own leads, import spreadsheets, and manage pages shared with you."
        }
      />
      {isAdmin && (
        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
          <strong>Your landing pages can stay as they are.</strong> If their forms already
          save name, phone, email and answers in Google Sheets, add this connector to the
          Sheet?s existing Apps Script. Do it once per spreadsheet; the CRM receives each
          saved lead automatically.
        </div>
      )}
      <details className="card mb-6 p-4 sm:p-6">
        <summary className="cursor-pointer text-base font-semibold text-slate-900">
          Step-by-step Google Sheets setup (no coding needed)
        </summary>
        <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
          <p>
            You only need your Google Sheet and access to this CRM. You do not need
            Supabase keys. If <strong>Check setup</strong> reports that the receiver is
            unavailable, ask your CRM administrator to finish the one-time server setup.
          </p>
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Click <strong>Create secure connection</strong> once. This makes a private
              connection for your CRM account. Keep the generated code private.
            </li>
            <li>
              Paste your Google Sheet link. Enter the exact tab name shown at the bottom
              of the Sheet, then enter a page name such as{" "}
              <strong>Digital Marketing Lead</strong>. Click{" "}
              <strong>Prepare connection</strong>.
            </li>
            <li>
              Click <strong>Copy connector code</strong>. In your Sheet, open{" "}
              <strong>Extensions → Apps Script</strong>. Add a new script file with the
              plus button, name it <strong>CRM Sync</strong>, and paste the copied code
              there. Save it. Keep any existing form or landing-page script files; do not
              replace them.
            </li>
            <li>
              In Apps Script, choose <code>setupMyCrmSheet</code> from the function list
              and click <strong>Run</strong>. Follow Google’s permission prompts. This
              installs automatic syncing and runs the first sync.
            </li>
            <li>
              Return to the Sheet. A <strong>CRM delivery</strong> column shows which rows
              arrived. New rows sync about once a minute. To sync now, reload the Sheet
              and choose <strong>CRM sync → Sync now</strong>.
            </li>
          </ol>
          <div className="rounded-lg bg-slate-50 p-3">
            <strong className="text-slate-800">Your Sheet needs:</strong> one header row
            and one lead per row. Name and phone are required; email and other columns are
            optional. Phone numbers should include the country code. Already delivered
            rows are not sent again.
          </div>
          <div>
            <strong className="text-slate-800">If something goes wrong:</strong>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <strong>Skipped - missing name or phone:</strong> check the header row
                uses Name and Phone, Mobile, or Phone number.
              </li>
              <li>
                <strong>CRM project key is invalid:</strong> create a fresh secure
                connection once, prepare and copy the code again, replace only the
                contents of the <strong>CRM Sync</strong> file, save, then run
                <code>setupMyCrmSheet</code> again.
              </li>
              <li>
                <strong>Receiver is not deployed:</strong> your CRM administrator needs to
                complete the server setup. You do not need to change your Sheet.
              </li>
            </ul>
          </div>
        </div>
      </details>
      <section className="card mb-6 p-4 sm:p-6">
        <h2 className="section-heading">Connect a Google Sheet</h2>
        <p className="mt-2 text-sm text-slate-500">
          Connect your own Sheet to your private CRM workspace. You do not need Supabase
          keys or a shared secret.
        </p>
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={createSheetConnection}
          disabled={connectingSheet}
        >
          {connectingSheet
            ? "Creating secure connectionâ€¦"
            : sheetToken
              ? "Create a new connection token"
              : "Create secure connection"}
        </button>
        <button
          type="button"
          className="ml-2 min-h-11 px-3 text-sm font-semibold text-indigo-700 underline"
          onClick={checkSheetSetup}
          disabled={receiverStatus === "checking"}
        >
          {receiverStatus === "checking" ? "Checking setup…" : "Check setup"}
        </button>
        {receiverStatus && receiverStatus !== "checking" && (
          <div
            role="status"
            className={`mt-3 rounded-lg p-3 text-sm ${receiverStatus === "ready" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
          >
            <p>
              {receiverStatus === "ready"
                ? "Supabase receiver is reachable. The connection migration must also be installed."
                : receiverStatus}
            </p>
            {receiverStatus.includes("not deployed") && (
              <p className="mt-2">
                Deploy the <code>lead-ingest</code> Edge Function from this project to
                Supabase, then check setup again. Follow{" "}
                <code>LEAD_CONNECTION_SETUP.md</code>.
              </p>
            )}
          </div>
        )}
        {sheetConnectionError && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {sheetConnectionError}
          </p>
        )}
        {sheetToken && (
          <>
            <form onSubmit={prepareConnection} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Google Sheet link
                <input
                  className="input mt-2"
                  required
                  type="url"
                  value={sheetLink}
                  onChange={(event) => {
                    setSheetLink(event.target.value);
                    setPreparedCode("");
                  }}
                  placeholder="Paste your Google Sheet link"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Sheet tab name
                <input
                  className="input mt-2"
                  required
                  value={tabName}
                  onChange={(event) => {
                    setTabName(event.target.value);
                    setPreparedCode("");
                  }}
                  placeholder="Leads"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                CRM page name
                <input
                  className="input mt-2"
                  value={pageName}
                  onChange={(event) => {
                    setPageName(event.target.value);
                    setPreparedCode("");
                  }}
                  placeholder="My leads"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  This names the group of leads in your workspace.
                </span>
              </label>
              <div className="flex items-center">
                <button type="submit" className="btn-primary">
                  Prepare connection
                </button>
              </div>
            </form>
            {preparedCode && (
              <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <h3 className="font-semibold text-indigo-950">Finish in Google Sheets</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
                  <li>
                    Open the Sheet and choose <strong>Extensions â†’ Apps Script</strong>.
                  </li>
                  <li>
                    Add a new script file named <strong>CRM Sync</strong>, paste the
                    copied code into it, and save. Keep your existing scripts.
                  </li>
                  <li>
                    Select <code>setupMyCrmSheet</code>, click <strong>Run</strong>, and
                    approve Googleâ€™s access. New rows sync every minute.
                  </li>
                </ol>
                <p className="mt-3 text-sm text-slate-600">
                  The generated code contains a private connection token for your account.
                  Keep it private. If exposed, create a new token here and update the
                  Sheet script.
                </p>
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() => copy(preparedCode, "Google Sheets connector")}
                >
                  {" "}
                  <Copy size={16} /> Copy connector code
                </button>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                    View connector code
                  </summary>
                  <textarea
                    aria-label="Google Sheets connector code"
                    className="input mt-3 h-72 font-mono text-xs"
                    readOnly
                    value={preparedCode}
                  />
                </details>
              </div>
            )}
          </>
        )}
      </section>
      <section className="card mb-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-heading">Your landing pages</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your connected Sheet data appears in your private workspace.
            </p>
          </div>
          <Link className="btn-secondary" to="/leads">
            View all leads
          </Link>
        </div>
        {sourcesLoading ? (
          <p className="mt-5 text-sm text-slate-500">Loading pages…</p>
        ) : sourcesError ? (
          <LoadError error={sourcesError} reload={reloadSources} />
        ) : landingPages.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {landingPages.map(([source, stats]) => (
              <article
                key={source}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold text-slate-900">
                    {sourceName(source, pageNames, access?.personal_source)}
                    <UpdateIndicator source={source} section="integrations" />
                  </h3>
                  {(isAdmin || access?.sources?.includes(source)) && (
                    <PageName
                      source={source}
                      name={sourceName(source, pageNames, access?.personal_source)}
                      onSaved={reloadSources}
                    />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Total", stats.total],
                    ["New", stats.new],
                    ["Converted", stats.converted],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg bg-slate-50 px-2 py-2">
                      <div className="text-lg font-bold text-slate-900">{count}</div>
                      <div className="text-xs text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
                <Link
                  className="mt-3 inline-flex text-sm font-semibold text-indigo-600"
                  to={`/leads?source=${encodeURIComponent(source)}`}
                >
                  Open leads ?
                </Link>
                {isAdmin && <PageSharing source={source} />}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-600">
            No leads yet. Connect a Sheet or import a file from Leads.
          </p>
        )}
      </section>
      <section className="card mt-6 p-4 sm:p-6">
        <h2 className="section-heading">What arrives in the CRM</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Each lead needs name and phone columns. Email and question answers are included
          when available. The Source column groups leads by landing page. Failed
          deliveries are retried automatically.
        </p>
      </section>
    </>
  );
}
