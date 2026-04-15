"""
AI Service — Groq API Integration
Uses Groq (free, fast) instead of LM Studio
"""
import hashlib
import logging
import os
import pickle

import numpy as np
import requests
from django.conf import settings
from django.core.cache import cache
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_embedding_model = None
FAISS_INDEX_PATH = os.path.join(settings.BASE_DIR, 'faiss_index.pkl')
_vector_store = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading sentence-transformer model...")
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedding_model


def _load_vector_store():
    global _vector_store
    if _vector_store is not None:
        return _vector_store
    if os.path.exists(FAISS_INDEX_PATH):
        with open(FAISS_INDEX_PATH, 'rb') as f:
            _vector_store = pickle.load(f)
    else:
        _vector_store = {"embeddings": [], "documents": [], "metadatas": []}
    return _vector_store


def _save_vector_store():
    with open(FAISS_INDEX_PATH, 'wb') as f:
        pickle.dump(_vector_store, f)


# ---------------------------------------------------------------------------
# Groq API helper
# ---------------------------------------------------------------------------

def _groq_chat(prompt: str, system: str = "", max_tokens: int = 512) -> str:
    """Call Groq API — fast, free, no local model needed."""
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key or api_key == 'your-api-key-here':
        raise ConnectionError("Groq API key not set in settings.py")

    url = "https://api.groq.com/openai/v1/chat/completions"
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except requests.exceptions.ConnectionError:
        raise ConnectionError("Cannot connect to Groq API. Check your internet connection.")
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise


# ---------------------------------------------------------------------------
# AI Insight Generation
# ---------------------------------------------------------------------------

def generate_summary(title: str, description: str) -> str:
    cache_key = f"summary_{hashlib.md5(title.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    prompt = (
        f"Book title: {title}\n\nDescription: {description or 'No description available.'}\n\n"
        "Write a concise 2-3 sentence summary of this book suitable for a reader browsing a catalog."
    )
    result = _groq_chat(prompt, system="You are a helpful book cataloger.", max_tokens=200)
    cache.set(cache_key, result)
    return result


def classify_genre(title: str, description: str, existing_genre: str = "") -> str:
    cache_key = f"genre_{hashlib.md5(title.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    if existing_genre:
        cache.set(cache_key, existing_genre)
        return existing_genre
    prompt = (
        f"Book title: {title}\nDescription: {description or 'No description available.'}\n\n"
        "Classify this book into exactly ONE genre from this list: "
        "Fiction, Non-Fiction, Mystery, Romance, Science Fiction, Fantasy, "
        "Biography, History, Self-Help, Thriller, Horror, Children, Classic, Poetry, Other.\n"
        "Respond with only the genre name, nothing else."
    )
    result = _groq_chat(prompt, system="You are a book genre classifier.", max_tokens=20)
    result = result.strip().split('\n')[0].strip()
    cache.set(cache_key, result)
    return result


def analyze_sentiment(description: str) -> str:
    cache_key = f"sentiment_{hashlib.md5(description[:200].encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    if not description:
        return "Neutral"
    prompt = (
        f"Book description: {description[:500]}\n\n"
        "Analyze the overall tone/sentiment. "
        "Respond with exactly one word: Positive, Negative, Neutral, Dark, Uplifting, Suspenseful, or Romantic."
    )
    result = _groq_chat(prompt, system="You are a sentiment analyzer.", max_tokens=10)
    result = result.strip().split()[0].strip()
    cache.set(cache_key, result)
    return result


def process_book_ai(book) -> None:
    try:
        book.ai_summary = generate_summary(book.title, book.description)
        book.ai_genre = classify_genre(book.title, book.description, book.genre)
        book.ai_sentiment = analyze_sentiment(book.description)
        book.ai_processed = True
        book.save(update_fields=['ai_summary', 'ai_genre', 'ai_sentiment', 'ai_processed'])
        logger.info(f"AI processed: {book.title}")
    except Exception as e:
        logger.error(f"AI processing failed for '{book.title}': {e}")


# ---------------------------------------------------------------------------
# Embeddings & Vector Store
# ---------------------------------------------------------------------------

def embed_text(text: str):
    model = get_embedding_model()
    return model.encode(text)


def _chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> list:
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks if chunks else [text]


def upsert_book_to_vectorstore(book) -> None:
    global _vector_store
    store = _load_vector_store()
    keep = [(e, d, m) for e, d, m in zip(
        store["embeddings"], store["documents"], store["metadatas"]
    ) if m.get("book_id") != book.id]
    if keep:
        store["embeddings"], store["documents"], store["metadatas"] = map(list, zip(*keep))
    else:
        store["embeddings"], store["documents"], store["metadatas"] = [], [], []
    text = book.to_text_chunk()
    chunks = _chunk_text(text)
    for i, chunk in enumerate(chunks):
        store["embeddings"].append(embed_text(chunk))
        store["documents"].append(chunk)
        store["metadatas"].append({
            "book_id": book.id,
            "book_title": book.title,
            "book_url": book.book_url,
            "chunk_index": i,
        })
    _save_vector_store()
    logger.info(f"Stored {len(chunks)} chunks for: {book.title}")


def similarity_search(query: str, top_k: int = 5) -> list:
    store = _load_vector_store()
    if not store["embeddings"]:
        return []
    query_emb = embed_text(query)
    embeddings = np.array(store["embeddings"])
    query_norm = query_emb / (np.linalg.norm(query_emb) + 1e-10)
    emb_norms = embeddings / (np.linalg.norm(embeddings, axis=1, keepdims=True) + 1e-10)
    scores = emb_norms @ query_norm
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [{"text": store["documents"][i], "metadata": store["metadatas"][i], "score": float(scores[i])} for i in top_indices]


# ---------------------------------------------------------------------------
# RAG Pipeline
# ---------------------------------------------------------------------------

def rag_query(question: str, top_k: int = 5) -> dict:
    hits = similarity_search(question, top_k=top_k)
    if not hits:
        return {
            "answer": "No book data found. Please scrape some books first.",
            "sources": [],
            "context_used": "",
        }
    context_parts = []
    seen_books = {}
    for hit in hits:
        book_id = hit["metadata"]["book_id"]
        title = hit["metadata"]["book_title"]
        if book_id not in seen_books:
            seen_books[book_id] = {"title": title, "url": hit["metadata"]["book_url"], "id": book_id}
        context_parts.append(f"[{title}]: {hit['text']}")
    context = "\n\n".join(context_parts)
    system_prompt = (
        "You are a knowledgeable book recommendation assistant. "
        "Answer questions based only on the provided book context. "
        "Always mention specific book titles when relevant. Be concise and helpful."
    )
    user_prompt = (
        f"Context from book database:\n{context}\n\n"
        f"Question: {question}\n\nAnswer based on the books above. Cite book titles."
    )
    answer = _groq_chat(user_prompt, system=system_prompt, max_tokens=600)
    return {
        "answer": answer,
        "sources": list(seen_books.values()),
        "context_used": context[:1000],
    }


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

def get_similar_books(book_id: int, top_k: int = 5) -> list:
    from .models import Book
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return []
    hits = similarity_search(book.to_text_chunk(), top_k=top_k + 10)
    seen_ids = set()
    similar_ids = []
    for hit in hits:
        bid = hit["metadata"]["book_id"]
        if bid != book_id and bid not in seen_ids:
            seen_ids.add(bid)
            similar_ids.append(bid)
        if len(similar_ids) >= top_k:
            break
    return similar_ids