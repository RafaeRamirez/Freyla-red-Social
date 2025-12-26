'use strict';

const Notification = require('../models/notification');

async function getNotifications(req, res) {
  const userId = req.user.sub;
  const limit = Math.min(30, Math.max(1, Number(req.query.limit || 10)));

  try {
    const [notifications, unviewed] = await Promise.all([
      Notification.find({ user: userId })
        .sort('-created_at')
        .limit(limit)
        .populate('actor', 'name surname nick image')
        .populate('publication', 'text'),
      Notification.countDocuments({ user: userId, seen: false }),
    ]);

    return res.status(200).send({ notifications, unviewed });
  } catch (err) {
    return res.status(500).send({ message: 'Error en la peticion', error: err.message });
  }
}

async function setNotificationsSeen(req, res) {
  const userId = req.user.sub;
  try {
    const updated = await Notification.updateMany({ user: userId, seen: false }, { seen: true });
    return res.status(200).send({ notifications: updated });
  } catch (err) {
    return res.status(500).send({ message: 'Error en la peticion', error: err.message });
  }
}

module.exports = {
  getNotifications,
  setNotificationsSeen,
};
