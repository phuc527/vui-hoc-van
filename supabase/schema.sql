-- Vui học cùng bé – schema + RLS + seed
-- Chạy toàn bộ file này trong Supabase Dashboard → SQL Editor → New query → Run.
-- Có thể chạy lại nhiều lần (idempotent).

-- ============ TABLES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  role text not null default 'student' check (role in ('student','teacher')),
  created_at timestamptz default now()
);

create table if not exists public.units (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('am','van','thanh')),
  subtype text, -- am: chinh | phu | ghep
  value text not null,
  title text,
  order_index int not null default 0,
  published boolean not null default true,
  unique (kind, value)
);

create table if not exists public.words (
  id bigint generated always as identity primary key,
  text text unique not null,
  emoji text,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists public.unit_words (
  unit_id bigint references public.units on delete cascade,
  word_id bigint references public.words on delete cascade,
  primary key (unit_id, word_id)
);

create table if not exists public.lessons (
  id bigint generated always as identity primary key,
  number int unique not null,
  title text not null,
  order_index int not null default 0
);

create table if not exists public.exercises (
  id bigint generated always as identity primary key,
  unit_id bigint references public.units on delete cascade,
  lesson_id bigint references public.lessons on delete cascade,
  type text not null check (type in ('read','trace','true_false','build','pick_tone','rhyme_grid','star_words','passage')),
  title text not null,
  config jsonb not null default '{}',
  order_index int not null default 0
);

create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  exercise_id bigint not null references public.exercises on delete cascade,
  score int not null check (score between 0 and 100),
  stars int not null check (stars between 0 and 3),
  created_at timestamptz default now()
);

-- ============ AUTH TRIGGER ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

-- ============ ĐUA RANK (bảng xếp hạng) ============
-- Học sinh không đọc được attempts của bạn khác (RLS) → hàm security definer chỉ trả tên + tổng sao.
-- p_days = null: mọi lúc; 7: tuần này.
create or replace function public.leaderboard(p_days int default null)
returns table (user_id uuid, display_name text, username text, stars bigint, exercises bigint)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(p.display_name, p.username), p.username, sum(b.best)::bigint, count(*)::bigint
  from public.profiles p
  join (
    select a.user_id, a.exercise_id, max(a.stars) as best
    from public.attempts a
    where p_days is null or a.created_at > now() - make_interval(days => p_days)
    group by a.user_id, a.exercise_id
  ) b on b.user_id = p.id
  where p.role = 'student'
  group by p.id
  order by 4 desc, 5 desc, 2
  limit 50;
$$;
revoke all on function public.leaderboard(int) from public, anon;
grant execute on function public.leaderboard(int) to authenticated;

-- ============ RLS ============
alter table public.profiles   enable row level security;
alter table public.units      enable row level security;
alter table public.words      enable row level security;
alter table public.unit_words enable row level security;
alter table public.lessons    enable row level security;
alter table public.exercises  enable row level security;
alter table public.attempts   enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_teacher());
drop policy if exists "profiles update own" on public.profiles;
-- học sinh chỉ sửa tên hiển thị; không tự nâng role (kiểm tra role giữ nguyên)
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['units','words','unit_words','lessons','exercises'] loop
    execute format('drop policy if exists "content read" on public.%I', t);
    execute format('create policy "content read" on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists "content write" on public.%I', t);
    execute format('create policy "content write" on public.%I for all to authenticated using (public.is_teacher()) with check (public.is_teacher())', t);
  end loop;
end $$;

drop policy if exists "attempts insert own" on public.attempts;
create policy "attempts insert own" on public.attempts for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "attempts read" on public.attempts;
create policy "attempts read" on public.attempts for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('word-images', 'word-images', true)
  on conflict (id) do nothing;
drop policy if exists "word images read" on storage.objects;
create policy "word images read" on storage.objects for select using (bucket_id = 'word-images');
drop policy if exists "word images write" on storage.objects;
create policy "word images write" on storage.objects for insert to authenticated
  with check (bucket_id = 'word-images' and public.is_teacher());
drop policy if exists "word images delete" on storage.objects;
create policy "word images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'word-images' and public.is_teacher());

-- ============ SEED ============
-- Âm chính (nguyên âm)
insert into public.units (kind, subtype, value, order_index) values
 ('am','chinh','a',1),('am','chinh','ă',2),('am','chinh','â',3),('am','chinh','e',4),('am','chinh','ê',5),
 ('am','chinh','i',6),('am','chinh','o',7),('am','chinh','ô',8),('am','chinh','ơ',9),('am','chinh','u',10),
 ('am','chinh','ư',11),('am','chinh','y',12)
on conflict do nothing;
-- Âm phụ (phụ âm)
insert into public.units (kind, subtype, value, order_index) values
 ('am','phu','b',1),('am','phu','c',2),('am','phu','d',3),('am','phu','đ',4),('am','phu','g',5),('am','phu','h',6),
 ('am','phu','k',7),('am','phu','l',8),('am','phu','m',9),('am','phu','n',10),('am','phu','p',11),('am','phu','q',12),
 ('am','phu','r',13),('am','phu','s',14),('am','phu','t',15),('am','phu','v',16),('am','phu','x',17)
