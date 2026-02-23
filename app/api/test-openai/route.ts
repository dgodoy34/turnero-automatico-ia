import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Respondé solo con la palabra OK" },
        { role: "user", content: "Hola" }
      ],
      temperature: 0
    });

    return NextResponse.json({
      success: true,
      response: completion.choices[0].message.content
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}