import 'dotenv/config'
import { pipeline } from '@huggingface/transformers'

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'
const EMBEDDING_DIMENSION = 384
const LOCAL_BATCH_SIZE = 16

function cleanText(text) {
  return text.replace(/\n/g, ' ').trim()
}

let extractorPromise

function getExtractor() {
  extractorPromise ??= pipeline('feature-extraction', EMBEDDING_MODEL)
  return extractorPromise
}

async function embedTexts(texts) {
  const extractor = await getExtractor()
  const embeddings = []

  for (let i = 0; i < texts.length; i += LOCAL_BATCH_SIZE) {
    const batch = texts.slice(i, i + LOCAL_BATCH_SIZE).map(cleanText)
    const output = await extractor(batch, {
      pooling: 'mean',
      normalize: true,
    })
    embeddings.push(...output.tolist())
  }

  return embeddings
}

export async function embeddingText(text) {
  const [embedding] = await embedTexts([text])
  return embedding
}

export async function embeddingBatches(texts) {
  if (!texts || texts.length === 0) return []

  console.log(`Local embedding ${texts.length} texts`)
  const embeddings = await embedTexts(texts)

  if (
    embeddings.length !== texts.length ||
    embeddings.some((embedding) => embedding.length !== EMBEDDING_DIMENSION)
  ) {
    throw new Error(
      `Local model returned ${embeddings.length} embeddings; expected ${texts.length} vectors of dimension ${EMBEDDING_DIMENSION}`,
    )
  }

  console.log(`Embedded ${embeddings.length} texts successfully`)
  return embeddings
}
