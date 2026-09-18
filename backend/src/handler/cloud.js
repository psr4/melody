const logger = require('consola');
const { getMyCloudSongs, deleteCloudSong } = require('../service/music_platform/wycloud');

async function listCloudSongs(req, res) {
    const uid = req.account.uid;
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 30;

    const cloudSongs = await getMyCloudSongs(uid, offset, limit);
    if (cloudSongs === false) {
        logger.error(`get my cloud songs failed, uid: ${uid}`);
    }

    res.send({
        status: cloudSongs ? 0 : 1,
        data: cloudSongs ? cloudSongs : { count: 0, songs: [] },
    });
}

async function deleteCloudSongHandler(req, res) {
    const uid = req.account.uid;
    const songId = req.params.songId;

    if (!songId) {
        res.status(412).send({
            status: 1,
            message: "songId is invalid",
        });
        return;
    }

    const ret = await deleteCloudSong(uid, songId);
    res.send({
        status: ret ? 0 : 1,
    });
}

module.exports = {
    listCloudSongs: listCloudSongs,
    deleteCloudSong: deleteCloudSongHandler,
}