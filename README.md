# 🎵 Leonardo's Media Processing Service (L-MPS)

Um aplicativo simples para processar mídias do YouTube em formato MP3.

## 📋 Requisitos

- **Node.js** (v14+)
- **Python** (v3.6+)
- **yt-dlp** (instalado via pip)

## 🚀 Instalação

### 1. Clone ou baixe o projeto

```bash
cd L-MPS
```

### 2. Instale as dependências do Node.js

```bash
npm install
```

### 3. Instale o yt-dlp (se não tiver)

```bash
pip install yt-dlp
```

Se tiver dúvidas, veja a [documentação oficial do yt-dlp](https://github.com/yt-dlp/yt-dlp)

## 🎬 Como usar

### 1. Inicie o servidor

```bash
npm start
```

Você deve ver a mensagem: "Servidor rodando na porta 3000"

### 2. Abra o navegador

Abra o arquivo `index.html` no navegador ou acesse `http://localhost:3000` (você pode servir o arquivo estático adicionando uma rota no server.js se preferir)

### 3. Baixe suas músicas

1. Cole o link do YouTube no campo de entrada
2. Clique em "Baixar"
3. Aguarde o processamento (pode levar alguns minutos para vídeos longos)
4. O arquivo MP3 será baixado automaticamente

## 🛠️ Troubleshooting

### "yt-dlp: command not found"

- Instale yt-dlp: `pip install --upgrade yt-dlp`
- Ou execute Python diretamente: `python -m yt_dlp --version`

### Timeout ou vídeo muito grande

- Alguns vídeos podem levar mais de 5 minutos
- Você pode aumentar o timeout alterando `300000` no `server.js`

### CORS erro

- Se abrir o arquivo diretamente (file://), pode ter problemas CORS
- Sirva o arquivo por HTTP ou use uma extensão do VS Code como Live Server

## 📝 Notas

- Os arquivos MP3 são salvos temporariamente no servidor
- Arquivos com mais de 1 hora são automaticamente deletados
- Não é recomendado uso em produção sem ajustes de segurança

## 📄 Licença

Use livremente! 😊
