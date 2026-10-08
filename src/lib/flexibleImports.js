import {supabase} from './supabase';
function issue(error){if(error)throw new Error(['42P01','PGRST205'].includes(error.code)?'File uploads need one-time setup: run supabase/flexible-imports.sql in Supabase SQL Editor.':error.message);}
export {flexibleRows} from './flexibleRows.js';
export async function saveFileRows(rows,source,fileName){
 if(!source.trim())throw new Error('Enter a landing page name.');
 const {error}=await supabase.from('crm_import_rows').insert(rows.map(fields=>({source:source.trim(),fields,file_name:fileName})));issue(error);
}
export async function fetchFileRows(source,page=0){
 let query=supabase.from('crm_import_rows').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id');
 if(source)query=query.eq('source',source);
 const {data,error,count}=await query.range(page*25,page*25+24);issue(error);return {data,count};
}
export async function fileSources(){
 const sources=new Set();for(let offset=0;;offset+=1000){const {data,error}=await supabase.from('crm_import_rows').select('source').order('source').range(offset,offset+999);
 if(['42P01','PGRST205'].includes(error?.code))return [];issue(error);data.forEach(row=>sources.add(row.source));if(data.length<1000)break;}return [...sources];
}
export async function updateFileRow(id,fields){const {error}=await supabase.from('crm_import_rows').update({fields}).eq('id',id).select('id').single();issue(error);}

export async function fileStats(){
 const stats={};for(let offset=0;;offset+=1000){const {data,error}=await supabase.from('crm_import_rows').select('source').order('id').range(offset,offset+999);if(['42P01','PGRST205'].includes(error?.code))return {};issue(error);data.forEach(row=>{stats[row.source]=(stats[row.source]||0)+1;});if(data.length<1000)break;}return stats;
}
