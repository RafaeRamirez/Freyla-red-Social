"use strict";

const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("../services/jwt");
const mongoose = require("mongoose");
const Follow = require("../models/follow");
const Publication = require("../models/publication");
const fs = require("fs");
const path = require("path");

// ========================
// FUNCIONES AUXILIARES
// ========================
function removeFilesOfUploads(res, filePath, message) {
  fs.unlink(filePath, () => {
    return res.status(400).send({ message });
  });
}

// ========================
// RUTA BASE DE PRUEBA
// ========================
function home(req, res) {
  return res.status(200).send({ message: "Te amo bebe" });
}

// ========================
// RUTA DE PRUEBA
// ========================
function pruebas(req, res) {
  return res.status(200).send({ message: "Hola mundo desde mi API REST con Node y Express" });
}

// ========================
// REGISTRAR USUARIO
// ========================
async function saveUser(req, res) {
  const params = req.body;

  if (!params.name || !params.surname || !params.nick || !params.email || !params.password) {
    return res.status(400).send({ message: "Envia todos los campos necesarios" });
  }

  try {
    const emailLower = params.email.toLowerCase();
    const nickLower = params.nick.toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ email: emailLower }, { nick: nickLower }],
    });

    if (existingUser) {
      const emailTaken = existingUser.email === emailLower;
      const nickTaken = existingUser.nick === nickLower;
      let message = "El email o nick ya esta en uso.";
      if (emailTaken && nickTaken) {
        message = "El email y el nick ya estan en uso.";
      } else if (emailTaken) {
        message = "El email ya esta en uso.";
      } else if (nickTaken) {
        message = "El nick ya esta en uso.";
      }
      return res.status(409).send({ message, emailTaken, nickTaken });
    }

    const hashedPassword = await bcrypt.hash(params.password, 10);

    const user = new User({
      name: params.name,
      surname: params.surname,
      nick: nickLower,
      email: emailLower,
      password: hashedPassword,
      role: "ROLE_USER",
      image: null,
    });

    const userStored = await user.save();
    userStored.password = undefined; // No mostrar contrasena

    return res.status(201).send({ user: userStored });
  } catch (error) {
    return res.status(500).send({ message: "Error en el servidor al guardar el usuario.", error: error.message });
  }
}

// ========================
// LOGIN USUARIO
// ========================
async function loginUser(req, res) {
  if (!req.body) {
    return res.status(400).send({ message: "No se recibio el cuerpo de la peticion" });
  }

  const { email, password, gettoken } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "Debe enviar email y contrasena" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(401).send({ message: "Correo o contrasena incorrectos." });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).send({ message: "Correo o contrasena incorrectos." });

    if (gettoken) {
      const token = jwt.createToken(user);
      return res.status(200).send({ token });
    } else {
      user.password = undefined;
      return res.status(200).send({ user });
    }
  } catch (error) {
    return res.status(500).send({ message: "Error en el servidor al iniciar sesion.", error: error.message });
  }
}

// ========================
// OBTENER UN USUARIO
// ========================
async function getUser(req, res) {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send({ message: "ID de usuario no valido" });
  }

  try {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).send({ message: "El usuario no existe" });
    }

    const { following, followed } = await followThisUser(req.user.sub, userId);

    return res.status(200).send({
      user,
      following,
      followed,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error en la peticion",
      error: error.message,
    });
  }
}

// ========================
// FOLLOW HELPERS
// ========================
async function followThisUser(identity_user_id, user_id) {
  try {
    const following = await Follow.findOne({
      user: identity_user_id,
      followed: user_id,
    });

    const followed = await Follow.findOne({
      user: user_id,
      followed: identity_user_id,
    });

    return { following, followed };
  } catch (err) {
    console.error("Error en followThisUser:", err);
    throw err;
  }
}

// ========================
// OBTENER USUARIOS PAGINADOS
// ========================
async function getUsers(req, res) {
  let page = parseInt(req.params.page, 10) || 1;
  if (page < 1) page = 1;

  const itemsPerPage = 5;

  try {
    const skip = (page - 1) * itemsPerPage;
    const [users, total, followInfo] = await Promise.all([
      User.find().sort("_id").skip(skip).limit(itemsPerPage).select("-password"),
      User.countDocuments(),
      followUserIds(req.user.sub),
    ]);

    if (!users.length) {
      return res.status(404).send({ message: "No hay usuarios disponibles" });
    }

    return res.status(200).send({
      users,
      users_following: followInfo.following,
      users_follow_me: followInfo.followed,
      total,
      pages: Math.ceil(total / itemsPerPage),
      page,
      following: followInfo.following,
      followed: followInfo.followed,
    });
  } catch (error) {
    return res.status(500).send({ message: "Error en la peticion", error: error.message });
  }
}

