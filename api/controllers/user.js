"use strict";

const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("../services/jwt");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// ========================
// FUNCIONES AUXILIARES
// ========================
function removeFilesOfUploads(res, filePath, message) {
  fs.unlink(filePath, (err) => {
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
    return res.status(400).send({ message: "Envía todos los campos necesarios" });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ email: params.email.toLowerCase() }, { nick: params.nick.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(409).send({ message: "El usuario ya existe con ese email o nick." });
    }

    const hashedPassword = await bcrypt.hash(params.password, 10);

    const user = new User({
      name: params.name,
      surname: params.surname,
      nick: params.nick.toLowerCase(),
      email: params.email.toLowerCase(),
      password: hashedPassword,
      role: "ROLE_USER",
      image: null,
    });

    const userStored = await user.save();
    userStored.password = undefined; // No mostrar contraseña

    return res.status(201).send({ user: userStored });
  } catch (error) {
    return res.status(500).send({ message: "Error en el servidor al guardar el usuario.", error: error.message });
  }
}

// ========================
// LOGIN USUARIO
// ========================
async function loginUser(req, res) {
  const { email, password, gettoken } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "Debe enviar email y contraseña" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(401).send({ message: "Correo o contraseña incorrectos." });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).send({ message: "Correo o contraseña incorrectos." });

    if (gettoken) {
      const token = jwt.createToken(user);
      return res.status(200).send({ token });
    } else {
      user.password = undefined;
      return res.status(200).send({ user });
    }
  } catch (error) {
    return res.status(500).send({ message: "Error en el servidor al iniciar sesión.", error: error.message });
  }
}

// ========================
// OBTENER UN USUARIO
// ========================
async function getUser(req, res) {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send({ message: "ID de usuario no válido" });
  }

  try {
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).send({ message: "El usuario no existe" });

    return res.status(200).send({ user });
  } catch (error) {
    return res.status(500).send({ message: "Error en la petición", error: error.message });
  }
}

// ========================
// OBTENER USUARIOS PAGINADOS
// ========================
async function getUsers(req, res) {
  let page = req.params.page ? parseInt(req.params.page) : 1;
  if (isNaN(page) || page <= 0) page = 1;

  const itemsPerPage = 5;

  try {
    const skip = (page - 1) * itemsPerPage;
    const users = await User.find().sort("_id").skip(skip).limit(itemsPerPage).select("-password");
    const total = await User.countDocuments();

    if (users.length === 0) return res.status(404).send({ message: "No hay usuarios disponibles" });

    return res.status(200).send({
      users,
      total,
      pages: Math.ceil(total / itemsPerPage),
      page,
    });
  } catch (error) {
    return res.status(500).send({ message: "Error en la petición", error: error.message });
  }
}

// ========================
// ACTUALIZAR USUARIO
// ========================
async function updateUser(req, res) {
  const userId = req.params.id;
  const update = req.body;

  if (update.password) delete update.password;

  if (userId !== req.user.sub) {
    return res.status(403).send({ message: "No tienes permiso para actualizar los datos de este usuario" });
  }

  try {
    const userUpdated = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");
    if (!userUpdated) return res.status(404).send({ message: "No se ha podido actualizar el usuario" });

    return res.status(200).send({ user: userUpdated });
  } catch (error) {
    return res.status(500).send({ message: "Error en la petición", error: error.message });
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

    if (!allowedExtensions.includes(file_ext)) return removeFilesOfUploads(res, file_path, "Extensión no válida");

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
function getFollowedUsers(req, res) {
  const userId = req.user.sub;




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
};
