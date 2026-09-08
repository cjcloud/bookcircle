import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2),outputPath=args.pop();
if(!outputPath||args.length<2)throw Error('Usage: merge:sources source-a.json source-b.json output.json');
const merged=[];const seen=new Set<string>();let sourcePrefix='source';
for(const path of args){
  const rows=JSON.parse(await readFile(path,'utf8')) as Record<string,unknown>[];
  if(!Array.isArray(rows))throw Error(`Invalid source set: ${path}`);
  for(const row of rows){
    if(typeof row.text!=='string'||typeof row.url!=='string')continue;
    if(merged.length===0&&typeof row.id==='string')sourcePrefix=row.id.match(/^(.+?)-review-\d+$/)?.[1]??sourcePrefix;
    const digest=createHash('sha256').update(row.text).digest('hex');
    if(seen.has(digest))continue;seen.add(digest);
    merged.push({...row,id:`${sourcePrefix}-review-${merged.length+1}`});
  }
}
await writeFile(outputPath,JSON.stringify(merged,null,2)+'\n',{flag:'wx'});
console.log(`Merged ${merged.length} distinct complete reviews.`);
