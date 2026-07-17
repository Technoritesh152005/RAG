import prisma from "../../lib/prisma"; 

export  function creatWorkspace({name,userId , description}){

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

export async function deleteWorkspace(id, userId){
    const work = await prisma.workspace.findFirst({
        where:{id,userId}
    })

    if(!work) throw new Error('Workspace not found to delete')

    return prisma.workspace.delete({
        where:{id}
    })
}

export async function updateWorkspace (userId , id , data){
    const work = prisma.workspace.findFirst({
        where:{userId, id}
    })
    if(!work) throw new Error("No Workspace found")
    
        return prisma.workspace.update({
            where:{id},
            data
        })
    
}