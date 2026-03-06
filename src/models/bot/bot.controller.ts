import { Update, Start, Ctx, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { GoogleGenerativeAI } from "@google/generative-ai";

@Update()
export class BotUpdate {

  private userMap = new Map<number, { model: string; time: number }>();

  private genAI = new GoogleGenerativeAI(process.env.AI_KEY as string);

  private availableModels = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
    "gemma-3-1b-it",
    "gemma-3-4b-it",
    "gemma-3-4b-it",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest"
  ];

  private cleanExpiredUsers() {
    const now = Date.now();

    for (const [userId, value] of this.userMap.entries()) {
      if (now - value.time > 10 * 60 * 1000) {
        this.userMap.delete(userId);
      }
    }
  }

  private async askGemini(userText: string, modelName: string) {

    try {

      const model = this.genAI.getGenerativeModel({
        model: modelName
      });

      const prompt = `
      Sen bot sifatida ishlaysan.

      1. Javob faqat o'zbek tilida.
      2. Javob kamida 50 ta so'z bo'lsin.
      3. Matnni chiroyli va tushunarli yoz.
      4. Foydalanuvchi savoli: ${userText}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      return response.text();

    } catch {
      return "Javob olishda xatolik.";
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {

    const chatId = ctx.chat?.id;
    const firstName = ctx.from?.first_name;

    if (!chatId) return;

    this.cleanExpiredUsers();

    if (!this.userMap.has(chatId)) {
      this.userMap.set(chatId, {
        model: "gemini-2.5-flash",
        time: Date.now()
      });
    }

    await ctx.reply(
      `Salom ${firstName}\nBotga xush kelibsiz!\n\n📌 Model tanlash uchun: /model \n💬 Savol berish uchun shunchaki yozing.`
    );
  }

  @On('text')
  async handleText(@Ctx() ctx: Context) {
  
    const chatId = ctx.chat?.id;
    if (!chatId) return;
  
    this.cleanExpiredUsers();
  
    const text = (ctx.message as any).text.trim();
  
    // Commandani tekshirish
    if (text.startsWith("/model")) {
  
      const menu = this.availableModels
        .map((m, i) => `${i + 1}. ${m}`)
        .join("\n");
  
      await ctx.reply(
        "👇 Model raqamini yuboring:\n\n" + menu
      );
  
      return;
    }
  
    const selectedIndex = parseInt(text);
  
    if (!isNaN(selectedIndex)) {
  
      const modelName = this.availableModels[selectedIndex - 1];
  
      if (modelName) {
  
        this.userMap.set(chatId, {
          model: modelName,
          time: Date.now()
        });
  
        await ctx.reply("✅ Model tanlandi: " + modelName);
        return;
      }
    }
  
    const userData = this.userMap.get(chatId) || {
      model: "gemini-2.5-flash",
      time: Date.now()
    };
  
    const answer = await this.askGemini(text, userData.model);
  
    await ctx.reply("🤖 Javob:\n\n" + answer);
  }
}