import 'dotenv/config'
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LLM_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const MAX_TOKENS = 2048;

//we stream aswer by chunk not send whole nswer once
export async function streamAnswer({
  systemPrompt,
  userPrompt,
  onToken,
  onTokenLogprobs,
  onDone,
  onError,
}) {
  try {
    const createStream = (includeLogprobs) => groq.chat.completions.create({
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
      ...(includeLogprobs ? { logprobs: true } : {}),
    });

    let stream;
    try {
      stream = await createStream(Boolean(onTokenLogprobs));
    } catch (err) {
      if (
        !onTokenLogprobs ||
        err?.status !== 400 ||
        !/logprobs/i.test(err.message ?? "")
      ) {
        throw err;
      }

      console.warn(
        "Groq model does not support logprobs; continuing evaluation without perplexity.",
      );
      stream = await createStream(false);
    }

    let fullAnswer = "";
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const smallContent = choice?.delta?.content || "";

      if (smallContent) {
        fullAnswer += smallContent;
        onToken(smallContent);

        if (onTokenLogprobs) {
          const tokenLogprobs = choice.logprobs?.content;
          onTokenLogprobs(
            Array.isArray(tokenLogprobs) && tokenLogprobs.length > 0
              ? tokenLogprobs.map((token) =>
                  Number.isFinite(token.logprob) ? token.logprob : null,
                )
              : [null],
          );
        }
      }

      if (choice?.finish_reason === "STOP") {
        break;
      }
    }

    //on done streaming
    await onDone(fullAnswer);
    return fullAnswer;
  } catch (err) {
    console.error("Groq stream error:", err.message);
    onError(err);
    throw err;
  }
}

//non streaming api calls- means used during faqs generation
export async function generateTextFAQs(systemPrompt, userPrompt, options = {}) {
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 400,
    messages: [
      { role: "user", content: userPrompt },
      { role: "system", content: systemPrompt },
    ],
    stream: false,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  });
  return response.choices[0]?.message?.content || "";
}
