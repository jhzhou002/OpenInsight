const db = require("../db/index");

exports.getOptions = (req, res) => {
  const sql = "select project_id, company_name, project_name from github";
  db.query(sql, (err, results) => {
    if (err) return res.cc(err);

    const dataRes = results.map((item) => ({
      value: item.project_id,
      label: item.company_name + "/" + item.project_name,
    }));

    return res.send({
      msg: "操作成功",
      data: dataRes,
      code: 200,
    });
  });
};

const typeArr = [
  "project_activity",
  "project_attention",
  "developer_activity",
  "openrank",
  "pr_reviews",
  "pr_response_time",
];
exports.getProjectData = (req, res) => {
  let { type, project_id } = req.query;
  const sql = `select ?? from github where project_id = ?`;
  db.query(sql, [type, project_id], (err, results) => {
    if (err) return res.cc(err);
    if (!results.length) return res.cc("无数据");
    if (typeArr.includes(type)) {
      data = JSON.parse(results[0][type]);
    } else {
      data = results[0][type];
    }

    return res.send({
      msg: "操作成功",
      data,
      code: 200,
    });
  });
};

const filterNum = (str) => {
  return (+str).toFixed(2);
};

exports.getGithubData = (req, res) => {
  const pageInfo = req.query;
  const page = +pageInfo.page || 1;
  const page_size = +pageInfo.page_size || 25;
  const sql = `select project_id, company_name, project_name, influence, response, activity, trend, github from github limit ?, ?`;
  db.query(sql, [(page - 1) * page_size, page_size], (err, results) => {
    if (err) return res.cc(err);
    const dataRes = results.map((item) => ({
      project_id: item.project_id,
      influence: filterNum(item.influence),
      response: filterNum(item.response),
      activity: filterNum(item.activity),
      trend: filterNum(item.trend),
      github: filterNum(item.github),
      name: item.company_name + "/" + item.project_name,
    }));

    const totalSql = `select count(*) as totalRows from github`;
    db.query(totalSql, (err, results) => {
      if (err) return res.cc(err);
      return res.send({
        msg: "操作成功",
        data: {
          list: dataRes,
          total: results[0]["totalRows"],
        },
        code: 200,
      });
    });
  });
};

// 获取全部数据（暂未使用）
exports.getAllData = (req, res) => {
  const sql = `select * from github`;
  db.query(sql, (err, results) => {
    if (err) return res.cc(err);

    const dataRes = results.map((item) => ({
      project_id: item.project_id,
      influence: filterNum(item.influence),
      response: filterNum(item.response),
      activity: filterNum(item.activity),
      trend: filterNum(item.trend),
      github: filterNum(item.github),
      name: item.company_name + "/" + item.project_name,
      project_activity: JSON.parse(item.project_activity),
      project_attention: JSON.parse(item.project_attention),
      developer_activity: JSON.parse(item.developer_activity),
      openrank: JSON.parse(item.openrank),
      pr_reviews: JSON.parse(item.pr_reviews),
      pr_response_time: JSON.parse(item.pr_response_time),
      openrank_avg: filterNum(item.openrank_avg),
    }));

    return res.send({
      msg: "操作成功",
      data: dataRes,
      code: 200,
    });
  });
};

const calculateAverage = (values) => {
  const sum = values.reduce((total, value) => total + value, 0);
  return (sum / values.length).toFixed(2);
};
// 获取初始化数据
exports.getInitData = (req, res) => {
  const sql = `select * from github where project_id in (4, 8, 9)`;
  db.query(sql, (err, results) => {
    if (err) return res.cc(err);
    const dataRes = results.map((item) => ({
      project_id: item.project_id,
      influence: filterNum(item.influence),
      response: filterNum(item.response),
      activity: filterNum(item.activity),
      trend: filterNum(item.trend),
      github: filterNum(item.github),
      name: item.company_name + "/" + item.project_name,
      project_activity: JSON.parse(item.project_activity),
      project_attention: JSON.parse(item.project_attention),
      developer_activity: JSON.parse(item.developer_activity),
      openrank: JSON.parse(item.openrank),
      pr_reviews: JSON.parse(item.pr_reviews),
      pr_response_time: JSON.parse(item.pr_response_time),
      openrank_avg: filterNum(item.openrank_avg),
    }));

    const avgSql = "select openrank_avg, github from github";
    db.query(avgSql, (err, results) => {
      if (err) return res.cc(err);
      const openrankValues = results.map((row) => +row.openrank_avg);
      const githubValues = results.map((row) => +row.github);
      const openrankAverage = calculateAverage(openrankValues);
      const githubAverage = calculateAverage(githubValues);
      const averages = {
        openrankAverage,
        githubAverage,
      };

      return res.send({
        msg: "操作成功",
        data: {
          list: dataRes,
          other: averages,
        },
        code: 200,
      });
    });
  });
};
