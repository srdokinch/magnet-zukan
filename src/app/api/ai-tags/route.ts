import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { imageUrl?: string };

    if (!body.imageUrl) {
      return NextResponse.json(
        { message: "imageUrlは必須です。" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      tags: ["旅行", "お土産", "マグネット"],
    });
  } catch {
    return NextResponse.json(
      { message: "AIタグ生成に失敗しました。" },
      { status: 500 },
    );
  }
}
