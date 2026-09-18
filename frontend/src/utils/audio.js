/**
 * Get the proper play URL based on source
 * @param {string} source - The source platform (e.g., 'bilibili', 'netease')
 * @param {string} url - The original audio URL
 * @param {string} referer - The referer URL
 * @returns {string} The processed play URL
 */
export function getProperPlayUrl(source, url, referer) {
  console.log("--------getProperPlayUrl----------------");
  console.log(source);
  console.log(url);
  console.log(referer);
  if (source === "bilibili" || (url && url.indexOf("music.126.net") >= 0)) {
    const params = new URLSearchParams({
      url: url,
      source: source === "bilibili" ? "bilibili" : "netease",
      referer: referer
    });
    return `${import.meta.env.VITE_APP_API_URL}/proxy/audio?${params}`;
  }
  return url;
} 