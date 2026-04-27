export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ox, oy, dx, dy } = req.query;
  if (!ox || !oy || !dx || !dy) return res.status(400).json({ error: 'origin/dest coords required' });

  try {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${ox},${oy}&destination=${dx},${dy}&priority=RECOMMEND&car_type=1&car_fuel=GASOLINE`;
    const r = await fetch(url, {
      headers: { Authorization: 'KakaoAK b67c5d797ab1def425ed459c1c7c42c1' }
    });
    const data = await r.json();
    const route = data.routes && data.routes[0];
    if (route && route.summary) {
      res.status(200).json({
        duration: route.summary.duration, // seconds
        distance: route.summary.distance  // meters
      });
    } else {
      res.status(200).json({ error: 'no route' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
