'use strict';

const moment = require('moment');
const mongoosePaginate = require('mongoose-pagination');
const mongoose = require('mongoose');

const User = require('../models/user');
const Follow = require('../models/follow');
const Publication = require('../models/publication');
const Message = require('../models/message');

function probando(req, res) {
  return res.status(200).send({
    message: 'Hola desde los mensajes '
  });
}

async function saveMessage(req, res) {
  const { text, receiver } = req.body;

  if (!text || !receiver) {
    return res.status(400).send({ message: 'Envia los datos necesarios (text y receiver)' });
  }

  if (!mongoose.Types.ObjectId.isValid(receiver)) {
    return res.status(400).send({ message: 'receiver debe ser un ObjectId valido' });
  }

  try {
    const message = new Message({
      emitter: req.user.sub,
      receiver,
      text,
      created_at: moment().unix(),
      viewed: 'false'
    });

    const messageStored = await message.save();
    return res.status(201).send({ message: messageStored });
  } catch (err) {
    return res.status(500).send({ message: 'Error en la peticion', error: err.message });
  }
}

async function getReceivedMessages(req, res) {
  const userId = req.user.sub;
  let page = parseInt(req.params.page, 10) || 1;
  if (page < 1) page = 1;

  const itemsPerPage = 4;
  try {
    const [total, messages] = await Promise.all([
      Message.countDocuments({ receiver: userId }),
      Message.find({ receiver: userId })
        .sort('-created_at')
        .populate('emitter', 'name nick image _id')
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage)
    ]);

    if (!messages || messages.length === 0) {
      return res.status(404).send({ message: 'No hay mensajes' });
    }

    return res.status(200).send({
      total,
      pages: Math.ceil(total / itemsPerPage),
      page,
      messages
    });
  } catch (err) {
    return res.status(500).send({ message: 'Error en la peticion', error: err.message });
  }
}



async function getSentMessages(req, res) {
  const userId = req.user.sub;
  let page = parseInt(req.params.page, 10) || 1;
  if (page < 1) page = 1;

  const itemsPerPage = 4;
  try {
    const [total, messages] = await Promise.all([
      Message.countDocuments({ emitter: userId }),
      Message.find({ emitter: userId })
        .sort('-created_at')
        .populate('emitter receiver', 'name nick image _id')
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage)
    ]);

    if (!messages || messages.length === 0) {
      return res.status(404).send({ message: 'No hay mensajes' });
    }

    return res.status(200).send({
      total,
      pages: Math.ceil(total / itemsPerPage),
      page,
      messages
    });
  } catch (err) {
    return res.status(500).send({ message: 'Error en la peticion', error: err.message });
  }
}

async function getUnviewedMessages(req, res) {
  const userId = req.user.sub;
  try {
    const unviewed = await Message.countDocuments({ receiver: userId, viewed: 'false' });
    return res.status(200).send({ unviewed });
  } catch (err) {
    return res.status(500).send({ message: 'Error en la peticion', error: err.message });
  }
}

function setViewedMessages(req, res) {
  const userId = req.user.sub;  

  Message.Update({receiver: userId, viewed: 'false'}, {viewed: 'true'}, {"multi": true}, (err, messageUpdated) => {
    if (err) {
      return res.status(500).send({message: 'Error en la peticion', error: err.message});
    }

    return res.status(200).send({messages: messageUpdated});
  });


   
}

module.exports = {
  probando,
  saveMessage,
  getReceivedMessages,
  getSentMessages,
  getUnviewedMessages,
  setViewedMessages
};
