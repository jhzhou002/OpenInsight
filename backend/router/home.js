const express = require("express");
const { getOptions, getProjectData, getGithubData, getAllData, getInitData } = require("../router_handler/home");

const router = express.Router();

// 获取全部项目的下拉框
router.get("/getOptions", getOptions);

router.get("/getProjectData", getProjectData);

router.get("/getGithubData", getGithubData);

router.get("/getAllData", getAllData);

router.get("/getInitData", getInitData);

module.exports = router;
