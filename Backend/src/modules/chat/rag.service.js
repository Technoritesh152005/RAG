import { hybridSearch } from "../vector-store/pinecone.service.js";
import { generateTextFAQs } from "../chat/groq.service.js";
import {logUsage,estimateTokens} from '../analytics/usage.service.js'

export async function runRAGPipeline({
  question,
  workspaceId,
  onToken,
  onDone,
  onError,
  onMetadata,
}) {

  const startTime = Date.now();
  console.log("Rag Pipeline started for :"`${question}`);

  /* Step 1 : Hybrid search=> search through both vector and keyword postgres based search */
  const { results, confident, reason } = await hybridSearch(
    question,
    workspaceId,
  );

  /* Generating fallback answer */
  if (!confident || results.length == 0) {
    const fallbackAnswer = buildFallbackAnswer(reason, results, reason);

    //citation means the source of data means ur answer came that is okay but show me source
    onMetadata({
      citiations: [],
      hasContradiction: false,
      confident: false,
      reason,
    });

    onToken(fallbackAnswer);
    onDone(fallbackAnswer);
 // log even fallback responses — still a real request
    await logUsage({
      workspaceId,
      type: 'CHAT',
      embeddingTokens: estimateTokens(question),
      llmInputTokens: 0,
      llmOutputTokens: estimateTokens(fallbackAnswer),
      latencyMs: Date.now() - startTime,
      metadata: { confident: false, question }
    })
  }

  /* Step 3: CONTRADICTION DETECTION */
  /* After hybrid search gives you the top 5 chunks, check whether any of those chunks from different sources appear to make opposing claims.if they do we ask llm to generalize it */

  const contradiction = await detectContradiction(question, results);

  if (contradiction) {
    console.log("Contradiction found");

    console.log(`  Topic: ${contradiction.topic}`);

    console.log(
      `  ${contradiction.sideA.source}: ${contradiction.sideA.claim}`,
    );

    console.log(
      `  ${contradiction.sideB.source}: ${contradiction.sideB.claim}`,
    );
  }

  //step 5 : Build Prompt
  const { systemPrompt, userPrompt } = buildPrompt({
    question,
    results,
    contradiction,
  });

  /* Step 6 : get the response(STREAM ANSWER) */
  console.log("Streaming answer from GROQ");

  await streamAnswer({
    systemPrompt,
    userPrompt,
    onToken,
    onDone:async(complete)=>{

       await logUsage({
        workspaceId,
        type: 'CHAT',
        embeddingTokens: estimateTokens(question),
        llmInputTokens: estimateTokens(systemPrompt + userPrompt),
        llmOutputTokens: estimateTokens(completeAnswer),
        latencyMs: Date.now() - startTime,
        metadata: {
          confident: true,
          hasContradiction: !!contradiction,
          chunksUsed: results.length
        }
      })
      onDone(completeAnswer)
    },
    onError,
  });
}

function buildFallbackAnswer(question, results, reason) {
  if (results.length == 0) {
    return `
        I couldn't find relevant content for your question in the indexed documentation. 

This could mean:
- The documentation hasn't finished indexing yet
- Your question covers a topic not in the indexed pages
- Try rephrasing with more specific terms

You can also add more documentation sources to this workspace.
        `;
  }
  return;
  `
    I found some related content but my confidence is too low to give a reliable answer.

This usually means the indexed documentation doesn't directly address your question.

Try:
- Adding more specific documentation sources
- Rephrasing your question with exact API or function names
    `;
}

