import { exec } from "child_process";
import cors from "cors";
import express, { json } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(json());

// Armazenar conversões em andamento e completadas
const conversions = new Map();

app.post("/convert", (req, res) => {
  const url = req.body.url;

  // Validar URL
  if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
    return res
      .status(400)
      .json({ error: "URL inválida. Use um link do YouTube." });
  }

  // Gerar ID único para o download
  const timestamp = Date.now();
  const downloadId = `download_${timestamp}`;
  const filename = `music_${timestamp}.mp3`;
  const filepath = path.join(__dirname, filename);

  // Armazenar info sobre esta conversão
  conversions.set(downloadId, {
    status: "processing",
    filename,
    filepath,
    url,
    startTime: new Date().toISOString(),
    fileSize: null,
  });

  const command = `python -m yt_dlp -x --audio-format mp3 "${url}" -o "${filepath.replace(/\\/g, "\\\\")}" --quiet --no-warnings`;

  console.log(
    `[${new Date().toISOString()}] [${downloadId}] Iniciando conversão de: ${url}`,
  );

  // Timeout de 30 minutos para conversão de vídeos longos
  const conversionTimeout = setTimeout(() => {
    console.log(`[${downloadId}] TIMEOUT: Conversão demorou demais`);
    conversions.set(downloadId, {
      ...conversions.get(downloadId),
      status: "timeout",
      error: "Conversão demorou mais de 30 minutos",
    });
  }, 1800000);

  exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
    clearTimeout(conversionTimeout);

    if (error) {
      console.log(`[${downloadId}] ERRO DE CONVERSÃO:`, error.message);
      conversions.set(downloadId, {
        ...conversions.get(downloadId),
        status: "error",
        error: stderr.slice(0, 200),
      });
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      return;
    }

    // Verificar se arquivo foi criado
    if (!fs.existsSync(filepath)) {
      console.log(`[${downloadId}] ERRO: Arquivo não foi criado`);
      conversions.set(downloadId, {
        ...conversions.get(downloadId),
        status: "error",
        error:
          "Arquivo não foi criado. Verifique se ffmpeg e yt-dlp estão instalados.",
      });
      return;
    }

    try {
      const stats = fs.statSync(filepath);
      console.log(
        `[${downloadId}] Conversão concluída: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
      );

      conversions.set(downloadId, {
        ...conversions.get(downloadId),
        status: "ready",
        fileSize: stats.size,
        completedTime: new Date().toISOString(),
      });
    } catch (err) {
      console.log(`[${downloadId}] ERRO ao processar arquivo:`, err);
      conversions.set(downloadId, {
        ...conversions.get(downloadId),
        status: "error",
        error: err.message,
      });
    }
  });

  res.json({
    success: true,
    downloadId,
    message:
      "Conversão iniciada. Use o downloadId para acompanhar o progresso.",
  });

  console.log(`[${downloadId}] Resposta enviada ao cliente`);
});

app.get("/status/:downloadId", (req, res) => {
  const { downloadId } = req.params;
  const conversion = conversions.get(downloadId);

  if (!conversion) {
    return res.status(404).json({ error: "Download ID não encontrado" });
  }

  res.json({
    downloadId,
    status: conversion.status,
    fileSize: conversion.fileSize,
    startTime: conversion.startTime,
    completedTime: conversion.completedTime,
    error: conversion.error || null,
    url: conversion.url,
  });
});

app.get("/download/:downloadId", (req, res) => {
  const { downloadId } = req.params;
  const conversion = conversions.get(downloadId);

  if (!conversion) {
    return res.status(404).json({ error: "Download ID não encontrado" });
  }

  if (conversion.status !== "ready") {
    return res.status(400).json({
      error: `Arquivo não está pronto. Status: ${conversion.status}`,
    });
  }

  const filepath = conversion.filepath;

  if (!fs.existsSync(filepath)) {
    conversions.set(downloadId, {
      ...conversion,
      status: "error",
      error: "Arquivo não encontrado no servidor",
    });
    return res
      .status(404)
      .json({ error: "Arquivo não encontrado no servidor" });
  }

  try {
    const stats = fs.statSync(filepath);

    // Aumentar timeout para envio do arquivo (3 minutos)
    res.setTimeout(180000, () => {
      console.log(`[${downloadId}] TIMEOUT ao enviar arquivo`);
      if (res.writable) {
        res.destroy();
      }
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${conversion.filename}"`,
    );
    res.setHeader("Content-Length", stats.size);

    const stream = fs.createReadStream(filepath);

    stream.on("error", (err) => {
      console.log(`[${downloadId}] ERRO no stream:`, err);
      if (!res.writableEnded) {
        res.status(500).end("Erro ao ler arquivo");
      }
    });

    res.on("finish", () => {
      console.log(`[${downloadId}] Download enviado com sucesso`);
      // Deletar arquivo de forma segura com delay
      setImmediate(() => {
        if (fs.existsSync(filepath)) {
          fs.unlink(filepath, (err) => {
            if (err)
              console.log(`[${downloadId}] Erro ao deletar arquivo:`, err);
            else {
              console.log(
                `[${downloadId}] Arquivo deletado: ${conversion.filename}`,
              );
              conversions.delete(downloadId);
            }
          });
        }
      });
    });

    res.on("error", (err) => {
      console.log(`[${downloadId}] ERRO no response:`, err.code);
      if (fs.existsSync(filepath)) {
        fs.unlink(filepath, (err) => {
          if (err)
            console.log(
              `[${downloadId}] Erro ao deletar arquivo após erro:`,
              err,
            );
        });
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.log(`[${downloadId}] ERRO:`, err);
    res.status(500).json({ error: "Erro interno: " + err.message });
  }
});

// Manter endpoint antigo para compatibilidade (será removido depois)
app.post("/download", (req, res) => {
  return res.status(410).json({
    error:
      "Endpoint descontinuado. Use POST /convert seguido de GET /download/:downloadId",
  });
});

// Limpar arquivos antigos ao iniciar o servidor
app.listen(3000, () => {
  // Deletar arquivos antigos (mais de 1 hora)
  const musicDir = __dirname;
  fs.readdirSync(musicDir).forEach((file) => {
    if (file.startsWith("music_") && file.endsWith(".mp3")) {
      const filepath = path.join(musicDir, file);
      const stats = fs.statSync(filepath);
      if (Date.now() - stats.mtime.getTime() > 3600000) {
        fs.unlinkSync(filepath);
      }
    }
  });
  console.log("Servidor rodando na porta 3000");
});
