const bcrypt = require("bcryptjs");
const db = require("../db/index");
const jwt = require("jsonwebtoken");
const config = require("../config");

exports.login = (req, res) => {
  const user_info = req.body;

  let user_name = db.escape(user_info.user_name);
  let pass_word = db.escape(user_info.pass_word);

  if(/[`~!@#$%^&*()_\-+=<>?:"{}|,\/;\[\]·~！@#￥%……&*（）——\-+={}|《》？：“”【】、；‘’，。、]/g.test(user_name)){
    return res.cc("禁止使用特殊字符搞些歪门邪道");
  }

  const sqlSearch = "select * from user_info where user_name = ?";
  db.query(sqlSearch, user_name, (err, results) => {
    if (err) return res.cc(err);
    if (results.length !== 1) return res.cc("登录失败");
    // 判断密码是否正确
    const compareRes = bcrypt.compareSync(pass_word, results[0].pass_word);
    if (!compareRes) return res.cc("密码错误");

    // 生成jwt字符串
    const userJwtInfo = {
      ...results[0],
      pass_word: "", // 剔除敏感信息
    };
    const tokenStr = jwt.sign(userJwtInfo, config.jwtSecretKey, {
      expiresIn: config.expiresIn, // token有效期
    });
    return res.send({
      code: 200,
      msg: "登录成功",
      data: {
        token: tokenStr,
      },
    });
  });
};
