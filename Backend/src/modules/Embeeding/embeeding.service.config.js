import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSION = 1536

// no of text to give during embedding
const BATCH_SIZE = 100


// this function runs when user aks question
export async function embeddingText(text) {

    try {

        const model = genAi.getGenerativeModel({ model: EMBEDDING_MODEL })

        const result = await model.embedContent({
            content: {
                parts: [{ text: text.replace(/\n/g, ' ').trim() }],
                role: 'user'
            },
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: EMBEDDING_DIMENSION
        })

        return result.embedding.values  /* Array of 756 floats also known as vectors */

    } catch (error) {
        console.error('Gemini embedText error:', error.message)
        throw error
    }
}

// this is used when we need to embedding the child chunk  we obtained from chunker service
export async function embeddingDocument(text) {

    try {
        const model = genAi.getGenerativeModel({ model: EMBEDDING_MODEL })

        const result = await model.embedContent({
            content: {
                parts: [{ text: text.replace(/\n/g, ' ').trim() }],
                role: 'user'
            },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIMENSION
        })

        return result.embedding.values
    } catch (error) {
        console.error('Gemini embedDocument error:', error.message)
        throw error
    }
}

export async function embeddingBatches(text) {
   
    const allEmbeddings = [];
    const batches = Math.ceil(text.length / BATCH_SIZE)

    // traverse through each chunk
    for (let i = 0; i < text.length; i += 100) {
        // means it starts at 0 and further 100 , then 200 and then 300//.. this helps to maintains batches
        const batch = text.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1 /* that is for 0 to 100 chunks the batch number will be 1 */
        console.log(`Embedding batch ${batchNumber}/${batches} (${batch.length} texts)`)

        /* You use Promise cause u need all chunks to finish embedding then only return the result... and it also return an array */
        const batchEmbedding = await Promise.all(
            /* for each child chunk in batch embedd it */
            batch.map(text => embeddingDocument(text))
        )

        allEmbeddings.push(...batchEmbedding)
        // delay between batches — respect free tier rate limits
        if (i + BATCH_SIZE < text.length) {
            await sleep(500)  // 500ms between batches
        }

    }
    console.log(`Embedded ${allEmbeddings.length} texts successfully`)
    return allEmbeddings
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
