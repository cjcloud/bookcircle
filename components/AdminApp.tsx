'use client';
import { useEffect, useState } from 'react';
import type { Book, Question, Tone, Workspace } from '@/lib/types';
import { ResearchViews } from './ResearchViews';
import Editor from './Editor';
import ChairPreview from './ChairPreview';
import MeetingCapture from './MeetingCapture';
import Roundup from './Roundup';
import BookReviews from './BookReviews';
import { STEP_DRAFT, STEP_CHAIR, STEP_MEETING, STEP_ROUNDUP, STEP_COLLISIONS } from '@/lib/steps';
const steps=['Admin Briefing','Reviews','Context & Interpretation','Candidate Collisions','Draft Opinion Map','Chair / member preview','Meeting Capture','Round-up preview'];

/** Draft/history/meeting state now lives in the shared `workspaces` table
 * (one row per book, everyone on the authorized_emails whitelist sees the
 * same row) instead of per-browser localStorage. All the enforcement that
 * used to run as unchecked browser JavaScript (editDraft's lock checks,
 * finalise's research-admission check) now runs server-side in
 * app/api/workspace/[bookId]/route.ts and app/api/research/promote/route.ts
 * — this component just posts intents and renders whatever comes back. */
async function call(url:string,body:object):Promise<Workspace>{
 const res=await fetch(url,{method:url.includes('/research/promote')?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const json=await res.json();
 if(!res.ok)throw Error(json.error||'The request could not be completed.');
 return json.workspace as Workspace;
}
export default function AdminApp({books:initialBooks,fixtureIds}:{books:Book[];fixtureIds:string[]}){
 const [books,setBooks]=useState<Book[]>(initialBooks);
 const [bookId,setBookId]=useState(initialBooks[0].id);const book=books.find(b=>b.id===bookId)!;
 const [addingBook,setAddingBook]=useState(false),[newTitle,setNewTitle]=useState(''),[newAuthor,setNewAuthor]=useState(''),[addBookBusy,setAddBookBusy]=useState(false);
 const [editingBook,setEditingBook]=useState(false),[editTitle,setEditTitle]=useState(''),[editAuthor,setEditAuthor]=useState(''),[editBusy,setEditBusy]=useState(false);
 const [confirmDelete,setConfirmDelete]=useState(false),[deleteBusy,setDeleteBusy]=useState(false);
 const isFixture=fixtureIds.includes(bookId);
 const [state,setState]=useState<Workspace|null>(null),[step,setStep]=useState(0),[notice,setNotice]=useState(''),[saved,setSaved]=useState('Loading workspace…'),[ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false;setReady(false);setSaved('Loading workspace…');
  (async()=>{try{
   const res=await fetch(`/api/workspace/${book.id}`);
   const json=await res.json();
   if(!res.ok)throw Error(json.error||'Could not load the workspace.');
   if(!cancelled){setState(json.workspace);setSaved('Loaded · shared workspace');setReady(true);}
  }catch(e){if(!cancelled){setSaved('Could not load — see notice');setNotice(`Load failed: ${(e as Error).message}`);setReady(true);}}
  })();
  return()=>{cancelled=true;};
 },[book]);
 async function update(next:Workspace){setState(next);setSaved('Saving…');try{const saved=await call(`/api/workspace/${book.id}`,{type:'replace',workspace:next});setState(saved);setSaved('Saved · shared workspace');}catch(e){setSaved('Not saved — see notice');setNotice(`Save failed: ${(e as Error).message}`);}}
 async function commit(questions:Question[],reason:string,tone?:Tone){if(!state)return;setSaved('Saving…');try{const next=await call(`/api/workspace/${book.id}`,{type:'edit',questions,reason,tone});setState(next);setSaved('Saved · shared workspace');setNotice(next.diagnostics.valid?'Draft saved. Structural checks pass.':'Draft saved. Review the editorial issues.');}catch(e){setSaved('Not saved — see notice');setNotice((e as Error).message);}}
 async function finish(){if(!state)return;setSaved('Saving…');try{const next=await call(`/api/workspace/${book.id}`,{type:'finalise'});setState(next);setSaved('Saved · shared workspace');go(STEP_CHAIR);}catch(e){setSaved('Not saved — see notice');setNotice((e as Error).message);}}
 async function promote(candidateId:string){setSaved('Saving…');try{const next=await call('/api/research/promote',{bookId:book.id,candidateId});setState(next);setSaved('Saved · shared workspace');setNotice('Verified research wording added to the draft. Editing it will expire the verification link.');setStep(STEP_DRAFT);window.scrollTo(0,0);}catch(e){setSaved('Not saved — see notice');setNotice((e as Error).message);}}
 async function addBook(){
  const title=newTitle.trim(),author=newAuthor.trim();
  if(!title||!author)return;
  setAddBookBusy(true);
  try{
   const res=await fetch('/api/books',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({book_title:title,author})});
   const json=await res.json();
   if(!res.ok)throw Error(json.error||'Could not add the book.');
   setBooks(list=>[...list,json.book as Book]);
   setBookId((json.book as Book).id);
   setNewTitle('');setNewAuthor('');setAddingBook(false);setNotice('');
  }catch(e){setNotice((e as Error).message);}
  finally{setAddBookBusy(false);}
 }
 async function saveEdit(){
  const title=editTitle.trim(),author=editAuthor.trim();
  if(!title||!author)return;
  setEditBusy(true);
  try{
   const res=await fetch(`/api/books/${bookId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({book_title:title,author})});
   const json=await res.json();
   if(!res.ok)throw Error(json.error||'Could not update the book.');
   setBooks(list=>list.map(b=>b.id===bookId?(json.book as Book):b));
   setEditingBook(false);setNotice('');
  }catch(e){setNotice((e as Error).message);}
  finally{setEditBusy(false);}
 }
 async function removeBook(){
  setDeleteBusy(true);
  try{
   const res=await fetch(`/api/books/${bookId}`,{method:'DELETE'});
   const json=await res.json();
   if(!res.ok)throw Error(json.error||'Could not delete the book.');
   const remaining=books.filter(b=>b.id!==bookId);
   setBooks(remaining);
   setBookId(remaining[0].id);
   setConfirmDelete(false);setNotice('');
  }catch(e){setNotice((e as Error).message);}
  finally{setDeleteBusy(false);}
 }
 function go(n:number){setStep(n);setNotice('');window.scrollTo(0,0);}
 function exportBackup(){if(!state)return;const blob=new Blob([JSON.stringify({book_id:book.id,workspace:state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${book.id}-workspace.json`;a.click();URL.revokeObjectURL(url);}
 async function importBackup(file:File|undefined){if(!file)return;try{if(file.size>2000000)throw Error('Backup is too large.');const raw=JSON.parse(await file.text());if(raw.book_id!==book.id)throw Error('Select the matching book before importing.');await update(raw.workspace);setNotice('Workspace restored from backup.');}catch(e){setNotice(`Import failed: ${(e as Error).message}`);}}
 return <><aside className="sidebar"><a className="brand" href="/">bcb<span>BOOK CLUB<br/>BRIEFING</span></a><p className="eyebrow">YOUR WORKSPACE</p><label htmlFor="book">Selected book</label><select id="book" value={bookId} onChange={e=>{setBookId(e.target.value);setNotice('');setEditingBook(false);setConfirmDelete(false);}}>{books.map(b=><option key={b.id} value={b.id}>{b.book_title}</option>)}</select>{!isFixture&&!addingBook&&<div className="manage-book">{editingBook?<div className="add-book"><label htmlFor="edit-book-title">Title</label><input id="edit-book-title" value={editTitle} onChange={e=>setEditTitle(e.target.value)} maxLength={300}/><label htmlFor="edit-book-author">Author</label><input id="edit-book-author" value={editAuthor} onChange={e=>setEditAuthor(e.target.value)} maxLength={300}/><div className="actions"><button disabled={editBusy||!editTitle.trim()||!editAuthor.trim()} onClick={saveEdit}>{editBusy?'Saving…':'Save'}</button><button onClick={()=>setEditingBook(false)}>Cancel</button></div></div>:confirmDelete?<div className="add-book"><p className="hint">Delete “{book.book_title}” and any workspace or review data saved for it? This can't be undone.</p><div className="actions"><button disabled={deleteBusy} onClick={removeBook}>{deleteBusy?'Deleting…':'Yes, delete'}</button><button onClick={()=>setConfirmDelete(false)}>Cancel</button></div></div>:<div className="actions"><button type="button" onClick={()=>{setEditTitle(book.book_title);setEditAuthor(book.author);setEditingBook(true);}}>Edit title/author</button><button type="button" onClick={()=>setConfirmDelete(true)}>Delete book</button></div>}</div>}{addingBook?<div className="add-book"><label htmlFor="new-book-title">New book title</label><input id="new-book-title" value={newTitle} onChange={e=>setNewTitle(e.target.value)} maxLength={300}/><label htmlFor="new-book-author">Author</label><input id="new-book-author" value={newAuthor} onChange={e=>setNewAuthor(e.target.value)} maxLength={300}/><div className="actions"><button disabled={addBookBusy||!newTitle.trim()||!newAuthor.trim()} onClick={addBook}>{addBookBusy?'Adding…':'Add book'}</button><button onClick={()=>{setAddingBook(false);setNewTitle('');setNewAuthor('');}}>Cancel</button></div><p className="hint">Makes the book selectable and ready for the Reviews step right away. Draft Opinion Map and the later steps need this book's question set authored separately before they'll work.</p></div>:<button type="button" className="add-book-toggle" onClick={()=>setAddingBook(true)}>+ Add a book</button>}<nav aria-label="Workflow">{steps.map((s,i)=><button key={s} className={step===i?'active':''} aria-current={step===i?'page':undefined} onClick={()=>go(i)}>{String(i+1).padStart(2,'0')} &nbsp; {s}</button>)}</nav><div className="sidebar-foot">V1.1 · Research pilot<br/>Verified evidence + shared workspace<br/>Visible to everyone on the whitelist</div></aside><main><header><span className="eyebrow">ADMIN STUDIO</span><span id="save-state" role="status">{saved}</span></header><div id="heading"><span className="eyebrow">{book.author}</span><h1>{book.book_title}</h1><p className="subtitle muted">{steps[step]} <span className="tag">{state?.final?'Chair version saved':'Draft workspace'}</span> <span className="tag">Full spoilers</span></p></div><div id="notice" role="status" aria-live="polite">{notice}</div>{!ready||!state?<p>Loading your shared workspace…</p>:<section id="content">{step<STEP_COLLISIONS+1&&<ResearchViews book={book} questions={state.draft} view={step} go={go} onPromote={promote}/>} {step===STEP_DRAFT&&<Editor key={book.id} book={book} state={state} commit={commit} update={update} finish={finish} notify={setNotice}/>} {step===STEP_CHAIR&&<ChairPreview book={book} questions={state.final?.questions??state.draft} date={state.final?.date}/>} {step===STEP_MEETING&&<MeetingCapture key={book.id} book={book} questions={state.final?.questions??null} meeting={state.meeting} update={meeting=>update({...state,meeting})} go={go} notify={setNotice}/>} {step===STEP_ROUNDUP&&<Roundup book={book} questions={state.final?.questions??null} meeting={state.meeting} update={meeting=>update({...state,meeting})} go={go}/>}<details className="no-print backup"><summary>Workspace backup & portability</summary><p className="hint">This book's workspace is shared with everyone on the whitelist. Export a copy for an offline record, or to move it between hosting addresses. Import replaces the selected book's current shared workspace for everyone.</p><button onClick={exportBackup}>Export workspace JSON</button><label htmlFor="backup-file">Restore this book from a backup</label><input id="backup-file" type="file" accept="application/json,.json" onChange={e=>{void importBackup(e.target.files?.[0]);e.target.value='';}}/></details></section>}</main></>;
}
