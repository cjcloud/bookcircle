import brokenCountry from '@/data/research-preview.json';
import familyUpstairs from '@/data/family-upstairs-research-preview.json';
import kundera from '@/data/kundera-research-preview.json';

const statusLabel: Record<string,string> = {
  model_supported: 'Source checks passed',
  unsupported: 'Blocked',
  unresolved: 'Needs another check'
};

import {getResearchPromotion} from '@/lib/research-promotions';
export default function ResearchPilot({bookId,onPromote}:{bookId:string;onPromote?:(candidateId:string)=>void}){
  const pilot=[brokenCountry,familyUpstairs,kundera].find(item=>item.bookId===bookId);
  if(!pilot)return null;
  const sourceById=new Map(pilot.sources.map(source=>[source.id,source]));
  return <article className="card research-pilot">
    <span className="tag">Expanded live research · {pilot.coverage.reviewsIncluded} complete reviews</span>
    <h2>Research coverage</h2>
    <p>This run considered <strong>{pilot.coverage.reviewsConsidered} items</strong>. It analysed the complete text of <strong>{pilot.coverage.reviewsIncluded} critical reviews</strong>{pilot.coverage.holdoutReviews?`, reserved ${pilot.coverage.holdoutReviews} reviews for a further coverage check`:''}, and excluded {pilot.coverage.excludedItems} items that did not meet the source criteria.</p>
    <p className="hint">{pilot.coverage.saturation}</p>
    <h3>Reception overview</h3>
    <div className="reception-grid">
      <section className="reception-box">
        <span className="eyebrow">CRITICAL SAMPLE</span>
        <strong className="reception-score">{pilot.reception.criticalSample.total} reviews</strong>
        <p>{pilot.reception.criticalSample.positive} positive · {pilot.reception.criticalSample.mixed} mixed · {pilot.reception.criticalSample.negative} negative{pilot.reception.criticalSample.unclear?` · ${pilot.reception.criticalSample.unclear} unclear`:''}</p>
        <p className="hint">{pilot.reception.criticalSample.note}</p>
      </section>
      {pilot.reception.readerPlatforms.map(platform=><section className="reception-box" key={platform.name}>
        <span className="eyebrow">READERS · {platform.name.toUpperCase()}</span>
        <strong className="reception-score">{platform.rating.toFixed(2)}<small> / {platform.scale}</small></strong>
        <p>{platform.ratingCount.toLocaleString('en-GB')} ratings{platform.reviewCount?` · ${platform.reviewCount.toLocaleString('en-GB')} written reviews`:''}</p>
        <p className="hint"><a href={platform.url} target="_blank" rel="noreferrer">View source</a> · retrieved {new Date(platform.retrievedAt).toLocaleDateString('en-GB')}</p>
      </section>)}
    </div>
    <p className="hint">{pilot.reception.note}</p>
    <h3>Collision candidates</h3>
    <p>Each candidate is shown with its own evidence status. A failed candidate is retained here to make the rejection visible; it cannot enter the Opinion Map.</p>
    {!pilot.candidates.length&&<div className="opinion-balance blocked-balance"><strong>Research analysis incomplete</strong><p>The reviews were collected and checked, but their viewpoints have not yet been successfully distilled and verified. The existing Opinion Map is sample material.</p></div>}
    {pilot.candidates.map(candidate=><section className="research-candidate" key={candidate.id}>
      <span className={`tag research-status ${candidate.status}`}>{statusLabel[candidate.status]}</span>
      <h4>{candidate.question}</h4>
      <p><strong>View A</strong><br/>{candidate.positionA}</p>
      <p><strong>View B</strong><br/>{candidate.positionB}</p>
      {candidate.balance?<div className="opinion-balance">
        <strong>How often this question arose</strong>
        <p>Among all {pilot.coverage.reviewsIncluded} critical reviews: View A {candidate.balance.viewA} · mixed or qualified {candidate.balance.mixed} · View B {candidate.balance.viewB} · did not address this issue {candidate.balance.notAddressed} · unresolved {candidate.balance.unresolved}.</p>
        <p className="hint">Issue coverage: {candidate.balance.coveragePercent}%. These counts show where the research found relevant commentary. They do not rank either view or determine whether it is valid.</p>
      </div>:<div className="opinion-balance blocked-balance"><strong>Source coverage not published</strong><p>This collision failed its source-fidelity check, so its classifications are withheld.</p></div>}
      <ul>{candidate.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
      <p className="hint">Evidence: {candidate.sources.map((id,index)=>{const source=sourceById.get(id);return <span key={id}>{index>0?' · ':''}<a href={source?.url} target="_blank" rel="noreferrer">{source?.author}</a></span>})}</p>
      {candidate.status==='model_supported'&&getResearchPromotion(bookId,candidate.id)&&onPromote&&<button className="primary" onClick={()=>onPromote(candidate.id)}>Use verified wording in draft</button>}
    </section>)}
    <details>
      <summary>See the research sample and exclusions</summary>
      <h4>Reviews analysed in full</h4>
      <ul>{pilot.sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> — {source.author}<br/><span className="hint">{source.sample}</span></li>)}</ul>
      <h4>Items excluded</h4>
      <ul>{pilot.excluded.map(reason=><li key={reason}>{reason}</li>)}</ul>
    </details>
    <p className="hint">Run: {new Date(pilot.runDate).toLocaleDateString('en-GB')} · {pilot.model}. This screen contains concise source summaries rather than copies of the reviews. No candidate is automatically released.</p>
  </article>;
}
