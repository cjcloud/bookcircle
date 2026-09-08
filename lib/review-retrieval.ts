import {safePublicUrl,type DiscoveredPage} from './claude-discovery.ts';

type Transport=typeof fetch;
const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ', '#8217':'’','#8216':'‘','#8220':'“','#8221':'”','#8211':'–','#8212':'—'};
const decode=(value:string)=>value.replace(/&([^;]+);/g,(_,key:string)=>entities[key]??(key.startsWith('#x')?String.fromCodePoint(parseInt(key.slice(2),16)):key.startsWith('#')?String.fromCodePoint(Number(key.slice(1))):`&${key};`));
const clean=(value:string)=>decode(value.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
function articleBodyFromJson(value:unknown):{text:string;author:string}|null{
  if(Array.isArray(value)){for(const item of value){const found=articleBodyFromJson(item);if(found)return found;}return null;}
  if(!value||typeof value!=='object')return null;
  const row=value as Record<string,unknown>;
  if(typeof row.articleBody==='string'){
    const author=typeof row.author==='string'?row.author:row.author&&typeof row.author==='object'&&typeof (row.author as Record<string,unknown>).name==='string'?String((row.author as Record<string,unknown>).name):'';
    return {text:clean(row.articleBody),author};
  }
  for(const nested of Object.values(row)){const found=articleBodyFromJson(nested);if(found)return found;}
  return null;
}
function authorFromJson(value:unknown):string{
  if(Array.isArray(value)){for(const item of value){const author=authorFromJson(item);if(author)return author;}return '';}
  if(!value||typeof value!=='object')return '';
  const row=value as Record<string,unknown>;
  if(typeof row.author==='string')return clean(row.author);
  if(row.author&&typeof row.author==='object'){
    const author=row.author as Record<string,unknown>;
    if(typeof author.name==='string')return clean(author.name);
  }
  for(const nested of Object.values(row)){const author=authorFromJson(nested);if(author)return author;}
  return '';
}
function authorFromHtml(html:string){
  for(const tag of html.match(/<meta\b[^>]*>/gi)??[]){
    const name=tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content=tag.match(/content=["']([^"']+)["']/i)?.[1];
    if(content&&['author','article:author','parsely-author'].includes(name??'')&&!/^https?:/i.test(content))return clean(content);
  }
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{const author=authorFromJson(JSON.parse(match[1]));if(author)return author;}catch{}
  const authorElement=html.match(/<(?:a|span|div)\b[^>]*(?:rel=["']author["']|class=["'][^"']*(?:author|byline)[^"']*["'])[^>]*>([\s\S]*?)<\/(?:a|span|div)>/i)?.[1];
  return authorElement?clean(authorElement).replace(/^by\s+/i,''):'';
}
function extract(html:string){
  const pageAuthor=authorFromHtml(html);
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{const found=articleBodyFromJson(JSON.parse(match[1]));if(found&&found.text.split(/\s+/).length>=120)return {...found,author:found.author||pageAuthor};}catch{}
  }
  const region=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]??html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if(!region)return null;
  const text=[...region.matchAll(/<(?:p|h2|h3|blockquote)\b[^>]*>([\s\S]*?)<\/(?:p|h2|h3|blockquote)>/gi)].map(match=>clean(match[1])).filter(Boolean).join('\n\n');
  return text.split(/\s+/).length>=120?{text,author:pageAuthor}:null;
}

export async function retrieveReviewPage(page:DiscoveredPage,transport:Transport=fetch){
  if(!safePublicUrl(page.url))return {...page,status:'unavailable' as const,reason:'Unsafe or invalid URL.'};
  try{
    const response=await transport(page.url,{headers:{'user-agent':'BookClubBriefingResearch/0.2'},signal:AbortSignal.timeout(30000),redirect:'follow'});
    if(!response.ok)return {...page,status:'unavailable' as const,reason:`HTTP ${response.status}`};
    if(response.url&&!safePublicUrl(response.url))return {...page,status:'unavailable' as const,reason:'Redirected to a private address.'};
    const html=await response.text(),article=extract(html);
    if(!article)return {...page,status:'unavailable' as const,reason:'A complete article body could not be isolated.'};
    const words=article.text.split(/\s+/).length;
    if(words>15000)return {...page,status:'unavailable' as const,reason:'Extracted page was too large to identify as one review.'};
    return {...page,status:'retrieved_for_screening' as const,reason:'Article body retrieved; context and authorship still require screening.',author:article.author,text:article.text,textScope:'candidate_full_text' as const,retrievedAt:new Date().toISOString(),wordCount:words};
  }catch(error){return {...page,status:'unavailable' as const,reason:error instanceof Error?error.message:'Retrieval failed.'};}
}
