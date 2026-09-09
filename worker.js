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

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // تست ساده Worker
    if (request.method === "GET") {
      return new Response(
        "Izadyar GPT 2.0 Worker is running.",
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
        {
          error: "Only POST requests are allowed.",
        },
        405
      );
    }

    try {

      const body = await request.json();

      const message =
        typeof body.message === "string"
          ? body.message.trim()
          : "";

      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";

      const age =
        typeof body.age === "string" ||
        typeof body.age === "number"
          ? String(body.age)
          : "";

      const grade =
        typeof body.grade === "string"
          ? body.grade.trim()
          : "";

      if (!message) {
        return jsonResponse(
          {
            error: "پیامی دریافت نشد.",
          },
          400
        );
      }

      if (!env.OPENAI_API_KEY) {
        return jsonResponse(
          {
            error:
              "OPENAI_API_KEY در Cloudflare تنظیم نشده است.",
          },
          500
        );
      }

      const instructions = `
تو «ایزدیار GPT 2.0» هستی.

تو یک دستیار هوش مصنوعی فارسی‌زبان، دوستانه و آموزشی هستی.

اطلاعات کاربر:
نام: ${name || "نامشخص"}
سن: ${age || "نامشخص"}
پایه تحصیلی: ${grade || "نامشخص"}

قوانین:
- همیشه فارسی روان و قابل فهم صحبت کن.
- لحن دوستانه، محترمانه و مناسب نوجوانان داشته باش.
- اگر سؤال درسی است، سطح توضیح را با توجه به پایه تحصیلی کاربر تنظیم کن.
- فقط جواب نهایی را نده؛ در مسائل آموزشی روش و دلیل را هم توضیح بده.
- اگر کاربر چیزی را متوجه نشد، ساده‌تر توضیح بده.
- اگر سؤال عمومی بود، پاسخ طبیعی و مفید بده.
- پاسخ‌ها را تا حد امکان منظم و قابل فهم بنویس.
`;

      const openAIResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization":
              `Bearer ${env.OPENAI_API_KEY}`,
          },

          body: JSON.stringify({
            model: "gpt-5-mini",
            instructions,
            input: message,
          }),
        }
      );

      const result = await openAIResponse.json();

      if (!openAIResponse.ok) {
        return jsonResponse(
          {
            error:
              "OpenAI درخواست را قبول نکرد.",
            details: result,
          },
          openAIResponse.status
        );
      }

      const reply =
        result.output_text ||
        "متأسفم، پاسخی دریافت نشد.";

      return jsonResponse({
        reply,
      });

    } catch (error) {

      return jsonResponse(
        {
          error:
            "خطایی در Worker رخ داد.",
          details:
            error instanceof Error
              ? error.message
              : String(error),
        },
        500
      );
    }
  },
};