on conflict do nothing;
-- Phụ âm ghép
insert into public.units (kind, subtype, value, order_index) values
 ('am','ghep','ch',1),('am','ghep','gh',2),('am','ghep','gi',3),('am','ghep','kh',4),('am','ghep','ng',5),
 ('am','ghep','ngh',6),('am','ghep','nh',7),('am','ghep','ph',8),('am','ghep','qu',9),('am','ghep','th',10),('am','ghep','tr',11)
on conflict do nothing;
-- Vần
insert into public.units (kind, value, order_index) values
 ('van','ac',1),('van','ăc',2),('van','âc',3),('van','oc',4),('van','ôc',5),('van','uc',6),('van','ưc',7),
 ('van','at',8),('van','ăt',9),('van','ât',10),('van','ot',11),('van','ôt',12),('van','ơt',13),('van','ut',14),('van','ưt',15),
 ('van','an',16),('van','am',17),('van','eo',18),('van','ưa',19)
on conflict do nothing;
-- Thanh
insert into public.units (kind, value, title, order_index) values
 ('thanh','ngang','Thanh ngang',1),('thanh','sắc','Thanh sắc ( ´ )',2),('thanh','huyền','Thanh huyền ( ` )',3),
 ('thanh','hỏi','Thanh hỏi ( ̉ )',4),('thanh','ngã','Thanh ngã ( ˜ )',5),('thanh','nặng','Thanh nặng ( . )',6)
on conflict do nothing;

-- Từ minh hoạ (emoji làm hình tạm, giáo viên có thể upload ảnh thật)
insert into public.words (text, emoji) values
 ('bà','👵'),('cá','🐟'),('gà','🐔'),('mèo','🐱'),('bò','🐄'),('hoa','🌸'),('nhà','🏠'),('xe','🚲'),
 ('ghế','🪑'),('nghé','🐃'),('khế','⭐'),('quả na','🍈'),('chó','🐕'),('thỏ','🐇'),('trâu','🐃'),('phở','🍜'),
 ('lọ mực','🖋️'),('cột mốc','🪧'),('hạt thóc','🌾'),('xúc xắc','🎲'),('gót chân','🦶'),('đôi mắt','👀'),
 ('quả ớt','🌶️'),('bật lửa','🔥'),('giấc mơ','💭'),('con sóc','🐿️'),('bàn','🪑'),('cam','🍊'),('dưa','🍉'),('kéo','✂️')
on conflict (text) do nothing;

-- Gắn từ cho một số âm/vần
insert into public.unit_words (unit_id, word_id)
select u.id, w.id from (values
  ('am','a','cá'),('am','a','gà'),('am','e','xe'),('am','o','bò'),('am','o','chó'),('am','ơ','phở'),
  ('am','b','bà'),('am','b','bò'),('am','c','cá'),('am','g','gà'),('am','m','mèo'),('am','x','xe'),
  ('am','ch','chó'),('am','gh','ghế'),('am','ngh','nghé'),('am','kh','khế'),('am','nh','nhà'),('am','ph','phở'),
  ('am','qu','quả na'),('am','th','thỏ'),('am','tr','trâu'),
  ('van','oc','hạt thóc'),('van','oc','con sóc'),('van','ôc','cột mốc'),('van','ưc','lọ mực'),('van','ăc','xúc xắc'),
  ('van','ot','gót chân'),('van','ăt','đôi mắt'),('van','ơt','quả ớt'),('van','ât','bật lửa'),('van','âc','giấc mơ'),
  ('van','an','bàn'),('van','am','cam'),('van','eo','mèo'),('van','eo','kéo'),('van','ưa','dưa'),
  ('thanh','sắc','cá'),('thanh','huyền','gà'),('thanh','huyền','bà'),('thanh','hỏi','thỏ'),('thanh','hỏi','phở'),('thanh','ngã','dưa')
) as x(kind, value, word)
join public.units u on u.kind = x.kind and u.value = x.value
join public.words w on w.text = x.word
on conflict do nothing;

