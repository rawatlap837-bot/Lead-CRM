import { useAuth } from '../context/auth-state';
import PageSharing from '../components/PageSharing';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, RefreshCw, TableProperties } from 'lucide-react';
import { useToast } from '../context/toast-state';
import { receiverUrl, checkReceiver } from '../lib/integrations';
import { fetchLeadSourceStats } from '../lib/leads';
import useLoad from '../lib/useLoad';
import PageHeader from '../components/PageHeader';
import sheetSyncCode from '../../google-sheets-sync.gs?raw';

export default function Integrations() {
  const toast = useToast();
  const { access } = useAuth();
  const isAdmin = access?.is_admin === true;
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');
  const pending = useRef(false);
  const [pageName, setPageName] = useState('');
  const [sheetLink, setSheetLink] = useState('');
  const [tabName, setTabName] = useState('Leads');
  const [preparedCode, setPreparedCode] = useState('');
  function prepareConnection(event) {
    event.preventDefault();
    const match = sheetLink.trim().match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) { toast('Paste the Google Sheet link from your browser address bar.'); return; }
    if (!pageName.trim() || !tabName.trim()) { toast('Enter a page name and the Sheet tab name.'); return; }
    const settings = {
      CRM_SOURCE_SHEET_ID: match[1],
      CRM_SOURCE_SHEET_NAME: tabName.trim(),
      CRM_LEAD_SOURCE: pageName.trim(),
      CRM_LEAD_RECEIVER_URL: receiverUrl(),
    };
    if (!settings.CRM_LEAD_RECEIVER_URL) { toast('Configure Supabase first.'); return; }
    setPreparedCode(sheetSyncCode + '\n\nfunction setupThisLandingPage() {\n  PropertiesService.getScriptProperties().setProperties(' + JSON.stringify(settings, null, 2) + ');\n  installCrmSheetSync();\n}\n');
    toast('Your connector is ready. Follow the three steps below.', 'success');
  }
  const { data: sourceStatsData, loading: sourcesLoading } = useLoad(() => fetchLeadSourceStats(), []);
  const sourceStats = sourceStatsData || {};
  const landingPages = Object.entries(sourceStats)
    .filter(([source]) => source !== '__unassigned__')
    .sort(([a], [b]) => a.localeCompare(b));

  async function copy(value, label) {
    try { await navigator.clipboard.writeText(value); toast(`${label} copied.`, 'success'); }
    catch { toast(`Clipboard unavailable. Select and copy the ${label.toLowerCase()} below.`); }
  }
  async function check() {
    if (pending.current) return;
    pending.current = true; setChecking(true); setStatus('');
    try { await checkReceiver(); setStatus('ready'); }
    catch (error) { setStatus(error.message); }
    finally { pending.current = false; setChecking(false); }
  }
  return <>
    <PageHeader title={isAdmin ? "Admin panel" : "My landing pages"} description={isAdmin ? "Manage all landing pages, lead connections and team access." : "Manage leads for the landing pages shared with you."}/>
    {isAdmin && <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
      <strong>Your landing pages can stay as they are.</strong> If their forms already save name, phone, email and answers in Google Sheets, add this connector to the Sheet?s existing Apps Script. Do it once per spreadsheet; the CRM receives each saved lead automatically.
    </div>}
    {isAdmin && <section className="card mb-6 p-4 sm:p-6">
      <h2 className="section-heading">Add a landing page</h2>
      <p className="mt-2 text-sm text-slate-500">Use the Google Sheet where this page already saves its leads. We will fill in the connector settings for you.</p>
      <form onSubmit={prepareConnection} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Landing page name
          <input className="input mt-2" required maxLength={200} value={pageName} onChange={(event) => { setPageName(event.target.value); setPreparedCode(''); }} placeholder="For example: Coaching website" />
        </label>
        <label className="text-sm font-medium text-slate-700">Google Sheet link
          <input className="input mt-2" required type="url" value={sheetLink} onChange={(event) => { setSheetLink(event.target.value); setPreparedCode(''); }} placeholder="Paste your Google Sheet link" />
        </label>
        <label className="text-sm font-medium text-slate-700">Sheet tab name
          <input className="input mt-2" required value={tabName} onChange={(event) => { setTabName(event.target.value); setPreparedCode(''); }} placeholder="Leads" />
          <span className="mt-1 block text-xs font-normal text-slate-500">The name at the bottom of the Sheet, not the spreadsheet title.</span>
        </label>
        <div className="flex items-center"><button type="submit" className="btn-primary">Prepare my connection</button></div>
      </form>
      {preparedCode && <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <h3 className="font-semibold text-indigo-950">Finish in three steps</h3>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-700">
          <li>Click <strong>Copy my connector</strong>. Open your Sheet → Extensions → Apps Script. Add a new script file named CRM Sync and paste the connector there. Keep your existing form code. If CRM Sync already exists, update that file instead.</li>
          <li>In Apps Script, open Project Settings → Script Properties. Add <code>CRM_LEAD_INGEST_SECRET</code> with the same private value as Supabase's <code>LEAD_INGEST_SECRET</code>. Save it. Never put your Supabase database key here.</li>
          <li>Return to the editor, select <code>setupThisLandingPage</code>, and click Run. Approve Google's permissions. Check the Sheet's CRM delivery column for <strong>Delivered to CRM</strong>. Your page will appear below after its first lead arrives.</li>
        </ol>
        <p className="mt-3 text-sm text-slate-600">New leads are checked every minute. If several pages share this Sheet, each row needs its page name in a Source column; otherwise this page name is used for every row.</p>
        <button type="button" className="btn-primary mt-4" onClick={() => copy(preparedCode, 'Configured connector')}><Copy size={16}/>Copy my connector</button>
        <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-600">View my connector</summary><textarea aria-label="Configured landing page connector" className="input mt-3 h-72 font-mono text-xs" readOnly value={preparedCode}/></details>
      </div>}
    </section>}
    <section className="card mb-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-heading">Your landing pages</h2>
          <p className="mt-1 text-sm text-slate-500">Each page appears here automatically after a lead arrives with its page name in the Sheet’s Source column.</p>
        </div>
        <Link className="btn-secondary" to="/leads">View all leads</Link>
      </div>
      {sourcesLoading ? <p className="mt-5 text-sm text-slate-500">Loading landing pages…</p> : landingPages.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {landingPages.map(([source, stats]) => (
            <article key={source} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="truncate font-semibold text-slate-900" title={source}>{source}</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[['Total', stats.total], ['New', stats.new], ['Converted', stats.converted]].map(([label, count]) => (
                  <div key={label} className="rounded-lg bg-slate-50 px-2 py-2">
                    <div className="text-lg font-bold text-slate-900">{count}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <Link className="mt-4 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700" to={`/leads?source=${encodeURIComponent(source)}`}>Open this page’s leads →</Link>
              {isAdmin && <PageSharing source={source}/> }
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          No landing pages have sent leads yet. Add a <strong>Source</strong> or <strong>Landing page</strong> column to your Sheet and fill it with a page name for each lead. The page will appear here after its first lead syncs.
        </div>
      )}
    </section>
    {isAdmin && <details className="mb-6">
    <summary className="cursor-pointer py-3 text-sm font-semibold text-slate-600">Advanced connection settings and receiver check</summary>
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2"><TableProperties className="text-emerald-600" size={20}/><h2 className="section-heading">CRM receiver</h2></div>
        <p className="text-sm text-slate-500">The Apps Script sends saved leads here over HTTPS.</p>
        <div className="mt-5 rounded-lg bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Receiver URL</span><button aria-label="Copy receiver URL" className="flex h-11 w-11 items-center justify-center" onClick={() => copy(receiverUrl(), 'Receiver URL')}><Copy size={16}/></button></div><code className="block break-all text-xs leading-5">{receiverUrl() || 'Supabase is not configured.'}</code></div>
        <button className="btn-secondary mt-4 w-full" onClick={check} disabled={checking}><RefreshCw size={16}/>{checking ? 'Checking...' : 'Check receiver'}</button>
        {status === 'ready' && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={17}/>Receiver is ready. Delivery still needs a real sheet submission to verify.</p>}
        {status && status !== 'ready' && <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{status}</p>}
      </section>
      <section className="card p-4 sm:p-6">
        <h2 className="section-heading">Connect a Google Sheet</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
          <li>In the Sheet?s Apps Script, add the sync script below. It automatically reads existing lead rows every minute; you do not need to edit the landing-page form or its doPost handler.</li>
          <li>For multiple landing pages in one Sheet, include a <code>Source</code>, <code>Lead source</code>, <code>Landing page</code>, or <code>Page name</code> column and put the matching page label in each lead row. The CRM will show a Landing page filter on the Leads page. Use <code>CRM_LEAD_SOURCE</code> only as a fallback for rows without a source column value.</li>
          <li>In Apps Script project settings, add <code>CRM_SOURCE_SHEET_ID</code> (the ID from your Sheet URL), <code>CRM_SOURCE_SHEET_NAME</code> (usually Leads), <code>CRM_LEAD_RECEIVER_URL</code> (the URL above), <code>CRM_LEAD_INGEST_SECRET</code> (the private receiver secret), and optionally <code>CRM_LEAD_SOURCE</code> as the fallback page name.</li>
          <li>Select <code>installCrmSheetSync</code> and click Run once to authorize Sheets and outbound requests and install the trigger. The script checks up to ten rows per run, retries failed rows, and adds a CRM delivery status column.</li>
        </ol>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button className="btn-primary" onClick={() => copy(sheetSyncCode, 'Apps Script sync script')}><Copy size={16}/>Copy Google Sheets sync script</button><Link className="btn-secondary" to="/leads">Open leads</Link></div>
        <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-slate-600">View Google Sheets sync script</summary><textarea aria-label="Google Sheets sync script" className="input mt-3 h-72 w-full font-mono text-xs leading-5" readOnly value={sheetSyncCode}/></details>
      </section>
    </div>
    </details>}
    <section className="card mt-6 p-4 sm:p-6"><h2 className="section-heading">What arrives in the CRM</h2><p className="mt-2 text-sm leading-6 text-slate-600">Each lead needs name and phone columns. Email and question answers are included when available. The Source column groups leads by landing page. Failed deliveries are retried automatically.</p></section>
  </>;
}
