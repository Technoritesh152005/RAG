import {deleteVectors,deleteWorkspaceVectors} from '../vector-store/pinecone.service.js'
import {deleteWorkspaceChunks, deleteSourceChunks} from '../vector-store/fullTextSearch.service.js'
import {deleteFAQs} from '../chat/faq.service.js'
import {deleteWorkspaceHashes} from '../Embeeding/hashChunk.service.js'
import {deleteWorkspaceCache} from '../cache/semantic-cache.service.js'
import prisma from '../../lib/prisma.js'
import {deletePdf} from '../../lib/supabase.storage.js'

//when deleted workspace so delete all vectors and chunks. this basically links or bring each service together
//while deleting the workspace delete all the cache related data also
export async function cleanupWorkspace(workspaceId){

    console.log(`The workspace vectors and chunks deletion process is getting started`)

    await Promise.all([
        deleteWorkspaceChunks(workspaceId),
        deleteWorkspaceVectors(workspaceId),
        deleteFAQs(workspaceId),
        deleteWorkspaceHashes(workspaceId),
        deleteWorkspaceCache(workspaceId)
    ])

     console.log(`Workspace ${workspaceId} fully cleaned up`)
}

//cleanup when a single source is deleted
export async function cleanupSource(sourceId, workspaceId){
    const source = await prisma.source.findFirst({where:{id:sourceId}})
    console.log(`Cleaning up source: ${sourceId}`)
    

    await Promise.all([
        deleteVectors(sourceId, workspaceId),
        deleteSourceChunks(sourceId),
        deleteWorkspaceCache(workspaceId),
         source?.sourceType === 'PDF' && source.storagePath
        ? deletePdf(source.storagePath)
        : Promise.resolve()
    ])
    console.log(`Source ${sourceId} fully cleaned up`)
}