async function detectContradiction(question, results) {
  const uniquePages = new Set(results.map((r) => r.pageUrl));
  if (uniquePages < 2) {
    return null;
    //there will be no contradiction as pages has been less than 2(unique)
  }

  const contextForCheck = results
    .map((r, i) =>
      `
[Source ${i + 1}]
Page: ${r.pageTitle}
Section: ${r.sectionHeading}
URL: ${r.pageUrl}

Content:
${r.childText}
      `.trim(),
    )
    .join("\n\n---\n\n");

  const detectPrompt = `
    You are a documentation contradiction detector.

Your job is ONLY to determine whether the provided documentation
contains a genuine contradiction relevant to the user's question.

A genuine contradiction means:

Two sources make factually conflicting claims about the SAME
specific thing.

Do NOT classify these as contradictions:

- Different topics
- Different features
- Additional detail
- Compatible information
- Different examples
- Different conditions or scenarios
- One source providing more detail than another

Question:
"${question}"

Documentation:

${contextForCheck}

If there is NO genuine contradiction, respond with ONLY:

{
  "hasContradiction": false
}

If there IS a genuine contradiction, respond with ONLY:

{
  "hasContradiction": true,
  "topic": "...",
  "sideA": {
    "claim": "...",
    "source": "...",
    "version": "...",
    "deprecated": false
  },
  "sideB": {
    "claim": "...",
    "source": "...",
    "version": "...",
    "deprecated": false
  }
}

IMPORTANT RULES FOR VERSION:

- Return the version ONLY if it is explicitly mentioned
  in that source.
- Do not infer a version.
- If no version is explicitly mentioned, return null.

IMPORTANT RULES FOR DEPRECATION:

- Set deprecated=true ONLY if that source explicitly says
  the relevant feature/API/behavior is deprecated, removed,
  or no longer supported.
- Do not infer deprecation.
- Otherwise return false.

IMPORTANT:

Do NOT decide which source is correct.

Do NOT assume a higher version is automatically correct.

Do NOT resolve the contradiction.

Your job is only to accurately report both conflicting sides
and their explicitly stated version/deprecation context.
    `;

  let parsed;
  try {
    generateTextFAQs(
      "Return only valid JSON. No markdown. No explanation.",
      detectPrompt,
    );

    parsed = JSON.parse(
      raw
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, ""),
    );
  } catch (error) {
    console.error("Contradiction parsing Failed.", error.message);
    return null;
  }

  if (!parsed.hasContradiction) return null;

  //contradiction found. send the given message of disagremment
  return {
    topic: parsed.topic,
    sideA: {
      claim: parsed.sideA.claim,
      source: parsed.sideA.source,
      version: parsed.sideA.version ?? null,
      deprecated: parsed.sideA.deprecated === true,
    },
    sideB: {
      claim: parsed.sideB.claim,
      source: parsed.sideB.source,
      version: parsed.sideB.version ?? null,
      deprecated: parsed.sideB.deprecated === true,
    },
  };
}

//Prompt Builder
function buildPrompt({ question, results, contradiction }) {
  const contextBlock = results
    .map((r, i) =>
      `
[Source ${i + 1}]
Page: ${r.pageTitle}
Section: ${r.sectionHeading}
URL: ${r.pageUrl}

Content:
${r.parentText}
      `.trim(),
    )
    .join("\n\n---\n\n");

  let contradictionInstruction = "";

  if (contradiction) {
    contradictionInstruction = `
    IMPORTANT: The indexed documentation contains conflicting
information about "${contradiction.topic}".

Do NOT silently choose one source.

Do NOT merge the conflicting claims into a single statement.

Present the disagreement clearly.

Source ${contradiction.sideA.source} says:
"${contradiction.sideA.claim}"

Version explicitly stated by this source:
${contradiction.sideA.version ?? "Not specified"}

Deprecation status explicitly stated by this source:
${contradiction.sideA.deprecated ? "Deprecated/removed/not supported" : "Not marked as deprecated"}

Source ${contradiction.sideB.source} says:
"${contradiction.sideB.claim}"

Version explicitly stated by this source:
${contradiction.sideB.version ?? "Not specified"}

Deprecation status explicitly stated by this source:
${contradiction.sideB.deprecated ? "Deprecated/removed/not supported" : "Not marked as deprecated"}

There is no automatic rule that determines which conflicting
source is correct.

Explain both sides and include their version/deprecation context
when relevant.

If the documentation does not provide enough information to
determine which applies to the user's situation, explicitly say
that the documentation is inconsistent and that the user should
verify which version/context applies.
    `;
  }

  //if not contradiction no need for contradiction prompt
 const systemPrompt = `You are a precise documentation assistant.
Your job is to answer questions using ONLY the provided documentation context.

Rules you must follow:
1. Answer ONLY using the provided context. Never use outside knowledge.
2. If the answer is not in the context, say exactly: "I couldn't find this in the indexed documentation."
3. Always cite which source (Source 1, Source 2, etc.) your answer comes from.
4. Keep answers clear and developer-friendly.
5. Preserve code examples exactly as they appear in the context.
6. Do not make up APIs, functions, or behaviors not mentioned in the context.

ABSENCE HANDLING — this is critical:
7. If the question asks whether something is supported, exists, or is possible
   (e.g. "does X support Y", "can I do Z", "is there a way to..."), and the context
   does NOT explicitly confirm or deny it, do NOT assume the answer is yes or no.
   Say clearly: "The documentation does not explicitly state whether this is supported."
8. Never treat silence in the documentation as confirmation of a feature's existence.
   Absence of a mention is not evidence of absence OR presence — say so plainly.
9. Only confirm "yes it supports X" or "no it does not" when the context contains
   an explicit statement to that effect.
${contradictionInstruction}`

  const userPrompt = `
Documentation Context:

${contextBlock}

Question: ${question}

Answer based strictly on the documentation above:
`;

  return {
    systemPrompt,
    userPrompt,
  };
}