-- Bài tập mẫu theo unit (chỉ seed khi bảng exercises còn trống)
do $$
declare uid bigint; lid bigint;
begin
  if exists (select 1 from public.exercises) then return; end if;

  -- Âm: đồ chữ, tô nét, ghép âm ghép
  for uid in select id from public.units where kind = 'am' loop
    insert into public.exercises (unit_id, type, title, config, order_index)
    select id, 'read', 'Đọc âm ' || value, '{}'::jsonb, 1 from public.units where id = uid;
    insert into public.exercises (unit_id, type, title, config, order_index)
    select id, 'trace', 'Đồ chữ ' || value, jsonb_build_object('glyph', value, 'mode', 'do'), 2 from public.units where id = uid;
    insert into public.exercises (unit_id, type, title, config, order_index)
    select id, 'trace', 'Tô nét ' || value, jsonb_build_object('glyph', value, 'mode', 'to'), 3 from public.units where id = uid;
  end loop;

  insert into public.exercises (unit_id, type, title, config, order_index)
  select id, 'build', 'Ghép âm ' || value,
    jsonb_build_object('parts', to_jsonb(regexp_split_to_array(value, '')), 'answer', value,
                       'distractors', '["a","o","t"]'::jsonb), 4
  from public.units where kind = 'am' and subtype = 'ghep';

  -- Vần
  for uid in select id from public.units where kind = 'van' loop
    insert into public.exercises (unit_id, type, title, config, order_index)
    select id, 'read', 'Đọc vần ' || value, '{}'::jsonb, 1 from public.units where id = uid;
  end loop;

  insert into public.exercises (unit_id, type, title, config, order_index)
  select u.id, 'true_false', 'Đúng hay sai?', jsonb_build_object('items', x.items), 2
  from public.units u join (values
    ('oc', '[{"word":"hạt thóc","statement":"Từ \"hạt thóc\" có vần oc","answer":true},{"word":"cột mốc","statement":"Từ \"cột mốc\" có vần oc","answer":false},{"word":"con sóc","statement":"Từ \"con sóc\" có vần oc","answer":true}]'::jsonb),
    ('eo', '[{"word":"mèo","statement":"Từ \"mèo\" có vần eo","answer":true},{"word":"cam","statement":"Từ \"cam\" có vần eo","answer":false},{"word":"kéo","statement":"Từ \"kéo\" có vần eo","answer":true}]'::jsonb),
    ('ăt', '[{"word":"đôi mắt","statement":"Từ \"đôi mắt\" có vần ăt","answer":true},{"word":"bật lửa","statement":"Từ \"bật lửa\" có vần ăt","answer":false},{"word":"quả ớt","statement":"Từ \"quả ớt\" có vần ơt","answer":true}]'::jsonb)
  ) as x(v, items) on u.kind = 'van' and u.value = x.v;

  insert into public.exercises (unit_id, type, title, config, order_index)
  select u.id, 'build', 'Ghép vần ' || u.value,
    jsonb_build_object('parts', to_jsonb(regexp_split_to_array(u.value, '')), 'answer', u.value, 'distractors', '["n","m","i"]'::jsonb), 3
  from public.units u where u.kind = 'van' and u.value in ('ac','oc','at','ot','an','am','eo');

  insert into public.exercises (unit_id, type, title, config, order_index)
  select u.id, 'build', 'Ghép tiếng mèo', '{"parts":["m","eo","`"],"answer":"mèo","distractors":["b","ac"]}'::jsonb, 4
  from public.units u where u.kind = 'van' and u.value = 'eo';

  -- Thanh
  insert into public.exercises (unit_id, type, title, config, order_index)
  select id, 'read', 'Đọc ' || coalesce(title, value),
    jsonb_build_object('examples', case value
      when 'ngang' then '["ma","ba","ca"]' when 'sắc' then '["má","bá","cá"]' when 'huyền' then '["mà","bà","gà"]'
      when 'hỏi' then '["mả","bả","thỏ"]' when 'ngã' then '["mã","bã","dữ"]' else '["mạ","bạ","lạ"]' end::jsonb), 1
  from public.units where kind = 'thanh';

  insert into public.exercises (unit_id, type, title, config, order_index)
  select id, 'pick_tone', 'Nghe và chọn dấu thanh', '{"items":[
    {"base":"ma","answer":"má","options":["ma","má","mà","mả","mã","mạ"]},
    {"base":"ba","answer":"bà","options":["ba","bá","bà","bả","bã","bạ"]},
    {"base":"ca","answer":"cả","options":["ca","cá","cà","cả","cã","cạ"]},
    {"base":"me","answer":"mẹ","options":["me","mé","mè","mẻ","mẽ","mẹ"]},
    {"base":"vo","answer":"võ","options":["vo","vó","vò","vỏ","võ","vọ"]}]}'::jsonb, 2
  from public.units where kind = 'thanh' and value = 'ngang';

  insert into public.exercises (unit_id, type, title, config, order_index)
  select u.id, 'build', 'Ghép thanh: ' || x.answer, jsonb_build_object('parts', x.parts, 'answer', x.answer, 'distractors', x.d), 3
  from public.units u join (values
    ('sắc', '["c","a","´"]'::jsonb, 'cá', '["`","?"]'::jsonb),
    ('huyền', '["g","a","`"]'::jsonb, 'gà', '["´","."]'::jsonb),
    ('hỏi', '["th","o","?"]'::jsonb, 'thỏ', '["~","´"]'::jsonb),
    ('ngã', '["m","u","~"]'::jsonb, 'mũ', '["?","."]'::jsonb),
    ('nặng', '["m","e","."]'::jsonb, 'mẹ', '["~","`"]'::jsonb)
  ) as x(v, parts, answer, d) on u.kind = 'thanh' and u.value = x.v;

  -- Bài 50 – Ôn tập (theo SGK Tiếng Việt 1, Kết nối tri thức)
  insert into public.lessons (number, title, order_index) values (50, 'Ôn tập và kể chuyện', 50)
    on conflict (number) do nothing;
  select id into lid from public.lessons where number = 50;
  insert into public.exercises (lesson_id, type, title, config, order_index) values
  (lid, 'rhyme_grid', 'Ghép vần vào bảng', '{
    "rows":["a","ă","â","o","ô","ơ","u","ư"],
    "cols":["c","t"],
    "given":[["a","c"]],
    "blocked":[["ơ","c"]]}', 1),
  (lid, 'star_words', 'Đọc từ trên ngôi sao', '{
    "words":["bật lửa","lọ mực","cột mốc","hạt thóc","xúc xắc","gót chân","đôi mắt","lác đác","giấc mơ","quả ớt"],
    "highlight":["ac","ăc","âc","oc","ôc","uc","ưc","at","ăt","ât","ot","ôt","ơt","ut","ưt"]}', 2),
  (lid, 'passage', 'Đọc đoạn văn', '{
    "text":"Gà mẹ dẫn đàn con đi ăn. Chốc chốc, tìm thấy mồi, gà mẹ \"tục... tục...\" gọi con. Đàn gà con chạy lại, chen chúc nhau ăn rồi rúc vào bên mẹ. Gà mẹ ủ ấm cho các con.",
    "highlight":["ac","ăc","âc","oc","ôc","uc","ưc","at","ăt","ât","ot","ôt","ơt","ut","ưt"]}', 3);
