-- Seed topics + places (run after 20260716000000_entity_graph.sql)

insert into public.topics (id, slug, label, description, keywords) values
  ('topic-shelling', 'shelling', 'Shelling', 'Artillery, mortar, and rocket fire', array['shelling','artillery','mortar','rocket']),
  ('topic-airstrike', 'airstrike', 'Airstrike', 'Aerial bombardment', array['airstrike','air strike','bombing','drone strike']),
  ('topic-ceasefire', 'ceasefire', 'Ceasefire', 'Truce and negotiations', array['ceasefire','truce','peace talks']),
  ('topic-displacement', 'displacement', 'Displacement', 'Refugees and IDPs', array['displacement','refugee','displaced','evacuat']),
  ('topic-port-disruption', 'port-disruption', 'Port disruption', 'Maritime ports and shipping', array['port','harbor','shipping','red sea']),
  ('topic-airspace', 'airspace', 'Airspace', 'Airspace closures and NOTAMs', array['airspace','notam','flight ban','airport closed']),
  ('topic-naval', 'naval', 'Naval activity', 'Warships and maritime military', array['naval','warship','frigate','carrier']),
  ('topic-thermal', 'thermal', 'Thermal / fire', 'Satellite thermal anomalies', array['thermal','fire','hotspot','firms']),
  ('topic-infrastructure', 'infrastructure', 'Infrastructure', 'Critical infrastructure', array['infrastructure','power grid','bridge','pipeline']),
  ('topic-traffic', 'traffic', 'Traffic / roads', 'Road closures and mobility', array['traffic','road closed','highway','checkpoint']),
  ('topic-humanitarian', 'humanitarian', 'Humanitarian', 'Aid and medical crisis', array['humanitarian','aid','famine','hospital']),
  ('topic-cyber', 'cyber', 'Cyber / info', 'Cyber and information ops', array['cyber','hack','disinformation'])
on conflict (id) do update set
  label = excluded.label,
  keywords = excluded.keywords;
