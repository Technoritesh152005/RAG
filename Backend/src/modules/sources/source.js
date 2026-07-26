// 
// here after creating workspace u trgger the job in queue
import prisma from '../../lib/prisma.js'
import {addIngestionQueue, ingestionQueue} from '../jobs/queue.js'

export async function addSource({url , workspaceId , userId}){

    const workspace = await prisma.workspace.findUnique({
        where:{
            id:workspaceId,
            userId
        }
    })
    if(!workspace) throw new Error('Workspace Not Found')
    
    const source = await prisma.source.create({
        data:{
            url:url,
            workspaceId,
            status:'PENDING'
        }
    })

    // once u saved the job in db push the job in queue so that worker starts the process of executing it
    await addIngestionQueue(
        {
            sourceId:source.id,
            workspaceId,
            url
        }
    )
    return source;
}

export async function getSource(workspaceId , userId){

    const workspace = await prisma.workspace.findUnique({
        where:{
            id:workspaceId,
            userId
        }
    })
    if(!workspace) throw new Error('Worspace not found')

    // find the source all
    return  prisma.source.findMany({
        where:{
            workspaceId
        },
        // returns the latest source
        orderBy:{createdAt:'desc'}
    })
}

export async function deleteSource(sourceId , userId){
    const source = await prisma.source.findUnique({
        where:{
            id:sourceId,
            workspace:{userId}
        },
        include:{workspace:true}
    })

    if(!source) throw new Error('Sourc not found')
        return prisma.source.delete({
    where:{
        id:sourceId
    }})

}

// reindex means once again start the ingestion process
export async function reIndexSource(sourceId, userId){
    const source = await prisma.source.findFirst({
        where:{
            id:sourceId,
            workspaceId:{userId}
        },
    })
    if(!source)throw new Error('No Source found for re-indexing')
    const updatedSource = await prisma.source.updateMany({
        where:{id:sourceId},
        data:{
            status:'PENDING',
            pageCount:null,
            chunkCount : null,
            error:null
        }
    })

    await ingestionQueue({
        sourceId:source.id,
        workspaceId:source.workspaceId,
        url:source.url
    })
}

export async function updateSourceStatus(sourceId , status , extraFields = {}){

    return prisma.source.update({
        where:{id:sourceId},
        data:{status , ...extraFields}
    })
}