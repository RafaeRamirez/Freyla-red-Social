'use strict';

const Publication = require('../models/publication');
const Follow = require('../models/follow');
const UserPreference = require('../models/userPreference');

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);

function extractTags(text) {
  if (!text) {
    return [];
  }
  const matches = text.match(/#[\w-]+/g) || [];
  return matches.map((tag) => tag.slice(1).toLowerCase());
}

function extractKeywords(text) {
  if (!text) {
    return [];
  }
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4);
  return Array.from(new Set(words)).slice(0, 10);
}

function getContentType(file) {
  if (!file) {
    return 'text';
  }
  const ext = file.split('.').pop().toLowerCase();
  return VIDEO_EXTENSIONS.has(ext) ? 'video' : 'image';
}

function buildScoreMap(prefs) {
  const map = new Map();
  prefs.forEach((pref) => {
    const key = `${pref.type}:${pref.value}`;
    map.set(key, pref.score || 0);
  });
  return map;
}

function computePreferenceScore(publication, scoreMap) {
  let score = 0;
  if (publication.user) {
    score += scoreMap.get(`author:${publication.user.toString()}`) || 0;
  }
  score += scoreMap.get(`content_type:${getContentType(publication.file)}`) || 0;

  const tags = extractTags(publication.text || '');
  for (const tag of tags) {
    score += scoreMap.get(`tag:${tag}`) || 0;
  }
  const keywords = extractKeywords(publication.text || '');
  for (const keyword of keywords) {
    score += scoreMap.get(`keyword:${keyword}`) || 0;
  }
  return score;
}

function computeRecencyScore(publication) {
  const raw = publication.created_at;
  if (!raw) {
    return 0;
  }
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  const timestampMs = Number.isNaN(numeric)
    ? Date.parse(String(raw))
    : numeric < 1_000_000_000_000
      ? numeric * 1000
      : numeric;
  if (!timestampMs || Number.isNaN(timestampMs)) {
    return 0;
  }
  const ageMs = Date.now() - timestampMs;
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  const normalized = Math.max(0, 1 - ageMs / maxAgeMs);
  return normalized * 3;
}

async function getPersonalizedPublications(req, res) {
  const page = Number(req.params.page || 1);
  const itemsPerPage = 4;

  try {
    const follows = await Follow.find({ user: req.user.sub }).populate('followed').exec();

    if (!follows || !follows.length) {
      return res.status(404).send({ message: 'No estas siguiendo a nadie aun' });
    }

    const follows_clean = follows.map((follow) => follow.followed);
    follows_clean.push(req.user.sub);

    const result = await Publication.paginate(
      { user: { $in: follows_clean } },
      {
        page,
        limit: itemsPerPage * 4,
        sort: '-created_at',
        populate: [
          { path: 'user', select: 'name surname nick image' },
          { path: 'shared_from', populate: { path: 'user', select: 'name surname nick image' } },
          { path: 'reactions.user', select: 'name surname nick image' },
          { path: 'comments.user', select: 'name surname nick image' },
        ],
      }
    );

    if (!result || !result.docs || !result.docs.length) {
      return res.status(404).send({ message: 'No hay publicaciones' });
    }

    const prefs = await UserPreference.find({ user: req.user.sub }).lean().exec();
    const scoreMap = buildScoreMap(prefs);

    const scored = result.docs.map((doc) => {
      const prefScore = computePreferenceScore(doc, scoreMap);
      const recencyScore = computeRecencyScore(doc);
      return { doc, score: prefScore * 0.7 + recencyScore * 0.3 };
    });

    scored.sort((a, b) => b.score - a.score);
    const paged = scored.slice(0, itemsPerPage).map((entry) => entry.doc);

    return res.status(200).send({
      total_items: result.totalDocs,
      pages: result.totalPages,
      page: result.page,
      publications: paged,
    });
  } catch (err) {
    return res.status(500).send({
      message: 'Error al devolver publicaciones',
      error: err.message,
    });
  }
}

module.exports = {
  getPersonalizedPublications,
};
