import { expect, test } from "@playwright/test";

test.describe("マグネットCRUD", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __MAGNET_ZUKAN_E2E__?: boolean }).__MAGNET_ZUKAN_E2E__ =
        true;
    });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const hasRealConfig =
      url.length > 0 &&
      key.length > 0 &&
      !url.includes("YOUR_PROJECT_ID") &&
      !key.includes("YOUR_SUPABASE_ANON_KEY");

    test.skip(!hasRealConfig, "Supabaseの実環境変数が未設定のためスキップします。");
  });

  test("投稿・編集・削除を一連で実行できる", async ({ page }) => {
    const unique = Date.now().toString();
    const name = `E2Eテストマグネット-${unique}`;
    const updatedName = `${name}-更新`;
    const category = "E2E";
    const updatedCategory = "E2E更新";
    const placeName = "東京駅";
    const comment = "自動テストで登録したデータです";
    const updatedComment = "編集後のコメントです";

    await page.goto("/magnet/new");

    // ルート不整合やサーバー未起動時に404待ちでタイムアウトしないよう、先に画面状態を明示チェックする
    if (await page.getByRole("heading", { name: "404" }).isVisible()) {
      throw new Error("`/magnet/new` が404です。開発サーバー起動状態とルーティングを確認してください。");
    }
    await expect(page.getByRole("heading", { name: "新規投稿" })).toBeVisible({
      timeout: 60000,
    });

    await page.getByLabel("名前").fill(name);
    await page.getByLabel("カテゴリ").fill(category);
    await page.getByLabel("購入場所").fill(placeName);
    await page.getByLabel("メモ").fill(comment);
    await page.getByRole("button", { name: /#陶器 ＋/ }).click();
    await page.getByRole("button", { name: "🧲 コレクションに追加" }).click();

    await expect(page).toHaveURL(/\/magnet\/.+/);
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(`カテゴリ: ${category}`)).toBeVisible();
    await expect(page.getByText(`購入場所: ${placeName}`)).toBeVisible();

    await page.getByRole("link", { name: "編集する" }).click();
    await expect(page).toHaveURL(/\/magnet\/.+\/edit/);
    await expect(page.getByRole("heading", { name: "マグネット編集" })).toBeVisible();
    await page.getByLabel("名前").fill(updatedName);
    await page.getByLabel("カテゴリ").fill(updatedCategory);
    await page.getByLabel("メモ").fill(updatedComment);
    await page.getByRole("button", { name: "更新する" }).click();

    await expect(page).toHaveURL(/\/magnet\/.+/);
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(`カテゴリ: ${updatedCategory}`)).toBeVisible();
    await expect(page.getByText(`メモ: ${updatedComment}`)).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: updatedName })).toBeVisible();

    await page.getByRole("button", { name: "タグ 陶器 で絞り込み" }).click();
    await expect(page.getByRole("link", { name: updatedName })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.goto("/");
    await page.getByRole("link", { name: updatedName }).click();
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: updatedName })).toHaveCount(0);
  });
});
