'use strict';

const mongoose = require('mongoose');
const FriendRequest = require('../models/friendRequest');

async function sendRequest(req, res) {
  const requester = req.user.sub;
  const recipient = req.params.id || req.body.recipient;

  if (!recipient) {
    return res.status(400).send({ message: 'El usuario a conectar es obligatorio' });
  }

  if (!mongoose.Types.ObjectId.isValid(recipient)) {
    return res.status(400).send({ message: 'ID de usuario no valido' });
  }

  if (requester === recipient) {
    return res.status(400).send({ message: 'No puedes enviarte una solicitud a ti mismo' });
  }

  try {
    const existing = await FriendRequest.findOne({
      $or: [
        { requester, recipient, status: { $in: ['pending', 'accepted'] } },
        { requester: recipient, recipient: requester, status: { $in: ['pending', 'accepted'] } }
      ]
    });

    if (existing) {
      return res.status(400).send({ message: 'Ya existe una solicitud pendiente o ya son amigos' });
    }

    const request = new FriendRequest({ requester, recipient });
    const stored = await request.save();
    return res.status(201).send({ request: stored });
  } catch (err) {
    return res.status(500).send({ message: 'Error al enviar la solicitud', error: err.message });
  }
}

async function getSentRequests(req, res) {
  try {
    const userId = req.user.sub;
    const requests = await FriendRequest.find({ requester: userId, status: 'pending' })
      .populate('recipient', 'name surname nick email image')
      .sort({ createdAt: -1 });

    return res.status(200).send({ requests });
  } catch (err) {
    return res.status(500).send({ message: 'Error al obtener solicitudes enviadas', error: err.message });
  }
}

async function getReceivedRequests(req, res) {
  try {
    const userId = req.user.sub;
    const requests = await FriendRequest.find({ recipient: userId, status: 'pending' })
      .populate('requester', 'name surname nick email image')
      .sort({ createdAt: -1 });

    return res.status(200).send({ requests });
  } catch (err) {
    return res.status(500).send({ message: 'Error al obtener solicitudes recibidas', error: err.message });
  }
}

async function acceptRequest(req, res) {
  try {
    const userId = req.user.sub;
    const requestId = req.params.id;

    const request = await FriendRequest.findOneAndUpdate(
      { _id: requestId, recipient: userId, status: 'pending' },
      { status: 'accepted' },
      { new: true }
    );

    if (!request) {
      return res.status(404).send({ message: 'Solicitud no encontrada' });
    }

    return res.status(200).send({ request });
  } catch (err) {
    return res.status(500).send({ message: 'Error al aceptar la solicitud', error: err.message });
  }
}

async function rejectRequest(req, res) {
  try {
    const userId = req.user.sub;
    const requestId = req.params.id;

    const request = await FriendRequest.findOneAndUpdate(
      { _id: requestId, recipient: userId, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    );

    if (!request) {
      return res.status(404).send({ message: 'Solicitud no encontrada' });
    }

    return res.status(200).send({ request });
  } catch (err) {
    return res.status(500).send({ message: 'Error al rechazar la solicitud', error: err.message });
  }
}

async function cancelRequest(req, res) {
  try {
    const userId = req.user.sub;
    const requestId = req.params.id;

    const request = await FriendRequest.findOneAndDelete({
      _id: requestId,
      requester: userId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).send({ message: 'Solicitud no encontrada' });
    }

    return res.status(200).send({ message: 'Solicitud cancelada' });
  } catch (err) {
    return res.status(500).send({ message: 'Error al cancelar la solicitud', error: err.message });
  }
}

async function getFriends(req, res) {
  try {
    const userId = req.user.sub;

    const requests = await FriendRequest.find({
      status: 'accepted',
      $or: [{ requester: userId }, { recipient: userId }]
    })
      .populate('requester', 'name surname nick email image')
      .populate('recipient', 'name surname nick email image')
      .sort({ updatedAt: -1 });

    const friends = requests
      .map((request) => {
        const requester = request.requester;
        const recipient = request.recipient;
        if (requester && requester._id?.toString() !== userId) {
          return requester;
        }
        if (recipient && recipient._id?.toString() !== userId) {
          return recipient;
        }
        return null;
      })
      .filter(Boolean);

    return res.status(200).send({ friends });
  } catch (err) {
    return res.status(500).send({ message: 'Error al obtener amigos', error: err.message });
  }
}

module.exports = {
  sendRequest,
  getSentRequests,
  getReceivedRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getFriends
};
