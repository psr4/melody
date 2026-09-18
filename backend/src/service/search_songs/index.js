const { searchSongFromAllPlatform, fillSearchResultCover } = require('../media_fetcher');
const searchSongsWithSongMeta = require('./search_songs_with_song_meta');
const findTheBestMatchFromWyCloud = require('./find_the_best_match_from_wycloud');

async function searchSongsWithKeyword(keyword) {
    const searchList = await searchSongFromAllPlatform({keyword});
    if (searchList === false || searchList.length === 0) {
        return [];
    }

    // The search result from media-get does not contain a cover.
    // Fetch the cover of each song for display.
    return await fillSearchResultCover(searchList);
}


module.exports = {
    searchSongsWithSongMeta: searchSongsWithSongMeta,
    searchSongsWithKeyword: searchSongsWithKeyword,
    findTheBestMatchFromWyCloud: findTheBestMatchFromWyCloud,
}