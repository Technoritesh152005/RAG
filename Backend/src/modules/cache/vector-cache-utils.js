
import crypto from 'crypto'

//encode the vector in base64 format
export  function encodeVector(embedding){
    const float32 = new Float32Array(embedding)
    return Buffer.from(float32.buffer).toString('base64')
}
export function decodeVector(base64){
    const buffer = Buffer.from(base64,'base64')
    return new Float32Array(buffer.buffer, buffer.byteOffset , buffer.length /4)

}

//as the data are small use cosine similarity
export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}



export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}