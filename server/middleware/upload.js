import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { studentId, name } = req.body;
    let cleanName = "";
    if (name && typeof name === "string") {
      cleanName = name.trim().split(" ")[0].toLowerCase();
    }
    const folderName = `${studentId}_${cleanName}`;
    const dir = path.join(path.resolve(".."), "Images", folderName);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== ".jpg" && ext !== ".jpeg") {
    return cb(new Error("Only JPG/JPEG allowed"), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

export default upload;
