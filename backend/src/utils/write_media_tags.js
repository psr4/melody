const logger = require('consola');
const fs = require('fs');
const path = require('path');
const os = require('os');
const got = require('got');
const cmd = require('./cmd');

async function downloadCover(coverUrl) {
    const coverPath = path.join(os.tmpdir(), `melody-cover-${Date.now()}-${Math.floor(Math.random() * 100000)}.jpg`);
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    };
    // 部分图床(如 bilibili/网易云)有防盗链，先用 Referer 重试一次
    const attempts = [
        {},
        { Referer: 'https://www.bilibili.com/' },
        { Referer: 'https://music.163.com/' },
    ];
    for (const extra of attempts) {
        try {
            const stream = got.stream(coverUrl, { headers: { ...headers, ...extra }, timeout: { request: 15000 } });
            await new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(coverPath);
                stream.on('error', reject);
                writeStream.on('error', reject);
                writeStream.on('finish', resolve);
                stream.pipe(writeStream);
            });
            if (fs.existsSync(coverPath) && fs.statSync(coverPath).size > 0) {
                return coverPath;
            }
        } catch (error) {
            logger.warn(`download cover failed (attempt ${JSON.stringify(extra)}): ${error.message}`);
        }
    }
    return '';
}

// Write title / artist / album / cover into the audio file with ffmpeg.
// The cover is attached as an APIC frame (id3v2), so the cloud disk can show it.
async function writeMediaTags(filePath, {
    title = "",
    artist = "",
    album = "",
    coverUrl = "",
} = {}) {
    if (!title && !artist && !album && !coverUrl) {
        return filePath;
    }

    let coverPath = "";
    if (coverUrl) {
        coverPath = await downloadCover(coverUrl);
    }

    const outputPath = `${filePath}.tagged.mp3`;
    const args = ['-y', '-i', filePath];
    if (coverPath) {
        args.push('-i', coverPath);
    }
    args.push('-map', '0:a');
    if (coverPath) {
        // 裁剪成正方形封面，更符合音乐平台显示习惯
        args.push('-map', '1:v', '-vf', 'scale=500:500:force_original_aspect_ratio=increase,crop=500:500', '-c:v', 'mjpeg', '-id3v2_version', '3');
    }
    args.push('-c:a', 'copy');
    if (title) {
        args.push('-metadata', `title=${title}`);
    }
    if (artist) {
        args.push('-metadata', `artist=${artist}`);
    }
    if (album) {
        args.push('-metadata', `album=${album}`);
    }
    if (coverPath) {
        args.push('-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)');
    }
    args.push(outputPath);

    logger.info(`write media tags: ffmpeg ${args.join(' ')}`);
    const {code, message} = await cmd('ffmpeg', args);
    if (code != 0 || !fs.existsSync(outputPath)) {
        logger.error(`write media tags failed, err: ${message}`);
        return filePath;
    }

    if (coverPath) {
        fs.unlink(coverPath, () => {});
    }
    fs.unlink(filePath, () => {});
    return outputPath;
}

module.exports = {
    writeMediaTags,
}