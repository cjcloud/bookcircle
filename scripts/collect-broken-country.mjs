import { mkdir, writeFile } from 'node:fs/promises';

const sources = [
  ['hns', 'https://historicalnovelsociety.org/reviews/broken-country/', 'Lizzie Bentham', 'This poignant love story', 'Romance fans who like'],
  ['munro', 'https://www.bookreporter.com/reviews/broken-country', 'Rebecca Munro', 'Readers of all genres', 'Sure to top all'],
  ['west', 'https://www.lyndsayslitreviews.com/reviews/broken-country', 'Lyndsay West', 'Broken Country is a romantic', 'My only complaint:'],
  ['ryland', 'https://www.jenryland.com/readers-guide-and-spoilers-for-broken-country/', 'Jen Ryland', 'My Readers Guide and Spoilers', 'About five years later'],
  ['beans', 'https://beansbookblog.com/2026/01/09/book-review-broken-country-by-clare-leslie-hall-2025-2/', "Bean's Book Blog", 'I enjoyed this page turning', 'good break from annotating'],
  ['guada', 'https://youguadareadwithme.wordpress.com/2025/05/26/sorrow-second-chances-a-review-of-broken-country-by-clare-leslie-hall/', 'You Guada Read With Me', 'I picked up Broken Country', 'I hope you read this book'],
  ['creek', 'https://www.onthecreekblog.com/2026/01/broken-country-by-clare-leslie-hall.html', 'Tiff — On the Creek', 'A slow burn that turns', 'It’s the kind of book'],
  ['schatje', 'https://schatjesshelves.blogspot.com/2025/11/review-of-broken-country-by-clare.html', 'Doreen — Schatje’s Shelves', 'Beth and Frank Johnson', 'not what I consider exceptional'],
  ['seattle', 'https://seattlebookmamablog.org/2025/05/22/broken-country-by-clare-leslie-hall/', 'Seattle Book Mama', 'I am late to the party', 'Highly recommended'],
  ['kirkus', 'https://www.kirkusreviews.com/book-reviews/clare-leslie-hall/broken-country-2/', 'Kirkus Reviews', 'Unchecked passion gives rise', 'An elegantly written historical novel'],
  ['hidden-nook', 'https://thehiddenbooknook.substack.com/p/9-friday-im-in-love-broken-country', 'The Hidden Book Nook', 'A New York Times bestseller', 'super excited to learn more about her work'],
];

const entities = new Map([['amp','&'],['lt','<'],['gt','>'],['quot','"'],['apos',"'"],['nbsp',' '],['#8217','’'],['#8216','‘'],['#8220','“'],['#8221','”'],['#8211','–'],['#8212','—']]);
function decode(value) {
  return value.replace(/&([^;]+);/g, (_, key) => entities.get(key) ?? (key.startsWith('#x') ? String.fromCodePoint(parseInt(key.slice(2),16)) : key.startsWith('#') ? String.fromCodePoint(Number(key.slice(1))) : `&${key};`));
}
function paragraphs(html) {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => decode(m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())).filter(Boolean);
}
function extract(items, start, end) {
  const first = items.findIndex(p => p.toLowerCase().includes(start.toLowerCase()));
  const last = items.findLastIndex(p => p.toLowerCase().includes(end.toLowerCase()));
  if (first < 0 || last < first) throw new Error(`Could not identify review boundaries: ${start}; first paragraphs: ${items.slice(0,8).join(' | ')}`);
  return items.slice(first, last + 1).join('\n\n');
}

await mkdir('.research-cache', { recursive: true });
const records = [];
for (const [id, url, author, start, end] of sources) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'BookClubBriefingResearch/0.1' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = extract(paragraphs(await response.text()), start, end);
    if (text.split(/\s+/).length < 100) throw new Error('extracted review is unexpectedly short');
    records.push({ id: `bc-${id}`, url, title: 'Broken Country', author, retrievedAt: new Date().toISOString(), text, textScope: 'full_review' });
    console.log(`${id}: ${text.split(/\s+/).length} words`);
  } catch (error) {
    console.warn(`${id}: unavailable (${error instanceof Error ? error.message : 'unknown error'})`);
  }
}
if (records.length < 5) throw new Error('Fewer than five complete reviews were retrieved.');
await writeFile('.research-cache/broken-country-11-sources-v1.json', JSON.stringify(records, null, 2), { flag: 'wx' });
