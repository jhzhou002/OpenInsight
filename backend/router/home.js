const express = require("express");
const { getOptions, getProjectData, getGithubData, getAllData, getInitData, getOpenRankData } = require("../router_handler/home");
const { getAnalysisData, generateAIAnalysis } = require("../router_handler/analysis");

const router = express.Router();

// 获取全部项目的下拉框
router.get("/getOptions", getOptions);

router.get("/getProjectData", getProjectData);

router.get("/getGithubData", getGithubData);

router.get("/getAllData", getAllData);

router.get("/getInitData", getInitData);

router.get("/getOpenRankData", getOpenRankData);

// AI分析相关接口
router.post("/getAnalysisData", getAnalysisData);

router.post("/generateAIAnalysis", generateAIAnalysis);

module.exports = router;
