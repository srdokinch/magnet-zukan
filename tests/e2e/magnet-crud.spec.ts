import { expect, test } from "@playwright/test";

test.describe("マグネットCRUD MVP", () => {
  test.beforeEach(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const hasRealConfig =
      url.length > 0 &&
      key.length > 0 &&
      !url.includes("YOUR_PROJECT_ID") &&
      !key.includes("YOUR_SUPABASE_ANON_KEY");

    test.skip(!hasRealConfig, "Supabaseの実環境変数が未設定のためスキップします。");
  });

  test("投稿後に一覧と詳細で確認できる", async ({ page }) => {
    const unique = Date.now().toString();
    const name = `E2Eテストマグネット-${unique}`;
    const photoUrl = "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200";
    const category = "E2E";
    const placeName = "東京駅";
    const comment = "自動テストで登録したデータです";

    await page.goto("/magnet/new");

    await page.getByLabel("名前").fill(name);
    await page.getByLabel("写真URL（必須）").fill(photoUrl);
    await page.getByLabel("カテゴリ").fill(category);
    await page.getByLabel("購入場所").fill(placeName);
    await page.getByLabel("メモ").fill(comment);
    await page.getByRole("button", { name: "🧲 コレクションに追加" }).click();

    await expect(page).toHaveURL(/\/magnet\/.+/);
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(`カテゴリ: ${category}`)).toBeVisible();
    await expect(page.getByText(`購入場所: ${placeName}`)).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name })).toBeVisible();
  });
});
