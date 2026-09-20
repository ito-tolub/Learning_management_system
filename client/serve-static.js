import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Semua rute non-file dikembalikan ke index.html (SPA routing)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend served on http://127.0.0.1:${PORT}`);
});