end $$;

-- ============ KHO TỪ BỔ SUNG + BÀI TẬP TỰ SINH ============
insert into public.words (text, emoji) values
 ('lá','🍃'),('mũ','🧢'),('mẹ','👩'),('bé','👶'),('cờ','🚩'),('đỏ','🔴'),('ô tô','🚗'),('ngựa','🐴'),('voi','🐘'),
 ('vịt','🦆'),('táo','🍎'),('chuối','🍌'),('bút','✏️'),('sách','📖'),('trống','🥁'),('nhện','🕷️'),('khỉ','🐒'),
 ('cua','🦀'),('tôm','🦐'),('sao','⭐'),('mưa','🌧️'),('cây','🌳'),('rùa','🐢'),('bạch tuộc','🐙'),
 ('ốc','🐌'),('hạt','🌰'),('bát','🥣'),('phích','🫖'),('gấu','🐻'),('cốc','🥛'),
 ('lạc','🥜'),('bắp','🌽'),('nhạc','🎵'),('mật ong','🍯'),('quạt','🪭'),('thuyền','⛵')
on conflict (text) do nothing;

insert into public.unit_words (unit_id, word_id)
select u.id, w.id from (values
  ('am','a','lá'),('am','u','mũ'),('am','e','mẹ'),('am','e','bé'),('am','ơ','cờ'),('am','đ','đỏ'),('am','ô','ô tô'),
  ('am','v','voi'),('am','v','vịt'),('am','t','táo'),('am','t','tôm'),('am','b','bút'),('am','s','sách'),('am','s','sao'),
  ('am','tr','trống'),('am','nh','nhện'),('am','kh','khỉ'),('am','c','cua'),('am','r','rùa'),('am','ph','phích'),
  ('am','ng','ngựa'),('am','q','quạt'),('am','th','thuyền'),('am','g','gấu'),('am','ch','chuối'),
  ('van','ac','lạc'),('van','ac','nhạc'),('van','ăc','bắp'),('van','ôc','ốc'),('van','ôc','cốc'),
  ('van','at','hạt'),('van','at','bát'),('van','at','quạt'),('van','ât','mật ong'),('van','ut','bút'),
  ('van','ưa','mưa'),('van','ưa','ngựa'),('van','am','tôm'),
  ('thanh','sắc','lá'),('thanh','sắc','bé'),('thanh','sắc','táo'),('thanh','huyền','cờ'),('thanh','huyền','rùa'),
  ('thanh','hỏi','đỏ'),('thanh','hỏi','khỉ'),('thanh','ngã','mũ'),('thanh','nặng','mẹ'),('thanh','nặng','vịt'),
  ('thanh','ngang','voi'),('thanh','ngang','cua'),('thanh','ngang','sao'),('thanh','ngang','cây')
) as x(kind, value, word)
join public.units u on u.kind = x.kind and u.value = x.value
join public.words w on w.text = x.word
on conflict do nothing;

-- ============ KHO TỪ LỚN + TỰ GẮN TỪ VÀO ÂM / VẦN / THANH ============
-- Bỏ dấu thanh nhưng giữ ă â ê ô ơ ư:  "quạt" → "quat"
create or replace function public.vn_base(t text) returns text language sql immutable as $$
  select translate(lower(t),
    'áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ',
    'aaaaaăăăăăâââââeeeeeêêêêêiiiiioooooôôôôôơơơơơuuuuuưưưưưyyyyy');
