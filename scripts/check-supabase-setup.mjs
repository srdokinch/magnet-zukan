import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missing = [];

if (!url || url.includes("YOUR_PROJECT_ID")) {
  missing.push("NEXT_PUBLIC_SUPABASE_URL");
}
if (!anonKey || anonKey.includes("YOUR_SUPABASE_ANON_KEY")) {
  missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

if (missing.length > 0) {
  console.error("❌ Supabase環境変数が未設定です:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function checkTable(name) {
  const { error } = await supabase.from(name).select("id", { count: "exact", head: true });
  if (error) {
    throw new Error(`${name}: ${error.message}`);
  }
}

try {
  await checkTable("magnets");
  await checkTable("fridge_layouts");
  await checkTable("magnet_positions");

  console.log("✅ Supabase接続OK");
  console.log("✅ 必須テーブル確認OK: magnets, fridge_layouts, magnet_positions");
} catch (error) {
  console.error("❌ Supabaseセットアップ確認に失敗しました。");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
