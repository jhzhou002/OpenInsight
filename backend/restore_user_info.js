const db = require("./db/index");
const bcrypt = require("bcryptjs");

const createTableSql = `
CREATE TABLE IF NOT EXISTS \`user_info\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`user_name\` varchar(255) NOT NULL UNIQUE,
  \`pass_word\` varchar(255) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const checkUserSql = "SELECT * FROM user_info WHERE user_name = ?";
const insertUserSql = "INSERT INTO user_info (user_name, pass_word) VALUES (?, ?)";

console.log("Starting restoration process...");

db.query(createTableSql, (err, results) => {
    if (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
    console.log("Table 'user_info' checked/created successfully.");

    const adminUser = "admin";
    const rawPassword = "password123";

    db.query(checkUserSql, [adminUser], (err, results) => {
        if (err) {
            console.error("Error checking user:", err);
            process.exit(1);
        }

        if (results.length > 0) {
            console.log("Admin user already exists.");
            process.exit(0);
        } else {
            console.log("Admin user not found, creating...");
            const hashedPassword = bcrypt.hashSync(rawPassword, 10);
            db.query(insertUserSql, [adminUser, hashedPassword], (err, results) => {
                if (err) {
                    console.error("Error inserting admin user:", err);
                    process.exit(1);
                }
                console.log("Admin user created successfully.");
                console.log("Username: admin");
                console.log("Password: password123");
                process.exit(0);
            });
        }
    });
});
