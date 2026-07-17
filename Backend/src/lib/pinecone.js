import {Pinecone} from 'pinecone-database/pinecone'

const Pinecone = new Pinecone({
    apiKey : process.env.PINECONE_API_KEY
})

export  const getPineconeIndex =()=>{
    return Pinecone.index(process.env.PINECONE_INDEX)
}

export default Pinecone