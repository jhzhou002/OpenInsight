const bcrypt = require("bcryptjs");
const db = require("../db/index");

exports.regUser = (req, res) => {
  let { user_name, pass_word } = req.body || {};
  if (!user_name || !pass_word) {
    return res.cc("用户名或密码不能为空");
  }

  user_name = db.escape(user_name)
  pass_word = db.escape(pass_word)

  // 检查用户名是否被占用
  const sqlUserName = "select * from user_info where user_name = ?";
  db.query(sqlUserName, user_name, (err, results) => {
    if (err) {
      return res.cc(err);
    }

    if (results.length > 0) {
      return res.cc("用户名被占用，请更换其他用户名！");
    }

    // 用户名可以使用
    pass_word = bcrypt.hashSync(pass_word, 10);

    const sqlInsert = "insert into user_info (user_name, pass_word) values (?, ?)";
    db.query(sqlInsert, [user_name, pass_word], (err, results) => {
      if (err) {
        return res.cc(err);
      }
      if (results.affectedRows !== 1) return res.cc("注册失败");
      res.cc("注册成功", 200);
    });
  });
};
