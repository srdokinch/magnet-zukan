CREATE TABLE magnets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id),
  photo_url     text NOT NULL,
  name          text,
  category      text,
  tags          text[],
  comment       text,
  place_name    text,
  latitude      float,
  longitude     float,
  price         integer,
  purchased_at  date,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE fridge_layouts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) UNIQUE,
  theme      text DEFAULT 'white',
  size       text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE magnet_positions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id),
  magnet_id  uuid REFERENCES magnets(id),
  x          float NOT NULL,
  y          float NOT NULL,
  rotation   float DEFAULT 0,
  z_index    integer DEFAULT 0
);
