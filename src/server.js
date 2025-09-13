    require("dotenv").config();
    const http = require("http");
    const app = require("./app");
    const database = require("./config/database");

    const PORT = process.env.PORT || 6000;

    // Connect to database
    database.connect().then(() => {
        const server = http.createServer(app);

        server.listen(PORT, "0.0.0.0", () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
            console.log(`Frontend available at: ${process.env.FRONTEND_URL}`);
        });
    }).catch((error) => {
        console.error('❌ Failed to connect to database:', error);
        process.exit(1);
    });
