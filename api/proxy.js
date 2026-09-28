// api/proxy.js
export default async function handler(req, res) {
    // 1. 设置 CORS 响应头，允许你的前端页面跨域访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // 2. 处理 CORS 预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. 从查询参数中获取目标 URL
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing "url" parameter' });
    }

    try {
        // 4. 使用 Node.js 原生 fetch 转发请求，并伪装请求头
        const response = await fetch(targetUrl, {
            headers: {
                // 伪装成真实的 Chrome 浏览器
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // 核心：必须指定行情频道的 Referer，否则 push2 接口会返回 502
                'Referer': 'https://quote.eastmoney.com/',
                'Origin': 'https://quote.eastmoney.com',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                // 根据目标地址动态设置 Host
                'Host': new URL(targetUrl).host,
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            // 如果东财返回了错误状态码，将错误信息原样返回
            const errorText = await response.text();
            res.status(response.status).send(errorText);
            return;
        }

        // 5. 将响应内容返回给前端
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).send(data);

    } catch (error) {
        console.error('代理请求异常:', error);
        res.status(500).json({ error: 'Proxy request failed', message: error.message });
    }
}