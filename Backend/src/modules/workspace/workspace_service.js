import prisma from "../../lib/prisma"; 
import { cleanupWorkspace } from './cleanup.service.js'

export  async function createWorkspace({name,userId , description}){

    return prisma.workspace.create({
        data: {name,description,userId}
    })
}

export function getWorkspace(userId){

    return prisma.workspace.findMany({
        where:{userId},
        include:{
            // i think while getting workspace we also show what workspace is this means of what source it is like which like so source is selected

            sources:{select:{id:true , status:true}},
            _count : {select:{messages:true}}
        },
        orderBy:{createdAt:'desc'}
    })
}

export function getWorkspaceById (id , userId){
    // return first matching record
    const workspace = prisma.workspace.findFirst({
        where:{id, userId},
        include:{sources:true}

    })
    if(!workspace)throw new Error("No Workspace Found")
        return workspace
}

export async function deleteWorkspace(id, userId) {
  const workspace = await prisma.workspace.findFirst({
    where: { id, userId }
  })
  if (!workspace) throw new Error('Workspace not found')

  // cleanup external data first
  await cleanupWorkspace(id)

  // then delete from DB — cascade handles sources/messages
  return prisma.workspace.delete({ where: { id } })
}

export async function updateWorkspace (userId,id, data){
    const work = await prisma.workspace.findFirst({
        where:{userId, id}
    })
    if(!work) throw new Error("No Workspace found")
    
        return prisma.workspace.update({
            where:{id},
            data
        })
    
}

export async function workspaceStats(workspaceId, userId){
    const workspace = await prisma.workspace.findUnique({
        where:{
            id:workspaceId,
            userId
        }
    })

    if(!workspace){throw new Error('No workspace found to show its stats')}

    const {sources, chunkCount, messageCount, faqCount} = await promise.all([
        prisma.source.findMany({
            where:{
                workspaceId
            },
            select:{
                id:true,
                status:true,
                pageCount:true,
                chunkCount:true,
                url:true
            }
        }),
        prisma.chunk.count({
            where:{
                workspaceId
            }
        }),
        prisma.message.count({
            where:{
                workspaceId
            }
        }),
        prisma.FAQ.count({
            where:{
                workspaceId
            }
        })
    ])

     // calculate totals
  const totalPages = sources.reduce((sum, s) => sum + (s.pageCount || 0), 0)
  const doneSources = sources.filter(s => s.status === 'DONE').length
  const failedSources = sources.filter(s => s.status === 'FAILED').length
  const pendingSources = sources.filter(s =>
    ['PENDING', 'SCRAPING', 'CHUNKING', 'EMBEDDING'].includes(s.status)
  ).length

  return {
    workspaceId,
    sources: {
      total: sources.length,
      done: doneSources,
      failed: failedSources,
      pending: pendingSources
    },
    totalPages,
    totalChunks: chunkCount,
    totalMessages: messageCount,
    totalFAQs: faqCount
}