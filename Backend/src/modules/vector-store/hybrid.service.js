import { embeddingText } from '../Embeeding/embeeding.service.config'
import { vectorSearch } from './pinecone.service.js'
import { keywordSearch } from './fullTextSearch.service.js'

const RRF_k = 60
const MIN_CONFIDENCE_SCORE = 0.15

export async function hybridSearch(question, workspaceId, topK = 5) {

    console.log(`Hybrid Search : "${question}" in workspace ${workspaceId}`)

    const questionEmbedding = await embeddingText(question)

    // once both r completed to run then only op comes together... Both works parallely
    const [vectorResults, keywordResults] = await Promise.all([
        vectorSearch(questionEmbedding, workspaceId, topK * 2),
        keywordSearch(question, workspaceId, topK * 2)
    ])

    console.log(`Vector results: ${vectorResults.length}, Keyword results: ${keywordResults.length}`)

    if (vectorResults.length == 0 && keywordResults.length == 0) {
        return {
            results: [],
            confident: false,
            reason: 'No relevant search content foind in indexed sources'
        }
    }

    const merged = reciprocalRankFusion(vectorResults, keywordResults, topK)

    console.log(merged)
    const topScore = merged[0]?.score
    if (topScore < MIN_CONFIDENCE_SCORE) {
        return {
            results: merged,
            confident: false,
            reason: 'Found some content but the confidence is low'
        }
    }

    return {
        results: merged,
        confident: true,
        reason: null
    }


}

function reciprocalRankFusion(vectorResults, keywordResults, topK) {

    const scoreMap = new Map()

    // scoring vector results y rank position
    // here resuls means that particuar vector and rank starts from 0 which is index
    vectorResults.forEach((result, rank) => {
        console.log(result)

        const existing = scoreMap.get(result.id) || {
            ...result,
            rrfScore: 0,
            inVector: false,
            inKeyword: false
        }
        // RRF formula: 1 / (rank + K)
        // rank 0 (best) → 1/60 = 0.0167
        // rank 9 (worst) → 1/69 = 0.0145
        existing.rrfScore += 1 / (rank + RRF_K)
        existing.inVector = true
        scoreMap.set(result.id, existing)
    })

    keywordResults.forEach((result, rank) => {
        const existing = scoreMap.get(result.id) || {
            ...result,
            rrfScore: 0,
            inVector: false,
            inKeyword: false
        }
        // if the object exist we dont create seperating mapping for each vector but add their sum only of rrf
        // suppose chunk 2 appears both in vector and keyword then we just add their rrf
        existing.rrfScore += 1 / (rank + RRF_K)
        existing.inKeyword = true
        scoreMap.set(result.id, existing)
    })

    // sort by combined RRF score — highest first
    return Array.from(scoreMap.values())
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .slice(0, topK)
        .map(result => ({
            id: result.id,
            score: parseFloat(result.rrfScore.toFixed(6)),
            pageUrl: result.pageUrl,
            pageTitle: result.pageTitle,
            sectionHeading: result.sectionHeading,
            childText: result.childText,
            parentText: result.parentText,   // full context for Groq
            inVector: result.inVector,     // debug info
            inKeyword: result.inKeyword,    // debug info
        }))
}
