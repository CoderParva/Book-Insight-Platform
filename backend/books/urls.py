from django.urls import path
from . import views

urlpatterns = [
    # GET endpoints
    path('books/', views.book_list, name='book-list'),
    path('books/<int:pk>/', views.book_detail, name='book-detail'),
    path('books/<int:pk>/recommend/', views.book_recommendations, name='book-recommend'),

    # POST endpoints
    path('books/upload/', views.book_upload, name='book-upload'),
    path('books/scrape/', views.trigger_scraper, name='trigger-scraper'),
    path('books/<int:pk>/process-ai/', views.process_book_ai_view, name='process-ai'),

    # RAG
    path('rag/query/', views.rag_query_view, name='rag-query'),

    # Chat history (bonus)
    path('chat-history/', views.chat_history, name='chat-history'),
]
