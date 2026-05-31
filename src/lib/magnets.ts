export type Magnet = {
  id: string;
  name: string | null;
  photo_url: string;
  category: string | null;
  tags: string[] | null;
  comment: string | null;
  place_name: string | null;
  purchased_at?: string | null;
  created_at: string | null;
};
