import prisma from '../../lib/prisma.js'

// we use hybrid search method where we have 2 experts who returns the proper chunk
// Expert 1 : vector search : which calculate best cosine similarity from all vectors
// expert 2 : Postgres vector: here it matches threr keyword stored in postgres so that even keyworkd based searcher works

export async function storeChunksForFullTextSearch(chunks) {
    console.log(`Stroing ${chunks.length} of chunks in prisma for Full Text Search`)

    const BATCH_SIZE = 50

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)

        for (const chunk of batch) {
            await prisma.chunk.upsert({
                where: { id: chunk.id },
                update: {
                    childText: chunk.childText,
                    parentText: chunk.parentText,
                    pageTitle: chunk.metadata.pageTitle,
                    sectionHeading: chunk.metadata.sectionHeading
                },
                create: {
                    id: chunk.id,
                    sourceId: chunk.metadata.sourceId,
                    workspaceId: chunk.metadata.workspaceId,
                    pageUrl: chunk.metadata.pageUrl,
                    pageTitle: chunk.metadata.pageTitle,
                    sectionHeading: chunk.metadata.sectionHeading,
                    parentText: chunk.parentText,
                    childText: chunk.childText,
                    chunkIndex: chunk.metadata.chunkIndex,
                    parentIndex: chunk.metadata.parentIndex,
                }
            })
        }

    }

    console.log(`FTS: stored all chunks in Postgres`)
}

export async function keywordSearch(query, workspaceId, topK = 10) {

    try {

        const result = await prisma.$queryRaw
            `
        SELECT
        id,
        "pageUrl",
        "pageTitle",
        "sectionHeading",
        "childText",
        "parentText",
        ts_rank(

            to_tsvector(
                'english',
                "childText" || ' ' || "pageTitle" || ' ' || "sectionHeading"
                ),

            plainto_tsquery(
            'english',${query}
                )

        ) AS rank
         FROM "Chunk"

         WHERE "workspaceId" = ${workspaceId}
         AND 
         to_tsvector(
          'english',
          "childText" || ' ' || "pageTitle" || ' ' || "sectionHeading"
        ) @@ plainto_tsquery('english', ${query})
         ORDER BY rank DESC
      LIMIT ${topK}
        `

        /* Summarization of the above sql query
        1. select all fields from chunk model of prisma 
        2. to_tsvector means converting an para to a searchable dictionary means breaking a points into words or punctuation for comparing with user query
        3. plainto_tsquery means user query is also broked down a particular wording term
        and ts_rank means we rank each chunk with the query and give it a rank which helps to show how a particular chunk mathces with user query based on postgres keyword searching service
        4. We get it from particular workspace only and further with help of @@ it tells whether this chunk and query actually mathc... if they match it ranks then
        5.It returns array of objectys
        */
        return result.map(r => ({
            id: r.id,
            score: parseFloat(r.rank),
            pageUrl: r.pageUrl,
            pageTitle: r.pageTitle,
            sectionHeading: r.sectionHeading,
            childText: r.childText,
            parentText: r.parentText,
        }))

    } catch (error) {
        // if FTS fails — return empty, vector search still works
        console.error('FTS keywordSearch error:', error.message)
        return []
    }
}
// delete all chunks for a source from Postgres
// called before reindexing — keeps DB clean

export async function deleteSourceChunks(sourceId) {
    const chunks = await prisma.chunk.findMany({
        where: { sourceId },
        select: { id: true }
    })

    await prisma.$transaction([
        prisma.chunkHash.deleteMany({
            where: { chunkId: { in: chunks.map(chunk => chunk.id) } }
        }),
        prisma.chunk.deleteMany({ where: { sourceId } })
    ])
    console.log(`FTS: deleted chunks for source ${sourceId}`)
}

// delete all chunks for a workspace
// called when workspace deleted
export async function deleteWorkspaceChunks(workspaceId) {
    await prisma.chunk.deleteMany({
        where: { workspaceId }
    })
    console.log(`FTS: deleted all chunks for workspace ${workspaceId}`)
}