const app = require("./app");
require("dotenv").config();

// Inside app.js or index.js
const dataIngestion = require("./utils/dataIngestion");

// Trigger the data ingestion process
dataIngestion();

app.listen(process.env.PORT, () =>
  console.log(`Server is up and running at ${process.env.PORT}`)
);
