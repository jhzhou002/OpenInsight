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

// 在路由之前配置解析token中间件
const { expressjwt } = require("express-jwt");
const config = require("./config");
// 路由带/api 不用权限校验
app.use(expressjwt({ secret: config.jwtSecretKey, algorithms: ["HS256"] }).unless({ path: [/^\/common/] }));

// 路由模块
const userRouter = require("./router/user");
app.use("/common", userRouter);
const homeRouter = require("./router/home");
app.use("/home", homeRouter);

// 定义错误级别中间件
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    res.status(401);
    return res.cc("没有权限", 401);
  }
});

app.listen(8081, () => {
  console.log("服务启动");
});
