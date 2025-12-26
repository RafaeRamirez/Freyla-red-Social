'use strict';

const moment = require('moment');
const Publication = require('../models/publication');
const User = require('../models/user');
const UserPreference = require('../models/userPreference');

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);
const MAX_SUMMARY = 8;

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

async function upsertPreference(userId, type, value, deltaScore) {
  if (!value) {
    return null;
  }
  return UserPreference.findOneAndUpdate(
    { user: userId, type, value },
    { $inc: { score: deltaScore }, $set: { updated_at: moment().unix() } },
    { new: true, upsert: true }
  ).exec();
}

async function refreshSummary(userId, type) {
  const docs = await UserPreference.find({ user: userId, type })
    .sort({ score: -1, updated_at: -1 })
    .limit(MAX_SUMMARY)
    .lean()
    .exec();

  const summary = docs.map((doc) => ({ value: doc.value, score: doc.score }));
  const update = {};
  if (type === 'tag') {
    update['preferences.tags'] = summary;
  } else if (type === 'keyword') {
    update['preferences.keywords'] = summary;
  } else if (type === 'author') {
    update['preferences.authors'] = summary;
  } else if (type === 'content_type') {
    update['preferences.contentTypes'] = summary;
  }
  update['preferences.updated_at'] = moment().unix();

  await User.findByIdAndUpdate(userId, update).exec();
}

async function trackPreference(req, res) {
  const userId = req.user.sub;
  const { event, publicationId, searchText, commentText, authorId } = req.body || {};

  if (!event) {
    return res.status(400).send({ message: 'Evento requerido.' });
  }

  const weightMap = {
    reaction: 3,
    comment: 4,
    follow: 2,
    view: 2,
    search: 5,
  };
  const weight = weightMap[event] || 1;

  const typesTouched = new Set();

  try {
    if (event === 'follow' && authorId) {
      await upsertPreference(userId, 'author', authorId, weight);
      typesTouched.add('author');
    }

    if (event === 'search' && searchText) {
      const tags = extractTags(searchText);
      const keywords = extractKeywords(searchText);
      for (const tag of tags) {
        await upsertPreference(userId, 'tag', tag, weight);
        typesTouched.add('tag');
      }
      for (const keyword of keywords) {
        await upsertPreference(userId, 'keyword', keyword, weight);
        typesTouched.add('keyword');
      }
    }

    if (publicationId) {
      const publication = await Publication.findById(publicationId).lean().exec();
      if (publication) {
        const contentType = getContentType(publication.file);
        await upsertPreference(userId, 'content_type', contentType, weight);
        typesTouched.add('content_type');

        if (publication.user) {
          await upsertPreference(userId, 'author', publication.user.toString(), weight);
          typesTouched.add('author');
        }

        const textSources = [publication.text || '', commentText || ''].join(' ');
        const tags = extractTags(textSources);
        const keywords = extractKeywords(textSources);
        for (const tag of tags) {
          await upsertPreference(userId, 'tag', tag, weight);
          typesTouched.add('tag');
        }
        for (const keyword of keywords) {
          await upsertPreference(userId, 'keyword', keyword, weight);
          typesTouched.add('keyword');
        }
      }
    }

    for (const type of typesTouched) {
      await refreshSummary(userId, type);
    }

    return res.status(200).send({ ok: true });
  } catch (err) {
    return res.status(500).send({ message: 'Error al actualizar preferencias', error: err.message });
  }
}

module.exports = {
  trackPreference,
};
