import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LLM_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const MAX_TOKENS = 1024;

//we stream aswer by chunk not send whole nswer once
export async function streamAnswer({
  systemPrompt,
  userPrompt,
  onToken,
  onDone,
  onError,
}) {
  try {
    const stream = await groq.chat.completions.create({
      model: LLM_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      stream: true,
    });

    let fullAnswer = "";
    for await (const chunk of stream) {
      const smallContent = chunk.choices[0]?.delta?.content || "";

      if (smallContent) {
        fullAnswer += smallContent;
      }

      if (chunk.choices[0]?.finish_reason === "STOP") {
        break;
      }
    }

    //on done streaming
    onDone(fullAnswer);
    return fullAnswer;
  } catch (err) {
    console.error("Groq stream error:", err.message);
    onError(err);
    throw err;
  }
}

//non streaming api calls- means used during faqs generation
export async function generateTextFAQs(systemPrompt, userPrompt) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
    max_tokens: 700,
    messages: [
      { role: "user", content: userPrompt },
      { role: "system", content: systemPrompt },
    ],
    stream:false
  });
  return response.choices[0]?.delta?.content || "";
}
