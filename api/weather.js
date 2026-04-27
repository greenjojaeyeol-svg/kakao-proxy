export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat, lon required' });

  const authKey = 'vc67msveTIeOu5rL3vyHcg';

  // 위경도 → 기상청 격자 변환
  function toGrid(lat, lon) {
    const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0;
    const OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;
    const DEGRAD = Math.PI / 180.0;
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD, olat = OLAT * DEGRAD;
    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);
    let ra = Math.tan(Math.PI * 0.25 + parseFloat(lat) * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);
    let theta = parseFloat(lon) * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    return {
      x: Math.floor(ra * Math.sin(theta) + XO + 0.5),
      y: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
    };
  }

  const grid = toGrid(lat, lon);

  // 현재 시간 계산
  const now = new Date();
  now.setHours(now.getHours() + 9); // KST
  const pad = n => String(n).padStart(2, '0');
  const base_date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  // 초단기실황은 매시 40분 이후 데이터 제공
  let h = now.getHours();
  if (now.getMinutes() < 40) h -= 1;
  if (h < 0) h = 23;
  const base_time = `${pad(h)}00`;

  try {
    // 초단기실황 (기온, 습도, 풍속, 강수형태)
    const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtNcst?pageNo=1&numOfRows=10&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${grid.x}&ny=${grid.y}&authKey=${authKey}`;
    const r = await fetch(url);
    const data = await r.json();
    const items = data?.response?.body?.items?.item || [];

    const result = {};
    items.forEach(item => { result[item.category] = item.obsrValue });

    // 자외선은 별도 API
    let uvVal = null;
    try {
      const uvUrl = `https://apihub.kma.go.kr/api/typ01/url/uv_dmx.php?tm=${base_date}${pad(h)}&authKey=${authKey}`;
      const uvR = await fetch(uvUrl);
      const uvText = await uvR.text();
      const match = uvText.match(/\d+\.\d+/);
      if (match) uvVal = parseFloat(match[0]);
    } catch(e) {}

    res.status(200).json({
      temp: result['T1H'],        // 기온
      humidity: result['REH'],    // 습도
      windSpeed: result['WSD'],   // 풍속
      rainType: result['PTY'],    // 강수형태
      uv: uvVal,
      grid
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
