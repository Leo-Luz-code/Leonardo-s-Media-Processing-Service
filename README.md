# Project Overview

**Leonardo's Media Processing Service (L-MPS)** is a lightweight web application designed to convert YouTube videos into MP3 audio files. The system allows users to paste a YouTube URL, wait for the conversion to process on the server, and then download the resulting audio file. It is built with a focus on simplicity and uses established open-source tools for media processing.

# Core Architecture

The system follows a Client-Server architecture with an asynchronous processing model for media conversion:

- **API Server (Node.js/Express):** Handles client requests, manages the lifecycle of conversion jobs, and serves the generated files.
- **Media Processor (yt-dlp & FFmpeg):** External command-line tools invoked by the server to handle the actual downloading and transcoding of video to audio.
- **In-Memory Job Store:** A simple `Map` object in the server memory tracks the status and metadata of active downloads.
- **Local Storage:** Temporary storage on the server's file system for the `.mp3` files during and after conversion.

### Request Flow

1. **Initiation:** The client sends a YouTube URL to the server.
2. **Processing:** The server generates a unique ID, starts a background process for conversion, and immediately responds with the ID.
3. **Polling:** The client polls the server for status updates using the unique ID.
4. **Completion:** Once the file is ready, the client is redirected to a download page.
5. **Delivery:** The client requests the file; the server streams it and subsequently deletes the local copy.

# Technology Stack

- **Node.js & Express:** The core backend framework for handling HTTP requests and process orchestration.
- **Python (yt-dlp):** A powerful command-line utility used to extract and download media from YouTube.
- **FFmpeg:** An industry-standard multimedia framework used by `yt-dlp` to transcode video streams into the MP3 format.
- **Frontend (Vanilla JS, HTML5, CSS3):** A dependency-free user interface that communicates with the API via Fetch API.
- **CORS:** Middleware to allow the frontend (often running on a different port or local file system) to communicate with the backend.

# Project Structure

- `/` (Root)
  - `server.js`: The heart of the application. Contains all API endpoints (`/convert`, `/status`, `/download`) and logic for process execution.
  - `index.html`: The main entry point for the user interface where URLs are submitted.
  - `download.html`: The specialized page for handling the final file delivery and user feedback.
  - `style.css`: Contains all visual styling for the application.
  - `package.json`: Defines Node.js dependencies (`express`, `cors`) and start scripts.
  - `README.md`: Basic instructions for project setup.

# Key Modules and Responsibilities

### `server.js`

- **Job Management:** Uses a `Map` to track `processing`, `ready`, `error`, and `timeout` states.
- **Security:** Validates YouTube URLs before execution.
- **Cleanup:** Automatically deletes generated files after a successful download or after a 1-hour expiration period upon server start.
- **Streaming:** Uses Node.js `fs.createReadStream` to efficiently pipe large audio files to the client.

### Frontend Scripts (`index.html` & `download.html`)

- **State Management:** Uses `sessionStorage` to persist the `downloadId` across page transitions.
- **Polling Logic:** Implements an exponential/fixed-interval polling mechanism to track server-side processing.

# Data Flow

1. **User Input:** URL submitted via `index.html`.
2. **POST `/convert`:** Server triggers `python -m yt_dlp`. Returns `downloadId`.
3. **GET `/status/:downloadId`:** Frontend polls every 10 seconds to check if `status === 'ready'`.
4. **Redirection:** Frontend moves to `download.html`.
5. **GET `/download/:downloadId`:** Server streams the MP3 file.
6. **Cleanup:** Server unlinks the file from disk and removes the job from the `Map`.

# External Dependencies

- **Python 3:** Required to run the `yt-dlp` module.
- **yt-dlp (`pip install yt-dlp`):** Must be installed and available in the Python environment.
- **FFmpeg:** Must be installed on the host system and added to the system PATH so `yt-dlp` can perform audio extraction.

# Development Workflow

1. **Installation:**
   - Install Node.js dependencies: `npm install`
   - Install Python dependencies: `pip install yt-dlp`
   - Ensure `ffmpeg` is installed on the system.
2. **Execution:**
   - Start the server: `npm start` (Runs on `http://localhost:3000`).
   - Open `index.html` in a web browser.
3. **Testing:**
   - Manually test with various YouTube links (Shorts, standard videos, different lengths).
   - Monitor the server console for `yt-dlp` execution logs and errors.

# Environment Variables

The project currently uses hardcoded configurations:

- **Port:** `3000` (Defined in `server.js`).
- **Timeout:** 30 minutes for conversion jobs; 3 minutes for file streaming.

# Future Improvements

- **Robust Job Queue:** Replace the in-memory `Map` with Redis/BullMQ to handle server restarts and higher concurrency.
- **Progress Tracking:** Parse `yt-dlp` stdout to provide real-time percentage progress to the frontend.
- **Containerization:** Create a Dockerfile that includes Node.js, Python, and FFmpeg to simplify environment setup.
- **Configurability:** Use `.env` files for port configuration and file storage paths.
- **Security:** Implement rate limiting and more stringent filename sanitization.

# AI Assistant Guidelines

- **Coding Style:** Maintain the use of ES Modules (`import/export`) and Vanilla JavaScript on the frontend.
- **Process Safety:** When modifying `exec` commands in `server.js`, ensure that input URLs are properly quoted and escaped to prevent command injection.
- **Frontend Consistency:** Keep the CSS within `style.css` and avoid adding external UI libraries (like Tailwind or Bootstrap) unless specifically requested.
- **Error Handling:** Always ensure that if a conversion fails, the temporary file (if created) is unlinked and the client receives a clear error status via the `/status` endpoint.
