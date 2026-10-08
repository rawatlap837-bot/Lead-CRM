import {useState,useRef} from 'react';
import {useAuth} from '../context/auth-state';
import {flexibleRows,saveFileRows} from '../lib/flexibleImports';

export default function ImportLeads({sources,defaultSource,onImported,onBusyChange}){
 const {access}=useAuth();const admin=access?.is_admin===true;
 const [source,setSource]=useState(defaultSource||''),[book,setBook]=useState(null),[sheet,setSheet]=useState(''),[rows,setRows]=useState([]),[fileName,setFileName]=useState(''),[error,setError]=useState(''),[summary,setSummary]=useState(''),[busy,setBusy]=useState(false);const pending=useRef(false);
 const options=[...new Set([...sources,...(access?.sources||[])])];
 function selectSheet(workbook,name,XLSX){const data=flexibleRows(XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:'',raw:false,blankrows:false}));if(data.length>1000)throw new Error('Upload up to 1,000 rows at a time.');setSheet(name);setRows(data);setSummary('');setError('');}
 async function read(file){setError('');setRows([]);setBook(null);if(!file)return;setFileName(file.name);if(file.size>5*1024*1024){setError('Choose a file smaller than 5 MB.');return;}
 try{const XLSX=await import('xlsx');const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});if(!workbook.SheetNames.length)throw new Error('No worksheets found.');setBook(workbook);selectSheet(workbook,workbook.SheetNames[0],XLSX);}catch(issue){setError(issue.message);}}
 async function upload(){if(pending.current)return;setError('');setSummary('');if(!rows.length)return;
 if(!source.trim()){setError('Enter a landing page name.');return;}
 if(!admin&&!options.includes(source.trim())){setError('Choose a page shared with you.');return;}
 pending.current=true;setBusy(true);onBusyChange(true);
 try{await saveFileRows(rows,source,fileName);setSummary(rows.length+' rows uploaded into '+source+'.');setRows([]);await onImported(source);}
 catch(issue){setError(issue.message);}finally{pending.current=false;setBusy(false);onBusyChange(false);}}

 return <div className="space-y-4"><p className="text-sm text-slate-600">Upload any Excel or CSV table. No name, phone or fixed headings are required. All nonblank rows and columns are preserved in this page, including the first row. You can edit them after uploading.</p>
 <label className="block text-sm">Landing page{admin?<input className="input mt-2" list="import-pages" value={source} maxLength={200} disabled={busy} onChange={e=>setSource(e.target.value)} placeholder="Choose or enter a page name"/>:<select className="input mt-2" value={source} disabled={busy} onChange={e=>setSource(e.target.value)}><option value="">Choose a page</option>{options.map(x=><option key={x}>{x}</option>)}</select>}<datalist id="import-pages">{options.map(x=><option key={x} value={x}/>)}</datalist></label>
 <label className="block text-sm">Excel or CSV file<input className="input mt-2" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={e=>read(e.target.files[0])}/></label>
 {book&&<label className="block text-sm">Worksheet<select className="input mt-2" value={sheet} disabled={busy} onChange={async e=>{try{selectSheet(book,e.target.value,await import('xlsx'));}catch(issue){setError(issue.message);}}}>{book.SheetNames.map(x=><option key={x}>{x}</option>)}</select></label>}
 {!!rows.length&&<><p>{rows.length} rows · {Object.keys(rows[0]).length} columns. All fields will be saved.</p><button className="btn-primary" disabled={busy||!source.trim()} onClick={upload}>{busy?'Uploading…':'Upload '+rows.length+' rows into this page'}</button></>}
 {summary&&<p role="status" className="text-sm text-emerald-700">{summary}</p>}{error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
 </div>;
}
