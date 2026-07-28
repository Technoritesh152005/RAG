import { getIndex } from '../../lib/pinecone.js'

const UPSERT_INSERT_BATCH = 100  //max vectors can go in batch in pinecone at at time

// in pinecone each workspace has a namespace means in that particular namespace only all he vectors are stored
// this prevents leak of other vectors in pinecone
// chunks from workspace A never mix with workspace B


// remember the chunks and their embedding are mapped correctly in sequence bcz all embdding r created based on chunks sequence
export async function upsertChunks(chunks, Embeddings, workspaceId) {

    const index = getIndex()
    const namespace = index.namespace(workspaceId)

    // build pinecone vector objects
    // this creates an array where inside array there r multple bjects of vectors with their corresponding chunks metadata
    const vectors = chunks.map((chunk, i) => {
        id: chunk.id
        values: Embeddings[i];
        metadata: {
            // identity
            sourceId: chunk.metadata.sourceId
            workspaceId: chunk.metadata.workspaceId

            // location for source citations
            pageUrl: chunk.metadata.pageUrl
            pageTitle: chunk.metadata.pageTitle
            sectionHeading: chunk.metadata.sectionHeading

            // location of content
            // we usually send parenttext and child text shown in citation ui
            childText: chunk.metadata.childText
            parentText: chunk.metadata.parentText

            // position
            chunkIndex: chunk.metadata.chunkIndex
            parentIndex: chunk.metadata.parentIndex
            parentId: chunk.metadata.parentid

        }

    })

    /* Put all the vectors in a batch of size UPSERT_SIZZE_BATCH */
    for (let i = 0; i < vectors.length; i += UPSERT_INSERT_BATCH) {
        const batch = vectors.slice(i, i + UPSERT_INSERT_BATCH)
        const batchNum = Math.floor(i / UPSERT_INSERT_BATCH) + 1

        const totalBatches = Math.ceil(vectors.length / UPSERT_INSERT_BATCH)

        /* This inserts the given vector in pinecone and also on that particular namespace */
        await namespace.upsert(batch)
        console.log(`Pinecone upsert: batch ${batchNum}/${totalBatches}`)
    }

    console.log(`Pinecone: stored ${vectors.length} vectors in namespace ${workspaceId}`)
}


// semantic vector search
// returns top K most similar chunks to the question
export async function vectorSearch(questionEmbedding, workspaceId, topK = 10) {

    // first get the namespace from where u will get the content vectors
    const index = getIndex()
    const namespace = index.namespace(workspaceId)

    const results = await namespace.query({
        vector: questionEmbedding,
        topK,
        includeMetadata: true
    })
    /* Basically it return array of matches where we have multiple matched objects in it */
    console.log(results)

    if (!results.matches || results.length === 0) return []

    // this makes array and inside have match objects
    results.matches.map(match => ({

        id: match.id,
        score: match.score,
        pageUrl: match.metadata.pageUrl,
        pageTitle: match.metadata.pageTitle,
        sectionHeading: match.metadata.sectionHeading,
        childText: match.metadata.childText,
        parentText: match.metadata.parentText, // full context for Groq
    }))
}

/* Whenever user tries to re-indexing a source try to delete all vectors for that source and for that particular namespace */
export async function deleteVectors(sourceId, workspaceId) {
    const index = getIndex()
    const namespace = index.namespace(workspaceId)

    await namespace.deleteMany({
        filter: { sourceId: { $eq: sourceId } }
    })

    console.log(`Pinecone : deleted vectors for source ${sourceId}`)
}

/* When workspace is deleted , delete all the vectors for entire naespace */
export async function deleteWorkspaceVectors(workspaceId) {
    try {
        const index = getIndex()
        const namespace = index.namespace(workspaceId)

        await namespace.deleteAll()
        console.log(`Pinecone: deleted all vectors for workspace ${workspaceId}`)
    } catch (err) {
        console.error(`Pinecone deleteWorkspace error:`, err.message)
    }
}