$$;
-- Thanh của một tiếng
create or replace function public.vn_tone(t text) returns text language sql immutable as $$
  select case
    when t ~ '[áắấéếíóốớúứý]' then 'sắc'
    when t ~ '[àằầèềìòồờùừỳ]' then 'huyền'
    when t ~ '[ảẳẩẻểỉỏổởủửỷ]' then 'hỏi'
    when t ~ '[ãẵẫẽễĩõỗỡũữỹ]' then 'ngã'
    when t ~ '[ạặậẹệịọộợụựỵ]' then 'nặng'
    else 'ngang' end;
$$;

insert into public.words (text, emoji) values
 ('dê','🐐'),('hổ','🐯'),('lợn','🐷'),('chim','🐦'),('cú','🦉'),('ếch','🐸'),('rắn','🐍'),('ong','🐝'),('kiến','🐜'),
 ('bướm','🦋'),('sứa','🪼'),('mực','🦑'),('nai','🦌'),('heo','🐖'),('sói','🐺'),('cáo','🦊'),('chuột','🐭'),('vẹt','🦜'),
 ('công','🦚'),('ngỗng','🪿'),('bê','🐮'),('cò','🦩'),
 ('bánh','🍰'),('kem','🍦'),('kẹo','🍬'),('nho','🍇'),('dứa','🍍'),('lê','🍐'),('dừa','🥥'),('xôi','🍙'),('cơm','🍚'),
 ('trứng','🥚'),('sữa','🍼'),('chè','🍵'),('nấm','🍄'),('tỏi','🧄'),('ngô','🌽'),('mì','🍝'),('đào','🍑'),('bí','🎃'),
 ('cà','🍆'),('bơ','🥑'),('khoai','🍠'),('rau','🥬'),('lúa','🌾'),
 ('ô','☂️'),('nơ','🎀'),('đèn','💡'),('chổi','🧹'),('kính','👓'),('áo','👕'),('váy','👗'),('giày','👟'),('tất','🧦'),
 ('bóng','⚽'),('diều','🪁'),('thìa','🥄'),('đũa','🥢'),('nồi','🍲'),('chảo','🍳'),('túi','👜'),('nhẫn','💍'),('vở','📒'),
 ('thước','📏'),('cặp','🎒'),('ghim','📌'),('kim','🪡'),('khoá','🔒'),('gương','🪞'),('giường','🛏️'),('cửa','🚪'),
 ('tàu','🚢'),('nến','🕯️'),('quà','🎁'),('pháo','🎆'),('tranh','🖼️'),('đàn','🎸'),('kèn','🎺'),('sáo','🪈'),
 ('chuông','🔔'),('cúp','🏆'),('lều','⛺'),('cầu','🌉'),('đá','🪨'),('ngọc','💎'),('pin','🔋'),('loa','🔊'),
 ('trăng','🌙'),('mây','☁️'),('gió','🌬️'),('núi','⛰️'),('biển','🌊'),('nắng','☀️'),('tuyết','❄️'),('cỏ','🌿'),
 ('tre','🎋'),('sen','🪷'),
 ('mắt','👁️'),('tai','👂'),('mũi','👃'),('tay','✋'),('chân','🦵'),('răng','🦷'),('tim','❤️'),
 ('bố','👨'),('ông','👴'),('chị','👧'),('cô','👩‍🏫'),('vua','🤴'),('hề','🤡'),('ma','👻'),
 ('thư','✉️'),('hũ','🫙'),('tủ','🗄️'),('củ','🥕'),('ớt','🌶️'),('ngọt','🍭'),('sọt','🧺'),('cúc','🌼'),('hạc','🦢'),
 ('bạn','🧑‍🤝‍🧑'),('tám','8️⃣'),('chăn','🛌'),('thịt','🍖'),('mứt','🍬'),('bột','🥣')
on conflict (text) do nothing;

-- sửa link sai từ bản cũ: "tôm" không có vần am
delete from public.unit_words uw using public.units u, public.words w
where uw.unit_id = u.id and uw.word_id = w.id and u.kind = 'van'
  and ((u.value = 'am' and w.text = 'tôm') or (u.value = 'uc' and w.text = 'lọ mực'));

-- Tự gắn mọi từ một tiếng vào âm đầu (âm phụ/ghép), âm chính, vần và thanh tương ứng.
-- Âm đầu lấy theo khớp dài nhất (ngh > ng > n, gi > g, qu > q…). Mỗi mục tối đa 8 từ.
insert into public.unit_words (unit_id, word_id)
select unit_id, word_id from (
  select c.unit_id, c.word_id,
         row_number() over (partition by c.unit_id order by c.word_id) as rn,
         (select count(*) from public.unit_words uw where uw.unit_id = c.unit_id) as have
  from (
    with p as (
      select w.id, public.vn_base(w.text) as s, public.vn_tone(w.text) as tone
      from public.words w where w.text !~ '\s'
    ), q as (
      select p.*, coalesce((
        select u.value from public.units u
        where u.kind = 'am' and u.subtype in ('phu','ghep') and p.s like u.value || '_%'
        order by length(u.value) desc limit 1), '') as ini
      from p
    ), r as (select q.*, substr(q.s, length(q.ini) + 1) as rest from q)
    select distinct u.id as unit_id, r.id as word_id
    from r join public.units u on
         (u.kind = 'am' and u.subtype in ('phu','ghep') and u.value = r.ini)
      or (u.kind = 'am' and u.subtype = 'chinh' and u.value = r.rest)
      or (u.kind = 'van' and u.value = r.rest)
      or (u.kind = 'thanh' and u.value = r.tone)
  ) c
  where not exists (select 1 from public.unit_words uw where uw.unit_id = c.unit_id and uw.word_id = c.word_id)
) z
where rn + have <= 8
on conflict do nothing;

