"use strict";

const jwt = require("jwt-simple");
const moment = require("moment");
const User = require("../models/user");
const secret = "clave_secreta_curso_freyla";

exports.ensureAuth = function (req, res, next) {
  // Aceptar tanto "Authorization" como "authorization" y quitar prefijo Bearer si viene
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return res
      .status(403)
      .send({ message: "La peticion no tiene la cabecera de autenticacion" });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").replace(/['"]+/g, "");
  let payload;

  try {
    payload = jwt.decode(token, secret);

    if (payload.exp <= moment().unix()) {
      return res.status(401).send({
        message: "El token ha expirado",
      });
    }
  } catch (ex) {
    return res.status(404).send({
      message: "El token no es valido",
    });
  }

  req.user = payload;  // <--- Aquí va a req, no a res

  User.updateOne({ _id: payload.sub }, { lastActive: new Date() }).catch(() => {});

  next();
};

