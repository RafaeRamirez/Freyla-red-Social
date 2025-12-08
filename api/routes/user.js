  "use strict";

// Importar módulos
const express = require("express");
const UserController = require("../controllers/user");
const md_auth = require("../middlewares/authenticated");
const multer = require("multer");
const path = require("path");

// Configuración de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/users"); // Carpeta donde se guardan las imágenes
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para cada archivo
  }
});

const upload = multer({ storage });

// Crear router
const api = express.Router();

// Rutas públicas
api.get("/home", UserController.home);
api.get("/pruebas", md_auth.ensureAuth, UserController.pruebas);
api.post("/register", UserController.saveUser);
api.post("/login", UserController.loginUser);
api.get("/user/:id", md_auth.ensureAuth, UserController.getUser);
api.get("/users/:page?", md_auth.ensureAuth, UserController.getUsers);
api.get("/counters/:id?", md_auth.ensureAuth, UserController.getCounters);
api.put("/update-user/:id", md_auth.ensureAuth, UserController.updateUser);
api.get("/get-image-user/:imageFile",UserController.getImageFile);


// Ruta para subir imagen con Multer
api.post("/update-image-user/:id", [md_auth.ensureAuth, upload.single("image")], UserController.uploadImage);

// Exportar el router
module.exports = api;
