from django.db import models


class Book(models.Model):
    """Stores scraped book metadata."""
    title = models.CharField(max_length=500)
    author = models.CharField(max_length=300, blank=True, default='Unknown')
    rating = models.FloatField(null=True, blank=True)
    num_reviews = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, default='')
    price = models.CharField(max_length=50, blank=True, default='')
    availability = models.CharField(max_length=100, blank=True, default='')
    book_url = models.URLField(max_length=1000, unique=True)
    cover_image_url = models.URLField(max_length=1000, blank=True, default='')
    genre = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # AI-generated fields (cached to avoid repeated LM Studio calls)
    ai_summary = models.TextField(blank=True, default='')
    ai_genre = models.CharField(max_length=200, blank=True, default='')
    ai_sentiment = models.CharField(max_length=100, blank=True, default='')
    ai_processed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def to_text_chunk(self):
        """Returns a rich text representation used for embedding / RAG."""
        return (
            f"Title: {self.title}\n"
            f"Author: {self.author}\n"
            f"Genre: {self.genre or self.ai_genre}\n"
            f"Rating: {self.rating}/5\n"
            f"Description: {self.description}\n"
            f"Summary: {self.ai_summary}\n"
            f"Sentiment: {self.ai_sentiment}\n"
        )


class ChatHistory(models.Model):
    """Stores Q&A chat history (bonus feature)."""
    question = models.TextField()
    answer = models.TextField()
    sources = models.JSONField(default=list)   # list of book IDs cited
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.question[:80]
