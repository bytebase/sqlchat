import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
import { NextRequest } from "next/server";
import { API_KEY } from "@/env";
import { openAIApiEndpoint, openAIApiKey, gpt35 } from "@/utils";

// Needs Edge for streaming response.
export const config = {
  runtime: "edge",
};

const getApiEndpoint = (apiEndpoint: string) => {
  const url = new URL(apiEndpoint);
  url.pathname = "/v1/chat/completions";
  return url;
};

const handler = async (req: NextRequest) => {
  if (API_KEY) {
    const auth = req.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${API_KEY}`) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Unauthorized.",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 401,
        }
      );
    }
  }

  const reqBody = await req.json();
  const openAIApiConfig = reqBody.openAIApiConfig;
  const apiKey = openAIApiConfig?.key || openAIApiKey;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "OpenAI API Key is missing. You can supply your own key via Settings.",
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 401,
      }
    );
  }

  // If client doesn't supply the OpenAI API key and our server supplies the key,
  // then we need to check the client quota.
  if (!openAIApiConfig?.key && openAIApiKey) {
    let user = reqBody.clientId;
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              "Please sign up account to get free quota or provide your own OpenAI key.",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 401,
        }
      );
    }
  }

  const currentUrl = new URL(req.url);
  const usageUrl = new URL(
    currentUrl.protocol + "//" + currentUrl.host + "/api/usage"
  );
  const usageRes = await fetch(usageUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "GET",
    // body: JSON.stringify({
    //   user: "foobar",
    // }),
  });
  if (!usageRes.ok) {
    return new Response(usageRes.body, {
      status: 500,
      statusText: usageRes.statusText,
    });
  }

  const usage = await usageRes.json();
  if (usage.current >= usage.limit) {
    return new Response(
      JSON.stringify({
        error: {
          message: `You have reached your monthly quota: ${usage.current}/${usage.limit}.`,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 401,
      }
    );
  }

  const apiEndpoint = getApiEndpoint(
    openAIApiConfig?.endpoint || openAIApiEndpoint
  );
  const remoteRes = await fetch(apiEndpoint, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: gpt35.name,
      messages: reqBody.messages,
      temperature: gpt35.temperature,
      frequency_penalty: gpt35.frequency_penalty,
      presence_penalty: gpt35.presence_penalty,
      stream: true,
      // Send end-user ID to help OpenAI monitor and detect abuse.
      user: req.ip,
    }),
  });
  if (!remoteRes.ok) {
    return new Response(remoteRes.body, {
      status: remoteRes.status,
      statusText: remoteRes.statusText,
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const streamParser = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta?.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };
      const parser = createParser(streamParser);
      for await (const chunk of remoteRes.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  // Increment usage count
  await fetch(usageUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      user: "foobar",
    }),
  });

  return new Response(stream);
};

export default handler;
