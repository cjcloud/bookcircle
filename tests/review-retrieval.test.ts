import test from 'node:test';
import assert from 'node:assert/strict';
import {retrieveReviewPage} from '../lib/review-retrieval.ts';

test('retrieval isolates a complete JSON-LD article body for screening',async()=>{
  const words=Array.from({length:130},(_,index)=>`word${index}`).join(' ');
  const html=`<script type="application/ld+json">${JSON.stringify({'@type':'Review',author:{name:'Reviewer'},articleBody:words})}</script>`;
  const transport:typeof fetch=async()=>new Response(html,{status:200,headers:{'content-type':'text/html'}});
  const result=await retrieveReviewPage({url:'https://review.example/book',title:'Review'},transport);
  assert.equal(result.status,'retrieved_for_screening');
  if(result.status==='retrieved_for_screening'){assert.equal(result.author,'Reviewer');assert.equal(result.wordCount,130);}
});

test('short or unidentifiable pages cannot become evidence',async()=>{
  const transport:typeof fetch=async()=>new Response('<main><p>Short page.</p></main>',{status:200});
  const result=await retrieveReviewPage({url:'https://review.example/short',title:'Short'},transport);
  assert.equal(result.status,'unavailable');
});

test('retrieval keeps an explicit metadata byline with an article extract',async()=>{
  const words=Array.from({length:130},(_,index)=>`word${index}`).join(' ');
  const html=`<meta name="author" content="Jane Reviewer"><article><p>${words}</p></article>`;
  const transport:typeof fetch=async()=>new Response(html,{status:200});
  const result=await retrieveReviewPage({url:'https://review.example/byline',title:'Review'},transport);
  assert.equal(result.status,'retrieved_for_screening');
  if(result.status==='retrieved_for_screening')assert.equal(result.author,'Jane Reviewer');
});
