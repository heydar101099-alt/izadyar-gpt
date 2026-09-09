export default {
  async fetch(request, env) {
    // فقط درخواست‌های POST را قبول می‌کنیم
    if (request.method !== "POST") {
      return new Response("Izadyar GPT 2.0 is running.", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    try {
      const data = await request.json();

      const message = String(data.message || "").trim();
      const name = String(data.name || "").trim();
      const age = String(data.age || "").trim();
      const grade = String(data.grade || "").trim();

      if (!message) {
        return Response.json(
          { error: "پیامی دریافت نشد." },
          { status: 400 }
        );
      }

      const profile = `
نام کاربر: ${name || "نامشخص"}
سن: ${age || "نامشخص"}
پایه تحصیلی: ${grade || "نامشخص"}
`;

      const instructions = `
تو «ایزدیار GPT 2.0» هستی؛ یک دستیار هوش مصنوعی فارسی‌زبان، دوستانه، دقیق و آموزشی.

${profile}

قوانین مهم:
- با کاربر فارسی و روان صحبت کن.
- اگر سؤال درسی پرسید، توضیح را متناسب با پایه تحصیلی خودش تنظیم کن.
- جواب‌ها را آموزشی و قابل فهم بده، نه صرفاً جواب نهایی.
- اگر اطلاعات سن یا پایه مشخص نیست، در صورت مناسب بودن گفتگو از کاربر بپرس.
- در ابتدای اولین گفت‌وگو بهتر است نام، سن و پایهٔ تحصیلی کاربر مشخص شود.
- لحن دوستانه و مناسب دانش‌آموزان داشته باش.
- اگر سؤال خارج از درس بود، طبیعی و مفید پاسخ بده.
- اطلاعاتی را که کاربر در همین درخواست داده، در پاسخ خود در نظر بگیر.
`;

      const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-5-mini",
            instructions,
            input: message
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return Response.json(
          {
            error: "خطا در ارتباط با OpenAI",
            details: result
          },
          { status: response.status }
        );
      }

      return Response.json({
        reply: result.output_text || "متأسفم، نتونستم پاسخ مناسبی تولید کنم."
      });

    } catch (error) {
      return Response.json(
        {
          error: "خطای داخلی ایزدیار",
          details: error.message
        },
        { status: 500 }
      );
    }
  }
};
