const express = require("express");
const path = require("path");
const syncToExcel = require("./sync");

const app = express();
const PORT = 3000;

setInterval(syncToExcel, 30 * 1000);

app.get("/attendances.xlsx", (req, res) => {
  const filePath = path.join(__dirname, "attendances.xlsx");
  res.download(filePath);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("File server on 0.0.0.0:3000");
});
