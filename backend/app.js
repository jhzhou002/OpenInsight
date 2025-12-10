const express = require("express");
const cors = require("cors");
const etlScheduler = require("./services/etlScheduler");

const app = express();

app.use(express.static(__dirname + "/dist"));

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 在路由之前封装统一处理函数
app.use((req, res, next) => {
  res.cc = function (msg, code = 400) {
    res.status(code);
    res.send({
      code,
      msg: msg instanceof Error ? msg.message : msg,
    });
  };
  next();
});

// 移除了JWT token验证中间件 - 现在允许直接访问

// 路由模块
const userRouter = require("./router/user");
app.use("/api/common", userRouter);
const homeRouter = require("./router/home");
app.use("/api/home", homeRouter);
const etlRouter = require("./router/etl");
app.use("/api/etl", etlRouter);

// 定义错误级别中间件
app.use((err, req, res, next) => {
  console.error(err);
  res.cc(err.message || "服务器内部错误", 500);
});

app.listen(8081, async () => {
  console.log("服务启动成功，端口：8081");

  // 启动ETL定时任务调度器
  try {
    await etlScheduler.initScheduler();
  } catch (error) {
    console.error("ETL调度器启动失败:", error);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务...');
  etlScheduler.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务...');
  etlScheduler.stopAll();
  process.exit(0);
});
