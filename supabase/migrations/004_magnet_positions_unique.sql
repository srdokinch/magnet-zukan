-- 同一ユーザー・同一マグネットの配置が複数行あると PostgREST の maybeSingle が失敗する。
-- 重複を除去してから (user_id, magnet_id) で一意にする。

DELETE FROM magnet_positions
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, magnet_id
        ORDER BY id
      ) AS rn
    FROM magnet_positions
  ) ranked
  WHERE rn > 1
);

ALTER TABLE magnet_positions
ADD CONSTRAINT magnet_positions_user_magnet_key UNIQUE (user_id, magnet_id);
