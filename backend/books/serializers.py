from rest_framework import serializers
from .models import Book, ChatHistory


class BookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for book listing page."""
    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'rating', 'num_reviews',
            'price', 'availability', 'cover_image_url', 'book_url',
            'genre', 'ai_genre', 'ai_sentiment', 'ai_processed', 'created_at',
        ]


class BookDetailSerializer(serializers.ModelSerializer):
    """Full serializer including AI fields for book detail page."""
    class Meta:
        model = Book
        fields = '__all__'


class BookUploadSerializer(serializers.Serializer):
    """Used for manually uploading / adding a single book via POST."""
    title = serializers.CharField(max_length=500)
    author = serializers.CharField(max_length=300, required=False, default='Unknown')
    rating = serializers.FloatField(required=False, allow_null=True)
    num_reviews = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, default='')
    price = serializers.CharField(max_length=50, required=False, default='')
    availability = serializers.CharField(max_length=100, required=False, default='')
    book_url = serializers.URLField(max_length=1000)
    cover_image_url = serializers.URLField(max_length=1000, required=False, default='')
    genre = serializers.CharField(max_length=200, required=False, default='')


class RAGQuerySerializer(serializers.Serializer):
    """Input for the RAG question-answering endpoint."""
    question = serializers.CharField(min_length=3, max_length=1000)
    top_k = serializers.IntegerField(min_value=1, max_value=10, default=5)


class ChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatHistory
        fields = '__all__'