async function followUserIds(user_id) {
  const followingDocs = await Follow.find({ user: user_id })
    .select({ _id: 0, followed: 1 })
    .lean();

  const followedDocs = await Follow.find({ followed: user_id })
    .select({ _id: 0, user: 1 })
    .lean();

  return {
    following: followingDocs.map((f) => f.followed),
    followed: followedDocs.map((f) => f.user),
  };
}

// Obtener contadores (a quien sigo, quien me sigue y mis publicaciones)
async function getCounters(req, res) {
  let userId = req.user.sub;

  if (req.params.id) {
    userId = req.params.id;
  }

  try {
    const value = await getCountFollow(userId);
    return res.status(200).send(value);
  } catch (err) {
    console.error("Error en getCounters:", err);
    return res.status(500).send({
      message: "Error en la peticion",
      error: err.message,
    });
  }
}

// Devuelve cuantos sigo, cuantos me siguen y cuantas publicaciones tengo
async function getCountFollow(user_id) {
  try {
    const [following, followed, publications] = await Promise.all([
      Follow.countDocuments({ user: user_id }),
      Follow.countDocuments({ followed: user_id }),
      Publication.countDocuments({ user: user_id }),
    ]);

    return { following, followed, publications };
  } catch (err) {
    console.error("Error en getCountFollow:", err);
    throw err;
  }
}

// ========================
// ACTUALIZAR USUARIO
// ========================
async function updateUser(req, res) {
  const userId = req.params.id;
  const update = { ...req.body };

  if (userId !== req.user.sub) {
    return res.status(403).send({ message: "No tienes permiso para actualizar los datos de este usuario" });
  }

  try {
    const currentPassword = update.currentPassword;
    if (!currentPassword) {
      return res.status(400).send({ message: "Debes enviar la contrasena actual." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ message: "No se ha podido actualizar el usuario" });

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).send({ message: "Contrasena actual incorrecta." });
    }

    delete update.currentPassword;

    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    } else {
      delete update.password;
    }

    const userUpdated = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");
    if (!userUpdated) return res.status(404).send({ message: "No se ha podido actualizar el usuario" });

    return res.status(200).send({ user: userUpdated });
  } catch (error) {
    return res.status(500).send({ message: "Error en la peticion", error: error.message });
  }
}

// ========================
// SUBIR IMAGEN
// ========================
async function uploadImage(req, res) {
  const userId = req.params.id;

  if (!req.file) return res.status(400).send({ message: "No se ha subido ninguna imagen" });

  const file_path = req.file.path;
  const file_name = path.basename(file_path);
  const file_ext = path.extname(file_path).toLowerCase().replace(".", "");
  const allowedExtensions = ["png", "jpg", "jpeg", "gif"];

  try {
    if (userId !== req.user.sub) return removeFilesOfUploads(res, file_path, "No tienes permiso para actualizar esta imagen");

    if (!allowedExtensions.includes(file_ext)) return removeFilesOfUploads(res, file_path, "Extension no valida");

    const userUpdated = await User.findByIdAndUpdate(userId, { image: file_name }, { new: true }).select("-password");

    if (!userUpdated) return res.status(404).send({ message: "No se ha podido actualizar el usuario" });

    return res.status(200).send({ user: userUpdated });
  } catch (error) {
    return res.status(500).send({ message: "Error en el servidor al subir la imagen.", error: error.message });
  }
}

// ========================
// MOSTRAR IMAGEN
// ========================
function getImageFile(req, res) {
  const imageFile = req.params.imageFile;
  const pathFile = "./uploads/users/" + imageFile;

  fs.exists(pathFile, (exists) => {
    if (exists) {
      return res.sendFile(path.resolve(pathFile));
    } else {
      return res.status(404).send({ message: "No existe la imagen..." });
    }
  });
}

// ========================
// EXPORTAR TODAS LAS FUNCIONES
// ========================
module.exports = {
  home,
  pruebas,
  saveUser,
  loginUser,
  getUser,
  getUsers,
  updateUser,
  uploadImage,
  getImageFile,
  getCounters,
};
