export function createResearchBatches<T>(sources:T[],batchSize=4):T[][] {
  if(!Number.isInteger(batchSize)||batchSize<2||batchSize>6)throw Error('Research batch size must be between 2 and 6.');
  if(sources.length<2)throw Error('At least two sources are required.');
  const batches:T[][]=[];
  for(let index=0;index<sources.length;index+=batchSize)batches.push(sources.slice(index,index+batchSize));
  if(batches.length>1&&batches.at(-1)!.length===1){
    batches.at(-1)!.unshift(batches.at(-2)!.pop()!);
  }
  return batches;
}
