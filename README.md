# 📚 BookInsight — AI-Powered Book Discovery Platform

A full-stack web application with RAG (Retrieval-Augmented Generation) pipeline for intelligent book discovery and Q&A.

> Built for the Ergosphere Solutions internship assignment.

---

## 🖼️ Screenshots

> *(Add 3–4 screenshots here after running the app)*
> `Dashboard` | `Book Detail` | `Q&A Interface` | `AI Insights`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Frontend (port 3000)                           │
│  Dashboard · Book Detail · Q&A with Chat History        │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│  Django REST Framework Backend (port 8000)              │
│  Books CRUD · Scraper Trigger · RAG Query               │
└─────────┬────────────────────────┬──────────────────────┘
          │                        │
┌─────────▼──────────┐  ┌──────────▼──────────────────────┐
│  SQLite / MySQL     │  │  ChromaDB (Vector Store)        │
│  Book metadata      │  │  sentence-transformers embeds   │
└────────────────────┘  └─────────────────────────────────┘
                                   │
                       ┌───────────▼───────────────────────┐
                       │  LM Studio (Local LLM)            │
                       │  Llama / Mistral / Code Llama     │
                       │  localhost:1234                    │
                       └───────────────────────────────────┘
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Chrome + ChromeDriver
- [LM Studio](https://lmstudio.ai/) with a model loaded

---

### 1. LM Studio Setup
1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download a model (recommended: **Llama 3.1 8B Instruct** or **Mistral 7B**)
3. Go to **Local Server** tab → Start Server
4. Make sure it's running at `http://localhost:1234`
5. Note the model name shown in the UI

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# (Optional) Set LM Studio model name
export LM_STUDIO_MODEL="your-model-name"   # e.g. "llama-3.1-8b-instruct"

# Start the server
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

---

### 3. Scraper Setup

The scraper runs automatically via the API, but you can also run it manually:

```bash
cd scraper

# Scrape 5 pages (~100 books) with AI processing
python scraper.py --pages 5

# Scrape without AI (faster, add AI later via API)
python scraper.py --pages 10 --no-ai

# Visible browser mode (for debugging)
python scraper.py --pages 2 --visible
```

---

### 4. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`

---

## 🔌 API Documentation

Base URL: `http://localhost:8000/api`

### GET Endpoints

| Endpoint | Description | Query Params |
|---|---|---|
| `GET /books/` | List all books | `search`, `genre`, `ordering` |
| `GET /books/<id>/` | Book detail with AI fields | — |
| `GET /books/<id>/recommend/` | Similar books (vector search) | — |
| `GET /chat-history/` | Saved Q&A history | — |

### POST Endpoints

| Endpoint | Description | Body |
|---|---|---|
| `POST /books/upload/` | Add a book manually | Book JSON |
| `POST /books/scrape/` | Trigger Selenium scraper | `{ "pages": 3 }` |
| `POST /books/<id>/process-ai/` | Run AI on specific book | — |
| `POST /rag/query/` | Ask a question (RAG) | `{ "question": "...", "top_k": 5 }` |

### Example: RAG Query

```bash
curl -X POST http://localhost:8000/api/rag/query/ \
  -H "Content-Type: application/json" \
  -d '{"question": "What mystery books do you recommend?", "top_k": 5}'
```

**Response:**
```json
{
  "answer": "Based on the available books, I'd recommend...",
  "sources": [
    { "id": 12, "title": "Sharp Objects", "url": "https://..." },
    { "id": 7, "title": "Gone Girl", "url": "https://..." }
  ],
  "context_used": "...",
  "cached": false
}
```

---

## 🤖 RAG Pipeline

```
User Question
     │
     ▼
[sentence-transformers] ──► Embedding vector
     │
     ▼
[ChromaDB cosine search] ──► Top-K relevant book chunks
     │
     ▼
[Context construction] ──► Book titles + relevant text
     │
     ▼
[LM Studio LLM] ──► Answer with source citations
```

**Chunking strategy:** Overlapping windows (300 words, 50-word overlap) for better context coverage.

---

## 💡 Sample Q&A

**Q:** What books are available in the mystery genre?
> Based on the library, mystery titles include *Sharp Objects* by Gillian Flynn (rated 4/5, dark tone) and *Big Little Lies* by Liane Moriarty...

**Q:** Recommend books similar to science fiction
> For sci-fi fans, the library has *The Hitchhiker's Guide to the Galaxy* (5/5, uplifting) and...

**Q:** Which books have the highest ratings?
> The top-rated books are *A Light in the Attic* (rated 5/5) and *Tipping the Velvet* (rated 5/5)...

---

## 🏆 Bonus Features Implemented

- ✅ **Caching** — AI responses cached for 24h (file-based cache), avoids repeated LM Studio calls
- ✅ **Embedding-based similarity** — ChromaDB cosine similarity for recommendations
- ✅ **Overlapping chunking** — 300-word windows with 50-word overlap for better RAG retrieval
- ✅ **Multi-page scraping** — configurable pages (1–50), each with detail page scraping
- ✅ **Chat history** — all Q&A saved to DB, viewable in the Q&A page
- ✅ **Loading states** — shimmer skeletons on all async loads
- ✅ **Background processing** — AI runs in background thread, API responds immediately
- ✅ **Search + filter** — search by title/author, filter by genre, sort by rating

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Django 4.2, Django REST Framework |
| Database | SQLite (dev) / MySQL (prod) |
| Vector Store | ChromaDB |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| LLM | LM Studio (Llama / Mistral — local, free) |
| Scraper | Selenium + webdriver-manager |
| Caching | Django file-based cache |
