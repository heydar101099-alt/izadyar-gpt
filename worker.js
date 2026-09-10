const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function sendRubikaMessage(token, chatId, text, replyToMessageId = null) {
  const url =
    `https://botapi.rubika.ir/v3/${token}/sendMessage`;

  const body = {
    chat_id: chatId,
    text,
  };

  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Rubika sendMessage failed: ${JSON.stringify(result)}`
    );
  }

  return result;
}

async function askOpenAI(apiKey, message, name, age, grade) {
  const instructions = `
تو «ایزدیار جی‌پی‌تی» هستی.

تو یک دستیار هوش مصنوعی فارسی‌زبان، دوستانه و آموزشی هستی.

اطلاعات کاربر:
نام: ${name || "نامشخص"}
سن: ${age || "نامشخص"}
پایه تحصیلی: ${grade || "نامشخص"}

قوانین:
- فارسی روان و قابل فهم صحبت کن.
- لحن دوستانه و محترمانه داشته باش.
- اگر سؤال درسی است، سطح توضیح را با پایه کاربر هماهنگ کن.
- در مسائل آموزشی، روش حل و دلیل را هم توضیح بده.
- اگر کاربر چیزی را متوجه نشد، ساده‌تر توضیح بده.
- اگر سؤال عمومی بود، پاسخ طبیعی و مفید بده.
- پاسخ‌ها را منظم و قابل فهم بنویس.
`;

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        instructions,
        input: message,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed: ${JSON.stringify(result)}`
    );
  }

  return (
    result.output_text ||
    "متأسفم، نتونستم پاسخ مناسبی آماده کنم."
  );
}

export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // تست سلامت Worker
    if (request.method === "GET") {
      return new Response(
        "Izadyar GPT Worker is running.",
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { error: "Only POST requests are allowed." },
        405
      );
    }

    try {
      if (!env.RUBIKA_BOT_TOKEN) {
        return jsonResponse(
          { error: "RUBIKA_BOT_TOKEN تنظیم نشده است." },
          500
        );
      }

      if (!env.OPENAI_API_KEY) {
        return jsonResponse(
          { error: "OPENAI_API_KEY تنظیم نشده است." },
          500
        );
      }

      const body = await request.json();

      const update = body?.update;

      if (!update) {
        return jsonResponse({
          ok: true,
          ignored: true,
          reason: "No update object",
        });
      }

      // فقط پیام‌های جدید
      if (update.type !== "NewMessage") {
        return jsonResponse({
          ok: true,
          ignored: true,
          reason: "Not a NewMessage event",
        });
      }

      const chatId = update.chat_id;

      const newMessage = update.new_message;

      const message =
        typeof newMessage?.text === "string"
          ? newMessage.text.trim()
          : "";

      const messageId = newMessage?.message_id || null;

      if (!chatId || !message) {
        return jsonResponse({
          ok: true,
          ignored: true,
          reason: "Message has no text or chat_id",
        });
      }

      // پاسخ اولیه برای تست اتصال
      if (
        message === "/start" ||
        message === "شروع"
      ) {
        await sendRubikaMessage(
          env.RUBIKA_BOT_TOKEN,
          chatId,
          "🤖 سلام! من ایزدیار جی‌پی‌تی هستم.\n\nسؤالت رو بپرس تا کمکت کنم.",
          messageId
        );

        return jsonResponse({
          ok: true,
          handled: "start",
        });
      }

      // ارسال پیام به OpenAI
      const reply = await askOpenAI(
        env.OPENAI_API_KEY,
        message,
        "",
        "",
        ""
      );

      // ارسال پاسخ AI به روبیکا
      await sendRubikaMessage(
        env.RUBIKA_BOT_TOKEN,
        chatId,
        reply,
        messageId
      );

      return jsonResponse({
        ok: true,
        handled: "ai",
      });

    } catch (error) {
      console.error(error);

      return jsonResponse(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
        500
      );
    }
  },
};
