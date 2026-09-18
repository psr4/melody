const { fetchWithUrl, getMetaWithUrl } = require('../media_fetcher');
const logger = require('consola');
const sleep = require('../../utils/sleep');
const findTheBestMatchFromWyCloud = require('../search_songs/find_the_best_match_from_wycloud');
const JobManager = require('../job_manager');
const JobStatus = require('../../consts/job_status');
const JobType = require('../../consts/job_type');
const configManager = require('../config_manager');
const fs = require('fs');
const libPath = require('path');
const utilFs = require('../../utils/fs');
const { downloadFromLocalTmpPath } = require('./download_to_local');
const uploadWithRetryThenMatch = require('./upload_to_wycloud_disk_with_retry_then_match');
const { writeMediaTags } = require('../../utils/write_media_tags');

module.exports = async function syncSingleSongWithUrl(uid, url, {
    songName = "",
    artist = "",
    album = "",
    coverUrl = "",
    matchOfficial = true,
    songFromWyCloud = null
} = {}, jobId = 0, jobType = JobType.SyncSongFromUrl, playlistName = "", collectRet) {
    // step 1. fetch song info
    const songInfo = await getMetaWithUrl(url);
    logger.info(songInfo);
    if (songInfo === false || songInfo.isTrial) {
        logger.error(`fetch song info failed or it's a trial song. ${JSON.stringify(songInfo)}`);
        return false;
    }

    await updateJobIfNeed(uid, jobId, songInfo, jobType);

    // step 2. find the best match from wycloud
    // 匹配官方歌曲后，云盘会显示官方歌词/封面；未匹配则保留用户自定义信息
    if (!matchOfficial) {
        // the user wants to keep the custom title / artist / cover,
        // so we skip matching with the official song on wycloud
        logger.info(`do not match official song, keep custom meta. ${songName}, ${artist}, ${album}`);
        songFromWyCloud = null;
    } else if (songFromWyCloud === null) {
        let findSongName, findArtist, findAlbum;
        if (songName !== "" && artist !== "") {
            logger.info(`use the user input song name and artist, ${songName}, ${artist}, ${album}`);
            findSongName = songName;
            findArtist = artist;
            findAlbum = album;
        } else if (songInfo.fromMusicPlatform) {
            findSongName = songInfo.songName;
            findArtist = songInfo.artist;
            findAlbum = songInfo.album;
        } 
        songFromWyCloud = await findTheBestMatchFromWyCloud(uid, {
            songName: findSongName,
            artist: findArtist,
            album: findAlbum,
        });
    } else {
        logger.info(`use the songFromWyCloud by params`);
    }

    logger.info('songFromWyCloud:', songFromWyCloud);
    
    // step 3. download
    // should add meta tag if not matched song on wycloud
    const downloadSongName = songName ? songName : songInfo.songName;
    let path = await fetchWithUrl(url, {songName: downloadSongName, addMediaTag: songFromWyCloud ? false : true});
    if (path === false) {
        return false;
    }

    // step 3.5. 未匹配到官方歌曲时，把用户自定义的标题/作者/封面写入文件
    // 这样即使网易云没有这首歌，云盘里也能显示自定义信息
    if (songFromWyCloud === null && (songName || artist || coverUrl)) {
        path = await writeMediaTags(path, {
            title: songName,
            artist,
            album,
            coverUrl,
        });
        if (path === false) {
            logger.error(`write media tags failed, uid: ${uid}, url: ${url}`);
            return false;
        }
    }

    // step 4. upload or download
    logger.info(`handle song start: ${path}`);

    if (jobType === JobType.DownloadSongFromUrl || jobType === JobType.SyncThePlaylistToLocalService) {
        return await downloadFromLocalTmpPath(path, songInfo, playlistName, collectRet);
    } else {
        return await uploadWithRetryThenMatch(uid, path, songInfo, songFromWyCloud);
    }
}

async function updateJobIfNeed(uid, jobId, songInfo, jobType) {
    if (!jobId) {
        return;
    }
    const operation = jobType === JobType.SyncSongFromUrl ? "上传" : "下载";
    await JobManager.updateJob(uid, jobId, {
        name: `${operation}歌曲：${songInfo.songName}`,
        status: JobStatus.InProgress,
        desc: `歌曲: ${songInfo.songName}`,
        tip: "任务开始",
    });
}