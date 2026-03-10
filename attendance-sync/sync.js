const { MongoClient } = require("mongodb");
const ExcelJS = require("exceljs");
const path = require("path");

const uri = process.env.MONGO_URI;

async function syncToExcel() {
  const client = new MongoClient(uri);
  await client.connect();

  const collection = client.db("test").collection("attendances");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendances");

  sheet.addRow(["_id", "studentId", "source", "timestamp"]);

  const cursor = collection.find({}).sort({ timestamp: 1 });

  for await (const doc of cursor) {
    sheet.addRow([
      doc._id.toString(),
      doc.studentId,
      doc.source,
      doc.timestamp
    ]);
  }

  const filePath = path.join(__dirname, "attendances.xlsx");
  await workbook.xlsx.writeFile(filePath);

  await client.close();
  console.log("Excel regenerated");
}

module.exports = syncToExcel;
