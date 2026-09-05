import {PrismaClient} from '@prisma/client'

//
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma?? new PrismaClient({
    log:['error']
})

//u dont set prisma to globalThis in production because it can cause issues with multiple instances of PrismaClient being created. In development, we set it to globalThis so that we can reuse the same instance across hot reloads.
if(process.env.NODE_ENV != 'production'){
    globalForPrisma.prisma = prisma
}

export default prisma
// We use the Singleton pattern so the entire application shares one PrismaClient. We store it in globalThis only in development because hot reloading recreates modules and could otherwise create multiple PrismaClient instances. I