-- ============ BỔ SUNG: mỗi âm / vần có ít nhất 5 từ ví dụ ============
insert into public.words (text, emoji) values
 ('máy bay','✈️'),('gỗ','🪵'),('gậy','🦯'),('búp bê','🪆'),('kẹp','📎'),('quần','👖'),('rồng','🐉'),('xoài','🥭'),
 ('xương','🦴'),('ghẹ','🦀'),('ghe','🛶'),('ghép hình','🧩'),('giỏ','🧺'),('giấy','📄'),('khăn','🧣'),('nghệ','🫚'),
 ('nghêu','🦪'),('nghe nhạc','🎧'),('nghỉ hè','🏖️'),('phấn','🖍️'),('phao','🛟'),('bạc','🪙'),('thác','🏞️'),
 ('tắc kè','🦎'),('mặc áo','👚'),('lúc lắc','🪇'),('mắc áo','🧥'),('giấc ngủ','😴'),('bậc thang','🪜'),('quả gấc','🍅'),
 ('nhấc chân','🦵'),('cóc','🐸'),('tóc','💇'),('gốc cây','🪵'),('lốc xoáy','🌪️'),('chúc mừng','🎉'),('cục tẩy','🧽'),
 ('lục lạc','🔔'),('thức dậy','⏰'),('bức tranh','🖼️'),('rực rỡ','🌈'),('hát','🎤'),('cát','🏖️'),('mặt trời','☀️'),
 ('sắt','🔩'),('cắt tóc','💇'),('đất','🌍'),('lật đật','🪆'),('rót','🫗'),('giọt nước','💧'),('cà rốt','🥕'),('một','1️⃣'),
 ('nốt nhạc','🎵'),('vợt','🏸'),('thớt','🪵'),('mũ phớt','🎩'),('nút','🔘'),('phút','⏱️'),('sút bóng','⚽'),
 ('mứt dừa','🥥'),('vứt rác','🗑️'),('đứt dây','🧵'),('nứt nẻ','🏜️'),('ngan','🦆'),('bàn chải','🪥'),('nam châm','🧲'),
 ('khám bệnh','🩺'),('đám mây','☁️'),('leo trèo','🧗')
on conflict (text) do nothing;

-- "bắp" là vần ăp, không phải ăc
delete from public.unit_words uw using public.units u, public.words w
where uw.unit_id = u.id and uw.word_id = w.id and u.kind = 'van' and u.value = 'ăc' and w.text = 'bắp';

insert into public.unit_words (unit_id, word_id)
select u.id, w.id from (values
  ('am','ă','rắn'),('am','ă','trăng'),('am','ă','chăn'),('am','ă','răng'),('am','ă','mắt'),
  ('am','â','gấu'),('am','â','cây'),('am','â','mây'),('am','â','chân'),('am','â','nấm'),
  ('am','i','tim'),('am','ư','sữa'),('am','ư','mưa'),('am','ư','dưa'),('am','ư','trứng'),
  ('am','y','váy'),('am','y','tay'),('am','y','mây'),('am','y','giày'),('am','y','máy bay'),
  ('am','g','gỗ'),('am','g','gậy'),
  ('am','p','cặp'),('am','p','bắp'),('am','p','búp bê'),('am','p','kẹp'),
  ('am','q','quà'),('am','q','quả na'),('am','q','quả ớt'),('am','q','quần'),
  ('am','r','rồng'),('am','x','xoài'),('am','x','xương'),('am','x','xúc xắc'),
  ('am','gh','ghẹ'),('am','gh','ghe'),('am','gh','ghép hình'),('am','gi','giỏ'),('am','gi','giấy'),
  ('am','kh','khăn'),('am','ngh','nghệ'),('am','ngh','nghêu'),('am','ngh','nghe nhạc'),('am','ngh','nghỉ hè'),
  ('am','ph','phấn'),('am','ph','phao'),('am','qu','quần'),('am','qu','quả ớt'),
  ('van','ac','bạc'),('van','ac','thác'),
  ('van','ăc','tắc kè'),('van','ăc','mặc áo'),('van','ăc','lúc lắc'),('van','ăc','mắc áo'),
  ('van','âc','giấc ngủ'),('van','âc','bậc thang'),('van','âc','quả gấc'),('van','âc','nhấc chân'),
  ('van','oc','cóc'),('van','oc','tóc'),('van','ôc','gốc cây'),('van','ôc','lốc xoáy'),
  ('van','uc','xúc xắc'),('van','uc','chúc mừng'),('van','uc','cục tẩy'),('van','uc','lục lạc'),
  ('van','ưc','thức dậy'),('van','ưc','bức tranh'),('van','ưc','rực rỡ'),
  ('van','at','hát'),('van','at','cát'),('van','ăt','mặt trời'),('van','ăt','sắt'),('van','ăt','cắt tóc'),
  ('van','ât','đất'),('van','ât','lật đật'),('van','ot','rót'),('van','ot','giọt nước'),
  ('van','ôt','cà rốt'),('van','ôt','một'),('van','ôt','nốt nhạc'),('van','ôt','cột mốc'),
  ('van','ơt','vợt'),('van','ơt','thớt'),('van','ơt','mũ phớt'),
  ('van','ut','nút'),('van','ut','phút'),('van','ut','sút bóng'),('van','ut','bút chì'),
  ('van','ưt','mứt dừa'),('van','ưt','vứt rác'),('van','ưt','đứt dây'),('van','ưt','nứt nẻ'),
  ('van','an','ngan'),('van','an','bàn chải'),('van','am','nam châm'),('van','am','khám bệnh'),('van','am','đám mây'),
  ('van','eo','leo trèo')
) as x(kind, value, word)
join public.units u on u.kind = x.kind and u.value = x.value
join public.words w on w.text = x.word
on conflict do nothing;

