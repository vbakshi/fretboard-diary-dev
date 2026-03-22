import './loadEnv.js';
import { parseVideoTitle } from '../src/lib/parseVideoTitle.js';
import { parseJsonBody } from './parseJsonBody.js';

const CHORD_REGEX = /\b[A-G][#b]?(maj|min|m|sus|add|dim|aug)?[0-9]?\b/g;
const TABS_FLAG = /\b(tab|tabs|ultimate-guitar|songsterr)\b/i;
const EASY_COMMENTS = /\b(easy|simple|beginner|perfect for beginner)\b/i;
const LOVE_COMMENTS = /\b(love|amazing|best lesson|helped me)\b/i;
const ACCURATE_COMMENTS = /\b(accurate|correct|spot on|perfect chords)\b/i;

function extractChordsFromText(text) {
  if (!text) return [];
  const matches = text.match(CHORD_REGEX) || [];
  return [...new Set(matches)];
}

function countCommentMatches(comments, regex) {
  return comments.filter((c) => regex.test(c)).length;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey =
    process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  const { query } = parseJsonBody(req.body);
  if (!query?.trim()) {
    return res.status(400).json({ error: 'Query required' });
  }

  const baseUrl = 'https://www.googleapis.com/youtube/v3';
  const searchTerms = [
    `${query} guitar lesson beginner`,
    `${query} guitar lesson intermediate`,
    `${query} guitar lesson`,
  ];

  const videoIds = new Set();

  for (const term of searchTerms) {
    const searchRes = await fetch(
      `${baseUrl}/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(term)}&key=${apiKey}`
    );
    const searchData = await searchRes.json();
    if (searchData.items) {
      searchData.items.forEach((item) => {
        if (item.id?.videoId) videoIds.add(item.id.videoId);
      });
    }
  }

  const ids = [...videoIds];
  if (ids.length === 0) {
    return res.status(200).json([]);
  }

  const videosRes = await fetch(
    `${baseUrl}/videos?part=snippet,statistics&id=${ids.slice(0, 50).join(',')}&key=${apiKey}`
  );
  const videosData = await videosRes.json();
  const videosMap = {};
  (videosData.items || []).forEach((v) => {
    videosMap[v.id] = v;
  });

  const idsSlice = ids.slice(0, 20);

  console.log('[api/youtube] search', {
    query: query.trim(),
    candidateVideos: idsSlice.length,
  });

  const enriched = await Promise.all(
    idsSlice.map(async (videoId) => {
      const v = videosMap[videoId];
      if (!v) return null;

      const snippet = v.snippet || {};
      const stats = v.statistics || {};
      const desc = snippet.description || '';
      const rawTitle = snippet.title || '';
      const channelTitle = snippet.channelTitle || '';

      const parsed = parseVideoTitle(rawTitle, channelTitle);

      const comments = await (async () => {
        try {
          const commentsRes = await fetch(
            `${baseUrl}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&textFormat=plainText&key=${apiKey}`
          );
          const commentsData = await commentsRes.json();
          return (commentsData.items || [])
            .map(
              (c) =>
                c.snippet?.topLevelComment?.snippet?.textDisplay || ''
            )
            .filter(Boolean);
        } catch {
          return [];
        }
      })();

      const chordsUsed = extractChordsFromText(desc);
      const chordsFromDescription = chordsUsed.length > 0;
      const tabsAvailable = TABS_FLAG.test(desc);

      const tags = [];
      if (countCommentMatches(comments, EASY_COMMENTS) >= 3)
        tags.push('👍 Beginner Friendly');
      if (countCommentMatches(comments, LOVE_COMMENTS) >= 3)
        tags.push('❤️ Love It');
      if (countCommentMatches(comments, ACCURATE_COMMENTS) >= 2)
        tags.push('✅ Accurate Chords');
      const titleLower = (snippet.title || '').toLowerCase();
      if (titleLower.includes('easy') || titleLower.includes('simple'))
        tags.push('⭐ Easy Lesson');

      let difficultyScore = 2;
      let difficultyLabel = 'Intermediate';
      if (titleLower.includes('beginner') || titleLower.includes('easy')) {
        difficultyScore = 1;
        difficultyLabel = 'Beginner';
      } else if (titleLower.includes('advanced')) {
        difficultyScore = 3;
        difficultyLabel = 'Advanced';
      }

      const views = parseInt(stats.viewCount || '0', 10);
      const likes = parseInt(stats.likeCount || '0', 10);

      const formatNum = (n) => {
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
      };

      return {
        videoId,
        title: rawTitle,
        cleanedSong: parsed.song,
        cleanedArtist: parsed.artist,
        channel: channelTitle,
        thumbnail:
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          '',
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        views: formatNum(views),
        likes: formatNum(likes),
        difficultyScore,
        difficultyLabel,
        chordsUsed,
        chordsFromDescription,
        tabsAvailable,
        tags,
        transcript: null,
      };
    })
  );

  const filtered = enriched.filter(Boolean);
  filtered.sort((a, b) => a.difficultyScore - b.difficultyScore);
  const top5 = filtered.slice(0, 5);

  return res.status(200).json(top5);
}
