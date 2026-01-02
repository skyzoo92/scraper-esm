import axios from 'axios'
import yts from 'yt-search'
import { createDecipheriv } from 'crypto'

const extractVideoId = (url) => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|v\/|embed\/|user\/[^\/\n\s]+\/)?(?:watch\?v=|v%3D|embed%2F|video%2F)?|youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]{11})/;
  const result = url.match(regex);
  return result ? result[1] : null;
};

const audioQualities = [32, 64, 96, 128, 160, 192, 256, 320];
const videoQualities = [144, 240, 360, 480, 720, 1080, 1440];

const decryptInfo = (encoded) => {
  const secret = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
  const buffer = Buffer.from(encoded, 'base64');
  const iv = buffer.slice(0, 16);
  const encrypted = buffer.slice(16);
  const key = Buffer.from(secret, 'hex');

  const decipher = createDecipheriv('aes-128-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString());
};

const fetchDownload = async (url, quality, type) => {
  try {
    const { data: cdnData } = await axios.get('https://media.savetube.me/api/random-cdn');
    const cdnUrl = `https://${cdnData.cdn}`;

    const { data: infoEnc } = await axios.post(`${cdnUrl}/v2/info`, { url }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android)',
        'Referer': 'https://yt.savetube.me/1kejjj1?id=362796039'
      }
    });

    const info = decryptInfo(infoEnc.data);

    const { data: downloadRes } = await axios.post(`${cdnUrl}/download`, {
      downloadType: type,
      quality: String(quality),
      key: info.key
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Android)',
        'Referer': 'https://yt.savetube.me/start-download?from=1kejjj1%3Fid%3D362796039'
      }
    });

    let size = null;
    try {
      const { headers } = await axios.head(downloadRes.data.downloadUrl);
      size = headers['content-length'] ? Number(headers['content-length']) : null;
    } catch (e) {
      console.warn('Gagal mengambil ukuran file:', e.message);
    }

    return {
      status: true,
      url: downloadRes.data.downloadUrl,
      quality: `${quality}${type === 'audio' ? 'kbps' : 'p'}`,
      availableQuality: type === 'audio' ? audioQualities : videoQualities,
      size,
      filename: `${info.title} (${quality}${type === 'audio' ? 'kbps).mp3' : 'p).mp4'}`
    };

  } catch (err) {
    console.error('Download error:', err.message);
    return { status: false, message: 'Download gagal' };
  }
}

export const ytmp3 = async (link, quality = "128") => {
  try {
    const info = await yts(link);
    const result = await fetchDownload(link, quality, "audio");
    return {
      status: true,
      creator: '@kelvdra/scraper',
      metadata: info.all[0],
      download: result
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

export const ytmp4 = async (link, quality = "360") => {
  if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
    return { status: false, message: 'URL YouTube tidak valid' };
  }

  try {
    const info = await yts(link);
    const data = await fetchDownload(link, quality, "video");

    return {
      status: true,
      creator: '@kelvdra/scraper',
      metadata: info.all[0],
      download: data
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

export const search = async (query) => {
  try {
    const result = await yts(query);
    return {
      status: true,
      creator: '@kelvdra/scraper',
      results: result.all
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

export const playmp3 = async (query, quality = 128) => {
  try {
    const searchResult = await yts(query);
    if (!searchResult.status || !searchResult.results.length)
      return { status: false, message: 'Video tidak ditemukan' };

    const results = [];
    for (let video of searchResult.results.slice(0, 5)) {
      const downloadInfo = await fetchDownload(video.url, quality, 'audio');
      results.push({
        title: video.title,
        author: video.author.name,
        duration: video.timestamp,
        url: video.url,
        thumbnail: video.thumbnail,
        download: downloadInfo
      });
    }

    return {
      status: true,
      creator: '@hydra/scraper',
      type: 'audio',
      results
    };
  } catch (err) {
    return { status: false, message: err.message };
  }
}

export const playmp4 = async (query, quality = 360) => {
  try {
    const searchResult = await yts(query);
    if (!searchResult.status || !searchResult.results.length)
      return { status: false, message: 'Video tidak ditemukan' };

    const results = [];
    for (let video of searchResult.results.slice(0, 5)) {
      const downloadInfo = await fetchDownload(video.url, quality, 'video');
      results.push({
        title: video.title,
        author: video.author.name,
        duration: video.timestamp,
        url: video.url,
        thumbnail: video.thumbnail,
        download: downloadInfo
      });
    }

    return {
      status: true,
      creator: '@hydra/scraper',
      type: 'video',
      results
    };
  } catch (err) {
    return { status: false, message: err.message };
  }
}