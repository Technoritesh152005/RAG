import {deleteVectors,deleteWorkspaceVectors} from '../vector-store/pinecone.service.js'
import {deleteWorkspaceChunks, deleteSourceChunks} from '../vector-store/fullTextSearch.service.js'
import {deleteFAQs} from '../chat/faq.service.js'
import prisma from '../../lib/prisma.js'

//when deleted workspace so delete all vectors and chunks. this basically links or bring each service together
export async function cleanUpWorkspace(workspaceId){

    console.log(`The workspace vectors and chunks deletion process is getting started`)

    await Promise.all([
        deleteWorkspaceChunks(workspaceId),
        deleteWorkspaceVectors(workspaceId),
        deleteFAQs(workspaceId)
    ])

     console.log(`Workspace ${workspaceId} fully cleaned up`)
}

//cleanup when a single source is deleted
export async function cleanUpSource(sourceId, workspaceId){
    console.log(`Cleaning up source: ${sourceId}`)

    await promise.all([
        deleteVectors(sourceId, workspaceId),
        deleteSourceChunks(sourceId)
    ])
    console.log(`Source ${sourceId} fully cleaned up`)
}