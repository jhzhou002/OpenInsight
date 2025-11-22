const express = require("express");
const { regUser } = require("../router_handler/user");
const { login } = require("../router_handler/login");

const router = express.Router();

router.post("/register", regUser);

// 登录
router.post("/login", login);

module.exports = router;
