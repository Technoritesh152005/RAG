import 'dotenv/config'
import { Pinecone } from '@pinecone-database/pinecone'

//creating instance of pinecone client
const pinecone = new Pinecone({
    apiKey : process.env.PINECONE_API_KEY
})

//function to get the index of pinecone
export  const getPineconeIndex =()=>{
    return pinecone.index(process.env.PINECONE_INDEX)
}

export default pinecone