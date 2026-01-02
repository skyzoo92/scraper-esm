import axios from 'axios'
import qs from 'qs'
import crypto from 'crypto'
import {URLSearchParams} from 'url'

class Ummy {
  constructor() {
    this.api = {
      base: "https://fastdl.app",
      base_wh: "https://api-wh.fastdl.app",
      msec: "/msec",
      convert: "/api/convert"
    };
    this.constant = {
      timestamp: 1763455936795,
      key: "bbe749c46624c168b1215f159f9712a2a1bdf44ccfba63203b4ccd9955186ebe"
    };
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      origin: "https://fastdl.app",
      referer: "https://fastdl.app/",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async times() {
    try {
      const getHeaders = {
        "user-agent": this.headers["user-agent"],
        accept: this.headers["accept"],
        "accept-language": this.headers["accept-language"],
        origin: this.headers["origin"],
        referer: this.headers["referer"]
      };
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.msec}`, {
        headers: getHeaders
      });
      return Math.floor(data.msec * 1e3);
    } catch (error) {
      console.error("Error fetching timestamp:", error);
      return 0;
    }
  }
  async download(url) {
    const time = await this.times();
    const time_diff = time ? Date.now() - time : 0;
    const ts_value = time ? time : Date.now();
    const hash = `${url}${ts_value}${this.constant.key}`;
    const signatureBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hash));
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    const postData = {
      sf_url: url,
      ts: ts_value.toString(),
      _ts: this.constant.timestamp.toString(),
      _tsc: time_diff.toString(),
      _s: signature
    };
    const formUrlEncodedBody = new URLSearchParams(postData).toString();
    const convertUrl = `${this.api.base_wh}${this.api.convert}`;
    const {
      data
    } = await axios.post(convertUrl, formUrlEncodedBody, {
      headers: this.headers
    });
    return data;
  }
}
export const igdl = new Ummy()

class InstagramScraper {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://www.instagram.com/api/graphql",
      headers: {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
        "X-CSRFToken": "RVDUooU5MYsBbS1CNN3CzVAuEP8oHB52",
        "X-IG-App-ID": "1217981644879628",
        "X-FB-LSD": "AVqbxe3J_YA",
        "X-ASBD-ID": "129477",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
      }
    });
  }
  getInstagramPostId(url) {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|tv|stories|reel)\/([^/?#&]+).*/);
    return match ? match[1] : null;
  }
  encodeGraphqlRequestData(shortcode) {
    return qs.stringify({
      av: "0",
      __d: "www",
      __user: "0",
      __a: "1",
      __req: "3",
      __hs: "19624.HYP:instagram_web_pkg.2.1..0.0",
      dpr: "3",
      __ccg: "UNKNOWN",
      __rev: "1008824440",
      __s: "xf44ne:zhh75g:xr51e7",
      __hsi: "7282217488877343271",
      __dyn: "7xeUmwlEnwn8K2WnFw9-2i5U4e0yoW3q32360CEbo1nEhw2nVE4W0om78b87C0yE5ufz81s8hwGwQwoEcE7O2l0Fwqo31w9a9x-0z8-U2zxe2GewGwso88cobEaU2eUlwhEe87q7-0iK2S3qazo7u1xwIw8O321LwTwKG1pg661pwr86C1mwraCg",
      __csr: "gZ3yFmJkillQvV6ybimnG8AmhqujGbLADgjyEOWz49z9XDlAXBJpC7Wy-vQTSvUGWGh5u8KibG44dBiigrgjDxGjU0150Q0848azk48N09C02IR0go4SaR70r8owyg9pU0V23hwiA0LQczA48S0f-x-27o05NG0fkw",
      __comet_req: "7",
      lsd: "AVqbxe3J_YA",
      jazoest: "2957",
      __spin_r: "1008824440",
      __spin_b: "trunk",
      __spin_t: "1695523385",
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
      variables: JSON.stringify({
        shortcode: shortcode
      }),
      server_timestamps: "true",
      doc_id: "10015901848480474"
    });
  }
  async getPostGraphqlData(postId) {
    try {
      const response = await this.axiosInstance.post("", this.encodeGraphqlRequestData(postId));
      return response.data;
    } catch (error) {
      throw new Error("Gagal mengambil data dari Instagram");
    }
  }
  extractPostInfo(mediaData) {
    if (!mediaData) throw new Error("Data media tidak tersedia");
    const getUrlFromData = data => {
      if (data.edge_sidecar_to_children) {
        return data.edge_sidecar_to_children.edges.map(edge => edge.node.video_url || edge.node.display_url);
      }
      return data.video_url ? [data.video_url] : [data.display_url];
    };
    return {
      url: getUrlFromData(mediaData),
      metadata: {
        caption: mediaData.edge_media_to_caption?.edges[0]?.node.text || "",
        username: mediaData.owner?.username || "unknown",
        like: mediaData.edge_media_preview_like?.count || 0,
        comment: mediaData.edge_media_to_comment?.count || 0,
        isVideo: mediaData.is_video || false
      }
    };
  }
  async fetchData(url) {
    const postId = this.getInstagramPostId(url);
    if (!postId) throw new Error("URL Instagram tidak valid");
    const data = await this.getPostGraphqlData(postId);
    return this.extractPostInfo(data.data?.xdt_shortcode_media);
  }
}
export const igdl2 = new InstagramScraper()