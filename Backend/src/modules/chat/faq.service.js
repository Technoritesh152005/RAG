import prisma from '../../lib/prisma.js'
import { generateText } from './groq.service.js'
import { getUserQuestions, getMessageCount } from './chat.service.js'
import { runRAGPipeline } from './rag.service.js'

// trigger FAQ generation after every 10 user questions
const FAQ_TRIGGER_THRESHOLD = 10

// check if FAQ should be regenerated
export async function checkAndGenerateFAQ(workspaceId) {
  try {
    const questionCount = await getMessageCount(workspaceId)

    // only generate when threshold is hit
    // 10, 20, 30... questions
    if (questionCount % FAQ_TRIGGER_THRESHOLD !== 0) return

    console.log(`FAQ trigger: ${questionCount} questions in workspace ${workspaceId}`)

    // generate in background — dont block chat response
    generateFAQ(workspaceId).catch(err => {
      console.error('FAQ generation error:', err.message)
    })
  } catch (err) {
    console.error('FAQ check error:', err.message)
  }
}

export async function generateFAQ(workspaceId) {
  console.log(`Generating FAQ for workspace ${workspaceId}`)

  // get recent user questions
  const questions = await getUserQuestions(workspaceId)
  if (questions.length < 5) return

  // ask Groq to extract the most common/important questions
  const systemPrompt = `You are a documentation assistant analyzing user questions.
Your job is to identify the 5 most frequently asked or most important questions from a list.
Return ONLY a JSON array of strings — the top 5 questions, cleaned up and rephrased clearly.
Example output: ["How do I install X?", "What is Y?"]
Return nothing else — no preamble, no explanation, just the JSON array.`

  const userPrompt = `Here are the questions users have been asking:

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Extract the 5 most common or important questions as a JSON array.`

  let topQuestions = []

  try {
    const response = await generateText(systemPrompt, userPrompt)
    topQuestions = JSON.parse(response.trim())
    if (!Array.isArray(topQuestions)) throw new Error('Not an array')
  } catch (err) {
    console.error('FAQ question extraction failed:', err.message)
    // fallback — just use first 5 questions directly
    topQuestions = questions.slice(0, 5)
  }

  // generate answer for each top question using RAG
  const faqs = []

  for (const question of topQuestions) {
    try {
      let answer = ''

      await runRAGPipeline({
        question,
        workspaceId,
        onMetadata: () => {},  // ignore metadata for FAQ generation
        onToken: (token) => { answer += token },
        onDone: () => {},
        onError: (err) => { console.error(`FAQ answer error: ${err.message}`) }
      })

      if (answer && answer.length > 50) {
        faqs.push({ question, answer })
      }
    } catch (err) {
      console.error(`Failed to generate FAQ answer for: ${question}`)
    }
  }

  // save FAQs to DB — upsert by question text
  for (const faq of faqs) {
    await prisma.fAQ.upsert({
      where: {
        // use a composite approach
        id: generateFAQId(workspaceId, faq.question)
      },
      update: {
        answer: faq.answer
      },
      create: {
        id: generateFAQId(workspaceId, faq.question),
        workspaceId,
        question: faq.question,
        answer: faq.answer
      }
    })
  }

  console.log(`FAQ generated: ${faqs.length} questions for workspace ${workspaceId}`)
  return faqs
}

export async function getFAQs(workspaceId, userId) {
  // verify ownership
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId }
  })
  if (!workspace) throw new Error('Workspace not found')

  return prisma.fAQ.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' }
  })
}

export async function deleteFAQs(workspaceId) {
  await prisma.fAQ.deleteMany({ where: { workspaceId } })
}

function generateFAQId(workspaceId, question) {
  // deterministic ID from workspace + question
  return require('crypto')
    .createHash('md5')
    .update(`${workspaceId}-${question}`)
    .digest('hex')
}