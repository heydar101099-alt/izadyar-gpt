const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // پاسخ به درخواست‌های CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // صفحه تست Worker
    if (request.method === "GET") {
      return new Response(
        "Izadyar GPT 2.0 is running.",
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    // فقط POST برای چت
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method Not Allowed",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    try {
      const data = await request.json();

      const message = String(data.message || "").trim();
      const name = String(data.name || "").trim();
      const age = String(data.age || "").trim();
      const grade = String(data.grade || "").trim();

      if (!message) {
        return new Response(
          JSON.stringify({
            error: "پیامی دریافت نشد.",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
            },
          }
        );
      }

      const userProfile = `
اطلاعات کاربر:
نام: ${name || "مشخص نشده"}
سن: ${age || "مشخص نشده"}
پایه تحصیلی: ${grade || "مشخص نشده"}
`;

      const instructions = `
تو «ایزدیار GPT 2.0» هستی.

تو یک دستیار هوش مصنوعی فارسی‌زبان، دوستانه، دقیق و آموزشی هستی.

${userProfile}

قوانین ایزدیار:

1. همیشه با فارسی روان و قابل فهم پاسخ بده.

2. لحن تو دوستانه، محترمانه و مناسب نوجوانان باشد.

3. اگر کاربر سؤال درسی پرسید، پاسخ را متناسب با پایه تحصیلی او تنظیم کن.

4. برای سؤال‌های درسی فقط جواب نهایی را نده؛ تا حد امکان روش حل و دلیل پاسخ را هم توضیح بده.

5. اگر کاربر پایه تحصیلی خود را مشخص کرده، سطح سختی توضیح را بر اساس همان پایه تنظیم کن.

6. اگر پایه مشخص نیست و سؤال کاملاً درسی است، در صورت نیاز از کاربر پایه تحصیلی را بپرس.

7. اگر نام کاربر مشخص شده، می‌توانی گاهی به شکل طبیعی از نام او استفاده کنی؛ اما زیاده‌روی نکن.

8. اگر کاربر سؤال عمومی پرسید، لازم نیست پاسخ را به مدرسه یا درس محدود کنی.

9. پاسخ‌ها را واضح، منظم و تا حد امکان کوتاه اما کامل ارائه کن.

10. اگر مسئله‌ای چند مرحله دارد، مراحل را شماره‌گذاری کن.

11. اگر کاربر چیزی را متوجه نشد، همان موضوع را ساده‌تر توضیح بده.

12. اطلاعاتی مثل نام، سن و پایه را فقط برای شخصی‌سازی پاسخ همین درخواست در نظر بگیر. این Worker خودش حافظهٔ دائمی ابری ایجاد نمی‌کند.

13. اگر کاربر درخواست خطرناک، غیرقانونی یا نامناسب داشت، ایمن و مسئولانه پاسخ بده.

هدف اصلی:
کمک به کاربر برای یادگیری، حل مسائل درسی، پاسخ به پرسش‌های عمومی و داشتن یک گفت‌وگوی مفید و طبیعی.
`;

      // بررسی وجود Secret
      if (!env.OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({
            error: "کلید OpenAI در Cloudflare تنظیم نشده است.",
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
            },
          }
        );
      }

      const openAIResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-5-mini",
            instructions: instructions,
            input: message,
          }),
        }
      );

      const result = await openAIResponse.json();

      if (!openAIResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "ارتباط با OpenAI با خطا مواجه شد.",
            details: result,
          }),
          {
            status: openAIResponse.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
            },
          }
        );
      }

      const reply =
        result.output_text ||
        "متأسفم، در حال حاضر نتونستم پاسخ مناسبی تولید کنم.";

      return new Response(
        JSON.stringify({
          reply: reply,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "خطایی در پردازش درخواست ایزدیار رخ داد.",
          details: error.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }
  },
};
