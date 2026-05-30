exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gemini API Key 尚未設定，請聯絡管理員' })
    };
  }

  let image, mimeType;
  try {
    ({ image, mimeType } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: '無效的請求格式' }) };
  }

  const prompt = `分析這張收據/帳單，回傳JSON（只回傳JSON不要其他文字）：
{"currency":"貨幣代碼如JPY/TWD/USD/KRW/HKD/CNY/THB/EUR","items":[{"name_zh":"繁體中文名稱","name_orig":"原文（若本來是中文則相同）","amount":數字,"category":"food/transport/hotel/attraction/shopping/other"}],"total":總計數字或null,"note":"店名或其他備註（可空字串）"}
若圖片不是收據或無法辨識，回傳{"error":"無法辨識收據內容"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } },
            { text: prompt }
          ]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error?.message || `Gemini API 錯誤 (${res.status})` })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
