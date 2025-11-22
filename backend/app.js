const express = require("express");
const cors = require("cors");

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
app.use("/common", userRouter);
const homeRouter = require("./router/home");
app.use("/home", homeRouter);

// 定义错误级别中间件
app.use((err, req, res, next) => {
  console.error(err);
  res.cc(err.message || "服务器内部错误", 500);
});

app.listen(8081, () => {
  console.log("服务启动");
});