-- "ơ" là âm chính, không phải vần → xoá khỏi danh sách vần (bài tập, từ gắn kèm tự xoá theo cascade)
delete from public.units where kind = 'van' and value = 'ơ';

-- ============ Vần 3: âm cuối ng + nhóm ăn ân ăm âm (để so sánh an–ăn–ân, am–ăm–âm) ============
insert into public.units (kind, value, order_index) values
 ('van','ong',21),('van','ông',22),('van','ung',23),('van','ưng',24),('van','ang',25),('van','ăng',26),('van','âng',27),
 ('van','ăn',28),('van','ân',29),('van','ăm',30),('van','âm',31)
on conflict do nothing;

insert into public.words (text, emoji) values
 ('bóng bay','🎈'),('vòng','💍'),('chong chóng','🎐'),('bóng đèn','💡'),('trống','🥁'),('cầu vồng','🌈'),
 ('cái thùng','🪣'),('súng nước','🔫'),('trung thu','🏮'),('cung tên','🏹'),('khủng long','🦖'),
 ('gừng','🫚'),('rừng cây','🌲'),('bánh chưng','🟩'),('sừng','🦏'),
 ('vàng','🥇'),('trang sách','📖'),('càng cua','🦀'),('cái thang','🪜'),('sáng sớm','🌅'),
 ('măng tre','🎋'),('băng giá','🧊'),('nắng','🌞'),
 ('nhà tầng','🏢'),('vầng trăng','🌕'),('tâng bóng','⚽'),('dâng hoa','💐'),('vâng lời','🙇'),
 ('ăn cơm','🍚'),('thằn lằn','🦎'),('mặn','🧂'),('cân','⚖️'),('sân trường','🏫'),
 ('tắm','🛁'),('năm','5️⃣'),('con tằm','🐛'),('chăm sóc','🪴'),('gặm cỏ','🐐'),
 ('mầm cây','🌱'),('cầm bút','✍️'),('đầm sen','🪷'),('ấm trà','🫖')
on conflict (text) do nothing;

insert into public.unit_words (unit_id, word_id)
select u.id, w.id from (values
  ('ong','ong'),('ong','bóng bay'),('ong','vòng'),('ong','chong chóng'),('ong','bóng đèn'),
  ('ông','ông'),('ông','công'),('ông','rồng'),('ông','trống'),('ông','cầu vồng'),
  ('ung','cái thùng'),('ung','súng nước'),('ung','trung thu'),('ung','cung tên'),('ung','khủng long'),
  ('ưng','trứng'),('ưng','gừng'),('ưng','rừng cây'),('ưng','bánh chưng'),('ưng','sừng'),
  ('ang','vàng'),('ang','trang sách'),('ang','càng cua'),('ang','cái thang'),('ang','sáng sớm'),
  ('ăng','trăng'),('ăng','răng'),('ăng','măng tre'),('ăng','băng giá'),('ăng','nắng'),
  ('âng','nhà tầng'),('âng','vầng trăng'),('âng','tâng bóng'),('âng','dâng hoa'),('âng','vâng lời'),
  ('ăn','chăn'),('ăn','khăn'),('ăn','ăn cơm'),('ăn','thằn lằn'),('ăn','mặn'),
  ('ân','chân'),('ân','cân'),('ân','sân trường'),('ân','quần'),('ân','phấn'),
  ('ăm','tắm'),('ăm','năm'),('ăm','con tằm'),('ăm','chăm sóc'),('ăm','gặm cỏ'),
  ('âm','nấm'),('âm','mầm cây'),('âm','cầm bút'),('âm','đầm sen'),('âm','ấm trà')
) as x(value, word)
join public.units u on u.kind = 'van' and u.value = x.value
join public.words w on w.text = x.word
on conflict do nothing;

