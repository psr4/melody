const logger = require('consola');
const got = require('got');

async function proxyAudio(req, res) {
    const url = req.query.url;
    const source = req.query.source;
    const referer = req.query.referer;
    
    if (!url || !source) {
        res.status(400).send({
            status: 1,
            message: "url and source are required"
        });
        return;
    }

    // 允许 bilibili 源和网易云源
    // bilibili 音频需要 Referer 校验
    // 网易云云盘(私有云)音频 URL 需要 Referer: https://music.163.com 和浏览器 UA，否则返回 403
    let reqReferer = '';
    if (source === 'bilibili') {
        reqReferer = referer || 'https://www.bilibili.com';
    } else if (source === 'netease') {
        reqReferer = 'https://music.163.com';
    } else {
        res.status(403).send({
            status: 1,
            message: "only bilibili and netease source is allowed"
        });
        return;
    }

    try {
        const stream = got.stream(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
                'Referer': reqReferer
            }
        });
        
        stream.pipe(res);
    } catch (err) {
        logger.error('proxy audio error:', err);
        res.status(500).send({
            status: 1,
            message: "proxy failed"
        });
    }
}

module.exports = {
    proxyAudio
}; 