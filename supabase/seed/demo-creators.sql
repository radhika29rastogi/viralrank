-- Development / demo seed: 20 fictional creators for UI testing.
-- NOT real user submissions. Identifiable by instagram_username prefix `vrseed_`.
--
-- Prerequisites: run migrations 0001, 0002, and 0003_listing_payment.sql first.
-- Safe to re-run: unique usernames + ON CONFLICT DO NOTHING.
--
-- How to run:
--   Supabase Dashboard → SQL Editor → paste this file → Run
--   or: supabase db query -f supabase/seed/demo-creators.sql
--
-- These rows are inserted as already-published (status=active, listing_payment_status=paid).
-- No Razorpay payment rows are created.

insert into public.categories (name, slug) values
  ('Fashion', 'fashion'),
  ('Beauty', 'beauty'),
  ('Gaming', 'gaming'),
  ('Tech', 'tech'),
  ('Education', 'education'),
  ('Finance', 'finance'),
  ('Fitness', 'fitness'),
  ('Food', 'food'),
  ('Travel', 'travel'),
  ('Music', 'music'),
  ('Comedy', 'comedy'),
  ('Digital Marketing', 'digital-marketing'),
  ('Business', 'business'),
  ('Art', 'art'),
  ('Photography', 'photography'),
  ('Lifestyle', 'lifestyle'),
  ('Memes', 'memes'),
  ('Sports', 'sports'),
  ('Entertainment', 'entertainment'),
  ('Health', 'health')
on conflict (slug) do nothing;

with seed (
  username,
  name,
  slug,
  location,
  bio,
  followers,
  average_views,
  bid,
  hype_count,
  hype_amount,
  clicks,
  avatar_seed
) as (
  values
    ('vrseed_aisha_style', 'Aisha Kapoor', 'fashion', 'Mumbai', 'Streetwear drops and festival looks from Bandra.', 186000, 42000, 12500, 84, 4120, 910, 'Aisha'),
    ('vrseed_meera_glow', 'Meera Nair', 'beauty', 'Bengaluru', 'Skincare routines that actually survive Indian summers.', 142000, 31000, 8900, 61, 2980, 640, 'Meera'),
    ('vrseed_arjun_plays', 'Arjun Mehta', 'gaming', 'Pune', 'Ranked grind, unhinged comms, weekly clip dumps.', 274000, 88000, 18200, 129, 7640, 1480, 'Arjun'),
    ('vrseed_kavya_codes', 'Kavya Iyer', 'tech', 'Hyderabad', 'Gadgets, AI tools, and setup tours for creators.', 98000, 21000, 5400, 44, 2150, 390, 'Kavya'),
    ('vrseed_dev_notes', 'Dev Sharma', 'education', 'Delhi', 'Exam hacks and career explainers without the fluff.', 121000, 27000, 6700, 52, 2410, 510, 'Dev'),
    ('vrseed_riya_rupees', 'Riya Banerjee', 'finance', 'Kolkata', 'Personal finance for first jobs and side hustles.', 167000, 36000, 9800, 73, 3560, 720, 'Riya'),
    ('vrseed_nikhil_fit', 'Nikhil Rao', 'fitness', 'Chennai', 'Home workouts, protein myths, and match-day mobility.', 203000, 54000, 14100, 96, 4890, 880, 'Nikhil'),
    ('vrseed_sara_eats', 'Sara Qureshi', 'food', 'Lucknow', 'Late-night kebabs and home kitchens across the city.', 154000, 47000, 7600, 58, 2740, 560, 'Sara'),
    ('vrseed_leo_trails', 'Leo Fernandes', 'travel', 'Goa', 'Monsoon road trips and cheap stays that still slap.', 119000, 33000, 4300, 39, 1880, 340, 'Leo'),
    ('vrseed_ananya_beats', 'Ananya Joshi', 'music', 'Indore', 'Original hooks, bedroom covers, and gig diaries.', 88000, 19000, 3100, 28, 1320, 270, 'Ananya'),
    ('vrseed_vikram_lol', 'Vikram Singh', 'comedy', 'Jaipur', 'Relatable family chaos and wedding-season bits.', 312000, 102000, 22100, 174, 9120, 1920, 'Vikram'),
    ('vrseed_priya_ads', 'Priya Menon', 'digital-marketing', 'Kochi', 'Creator funnels, ads, and brand-deal breakdowns.', 76000, 14000, 2800, 22, 980, 210, 'Priya'),
    ('vrseed_harsh_ops', 'Harsh Patel', 'business', 'Ahmedabad', 'D2C ops, hiring, and the boring work that scales.', 64000, 11000, 1990, 18, 720, 160, 'Harsh'),
    ('vrseed_zara_ink', 'Zara Khan', 'art', 'Srinagar', 'Ink sketches, mural process, and print drops.', 91000, 16000, 3600, 31, 1450, 290, 'Zara'),
    ('vrseed_om_frames', 'Om Desai', 'photography', 'Surat', 'Street portraits and monsoon light in the old city.', 72000, 12500, 2400, 19, 860, 180, 'Om'),
    ('vrseed_tara_days', 'Tara Malhotra', 'lifestyle', 'Chandigarh', 'Apartment tours, routines, and weekend markets.', 135000, 29000, 6100, 47, 2260, 430, 'Tara'),
    ('vrseed_rohan_memes', 'Rohan Gupta', 'memes', 'Noida', 'Comment-section archaeology and template graveyards.', 401000, 156000, 25900, 211, 11840, 2400, 'Rohan'),
    ('vrseed_isha_pitch', 'Isha Verma', 'sports', 'Nagpur', 'Women''s cricket breakdowns and grassroots stories.', 108000, 24000, 4900, 41, 1970, 360, 'Isha'),
    ('vrseed_kabir_stage', 'Kabir Ali', 'entertainment', 'Mumbai', 'Set visits, trailer reactions, and industry gossip-lite.', 229000, 61000, 16400, 112, 6310, 1210, 'Kabir'),
    ('vrseed_nisha_well', 'Nisha Reddy', 'health', 'Visakhapatnam', 'Sleep, gut health, and clinic myths, explained calmly.', 83000, 15000, 0, 14, 560, 120, 'Nisha')
)
insert into public.creators (
  instagram_username,
  instagram_url,
  name,
  bio,
  profile_image_url,
  category_id,
  location,
  contact_email,
  contact_phone,
  followers,
  average_views,
  instagram_data_source,
  current_highest_bid,
  rank_set_at,
  profile_clicks,
  hype_count,
  total_hype_amount,
  status,
  listing_payment_status,
  published_at
)
select
  s.username,
  'https://www.instagram.com/' || s.username || '/',
  s.name,
  s.bio,
  'https://api.dicebear.com/9.x/adventurer/png?seed=' || s.avatar_seed || '&size=256',
  c.id,
  s.location,
  'seed+' || s.username || '@viralrank.buzz',
  null,
  s.followers,
  s.average_views,
  'creator_provided',
  s.bid,
  case when s.bid > 0 then now() - ((row_number() over (order by s.bid desc))::text || ' hours')::interval else null end,
  s.clicks,
  s.hype_count,
  s.hype_amount,
  'active',
  'paid',
  now() - interval '7 days'
from seed s
join public.categories c on c.slug = s.slug
on conflict (instagram_username) do nothing;

select public.recalculate_creator_ranks();
