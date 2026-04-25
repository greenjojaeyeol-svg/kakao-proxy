export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  const headers = { Authorization: 'KakaoAK b67c5d797ab1def425ed459c1c7c42c1' };

  // 1차: 주소 검색
  let response = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
    { headers }
  );
  let data = await response.json();

  // 주소 검색 결과 없으면 2차: 키워드 검색
  if (!data.documents || data.documents.length === 0) {
    response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
      { headers }
    );
    data = await response.json();
  }

  res.status(200).json(data);
}
