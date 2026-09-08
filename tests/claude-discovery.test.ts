import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverReviewPages,screenReviewPages} from '../lib/claude-discovery.ts';

test('review discovery deduplicates results and rejects local addresses',async()=>{
  process.env.ANTHROPIC_API_KEY='test';process.env.ANTHROPIC_MODEL='test-model';
  const transport:typeof fetch=async()=>new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[
    {type:'web_search_result',url:'https://reviews.example/book#section',title:'Review'},
    {type:'web_search_result',url:'https://reviews.example/book',title:'Duplicate'},
    {type:'web_search_result',url:'http://127.0.0.1/private',title:'Private'}
  ]}]}),{status:200,headers:{'content-type':'application/json'}});
  const result=await discoverReviewPages('A Book','An Author',transport);
  assert.equal(result.pages.length,1);
  assert.equal(result.pages[0].url,'https://reviews.example/book');
  assert.equal(result.status,'candidates_require_full_text');
});

test('screening separates critical candidates, reader aggregates and ineligible pages',()=>{
  const pages=screenReviewPages([
    {url:'https://critic.example/review',title:'The Family Upstairs review'},
    {url:'https://www.goodreads.com/book/show/1',title:'The Family Upstairs'},
    {url:'https://www.amazon.com/book/dp/1',title:'Buy The Family Upstairs'},
    {url:'https://en.wikipedia.org/wiki/The_Family_Upstairs',title:'The Family Upstairs'}
  ]);
  assert.deepEqual(pages.map(page=>page.status),['candidate_full_text','audience_aggregate','excluded_retailer','excluded_reference']);
});
