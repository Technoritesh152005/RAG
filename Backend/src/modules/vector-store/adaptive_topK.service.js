const MIN_K = 2
const MAX_K = 8;


// we use adaptive k pattern where some question may need 2 chunks some may need more than 5 chunks=> so we make it dynamix
const FLAT_CLUSTER_DELTA = 0.05
const CLIFF_THRESHOLD = 0.35


export function selectAdaptiveTopK(rankedResults){

    if(rankedResults.length == 0)return []
    if(rankedResults.length <= MIN_K)return rankedResults

  const scores = rankedResults.map((r)=>r.score)

    //for each element check wheteher u see such drop
    for(let i = MIN_K ; i < Math.min(scores.length , MAX_K); i++){
      const prev = scores[i-1];
      const curr = scores[i];

        if(prev <= 0.001){
        logCutOffDecision(scores, i, 'near-zero-score')
        return rankedResults.slice(0,i)
        }

        const relativeDrop = (prev-curr)/prev
        //this converts the drop in percentage

        if(relativeDrop< FLAT_CLUSTER_DELTA){continue}

        if(relativeDrop >= CLIFF_THRESHOLD){
            const pos = i
          logCutOffDecision(scores, pos, 'cliff-detected')
            return rankedResults.slice(0,pos);
        }
    }

    const cutoff = Math.min(scores.length, MAX_K)
  logCutOffDecision(scores, cutoff, 'no-cliff-max-k')
  return rankedResults.slice(0, cutoff)

}

function logCutOffDecision(scores, cutoff, reason){
     const kept = scores.slice(0, cutoff).map(s => s.toFixed(3))
      const dropped = scores.slice(cutoff).map(s => s.toFixed(3))
      console.log(
        `Adaptive top-K: kept ${cutoff}/${scores.length} (${reason}) ` +
        `| kept: [${kept.join(', ')}] | dropped: [${dropped.join(', ')}]`
      )
}