-- Tự sinh bài "Đúng – Sai" cho mọi âm/vần có ≥ 2 từ minh hoạ: 2 câu đúng + 1 câu sai (từ của âm/vần khác)
insert into public.exercises (unit_id, type, title, config, order_index)
select u.id, 'true_false', 'Đúng hay sai? (' || u.value || ')',
  jsonb_build_object('items', (
    select jsonb_agg(item) from (
      (select jsonb_build_object('word', w.text,
                'statement', 'Từ "' || w.text || '" có ' || case u.kind when 'van' then 'vần ' else 'âm ' end || u.value,
                'answer', true) as item
       from public.unit_words uw join public.words w on w.id = uw.word_id
       where uw.unit_id = u.id limit 2)
      union all
      (select jsonb_build_object('word', w.text,
                'statement', 'Từ "' || w.text || '" có ' || case u.kind when 'van' then 'vần ' else 'âm ' end || u.value,
                'answer', false)
       from public.unit_words uw
       join public.units u2 on u2.id = uw.unit_id
       join public.words w on w.id = uw.word_id
       where u2.kind = u.kind and u2.id <> u.id and position(u.value in w.text) = 0
       order by random() limit 1)
    ) t
  )), 5
from public.units u
where u.kind in ('am','van')
  and (select count(*) from public.unit_words where unit_id = u.id) >= 2
  and not exists (select 1 from public.exercises e where e.unit_id = u.id and e.type = 'true_false');

-- Tự sinh bài "Nghe chọn tiếng" cho từng thanh
insert into public.exercises (unit_id, type, title, config, order_index)
select u.id, 'pick_tone', 'Nghe và chọn tiếng (' || u.value || ')',
  jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('base','ba','answer', x.t[1], 'options', '["ba","bá","bà","bả","bã","bạ"]'::jsonb),
    jsonb_build_object('base','me','answer', x.t[2], 'options', '["me","mé","mè","mẻ","mẽ","mẹ"]'::jsonb),
    jsonb_build_object('base','co','answer', x.t[3], 'options', '["co","có","cò","cỏ","cõ","cọ"]'::jsonb))), 4
from public.units u join (values
  ('ngang', array['ba','me','co']), ('sắc', array['bá','mé','có']), ('huyền', array['bà','mè','cò']),
  ('hỏi', array['bả','mẻ','cỏ']), ('ngã', array['bã','mẽ','cõ']), ('nặng', array['bạ','mẹ','cọ'])
) as x(v, t) on u.kind = 'thanh' and u.value = x.v
where not exists (select 1 from public.exercises e where e.unit_id = u.id and e.title like 'Nghe và chọn tiếng (%');

-- Bài "Đọc" cho âm/vần mới thêm nếu còn thiếu
insert into public.exercises (unit_id, type, title, config, order_index)
select u.id, 'read', 'Đọc ' || u.value, '{}'::jsonb, 1 from public.units u
where u.kind in ('am','van') and not exists (select 1 from public.exercises e where e.unit_id = u.id and e.type = 'read');

-- Gán quyền giáo viên (sửa username rồi chạy riêng dòng này):
-- update public.profiles set role = 'teacher' where username = 'cogiao';

-- ============ Rà soát vần: "bật lửa" không hợp với trẻ nhỏ → "gật đầu"; vần ut thiếu "bút chì" ============
insert into public.words (text, emoji) values ('bút chì','✏️'),('gật đầu','🙆'),
  ('ba','👨'),('ca','☕'),('má','👩'),('bá','🧓'),('mà','🌾'),('mả','🪦'),('bả','👵'),('mã','🐎'),('bã','🥥'),('dữ','🦁'),('mạ','🌱'),('bạ','📒'),('lạ','❓')
  on conflict (text) do nothing;
delete from public.unit_words uw using public.units u, public.words w
where uw.unit_id = u.id and uw.word_id = w.id and u.kind = 'van' and u.value = 'ât' and w.text = 'bật lửa';
insert into public.unit_words (unit_id, word_id)
select u.id, w.id from (values ('ut','bút chì'),('ât','gật đầu')) as x(value, word)
join public.units u on u.kind = 'van' and u.value = x.value
join public.words w on w.text = x.word
on conflict do nothing;
update public.exercises e set config = jsonb_build_object('items', case u.value
    when 'ăt' then '[{"word":"đôi mắt","statement":"Từ \"đôi mắt\" có vần ăt","answer":true},{"word":"gật đầu","statement":"Từ \"gật đầu\" có vần ăt","answer":false},{"word":"mặt trời","statement":"Từ \"mặt trời\" có vần ăt","answer":true}]'::jsonb
    else '[{"word":"gật đầu","statement":"Từ \"gật đầu\" có vần ât","answer":true},{"word":"mật ong","statement":"Từ \"mật ong\" có vần ât","answer":true},{"word":"cột mốc","statement":"Từ \"cột mốc\" có vần ât","answer":false}]'::jsonb end)
from public.units u
where e.unit_id = u.id and e.type = 'true_false' and u.kind = 'van' and u.value in ('ăt','ât')
  and e.config::text like '%bật lửa%';
