const db = require("./db/index");
const bcrypt = require("bcryptjs");

const userName = "admin";
const password = "password123";

console.log(`Attempting to verify login for user: ${userName}`);

const sqlSearch = "select * from user_info where user_name = ?";
db.query(sqlSearch, userName, (err, results) => {
    if (err) {
        console.error("Database error:", err);
        process.exit(1);
    }
    if (results.length !== 1) {
        console.error("User not found!");
        process.exit(1);
    }

    const user = results[0];
    console.log("User found in database.");

    const compareRes = bcrypt.compareSync(password, user.pass_word);
    if (!compareRes) {
        console.error("Password verification failed!");
        process.exit(1);
    }

    console.log("Password verification successful!");
    console.log("Login check passed.");
    process.exit(0);
});
