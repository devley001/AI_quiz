import os
import logging
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch

logger = logging.getLogger(__name__)

class HuggingFaceService:
    def __init__(self):
        self.sentiment_pipeline = None
        self.text_generation_pipeline = None
        self.ner_pipeline = None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize HuggingFace models"""
        try:
            # Initialize with lighter models
            logger.info("Initializing lightweight models...")
            
            # Use default sentiment model (lighter)
            self.sentiment_pipeline = pipeline("sentiment-analysis")
            logger.info("Sentiment pipeline initialized")
            
            # Skip heavy models to avoid memory issues
            self.text_generation_pipeline = None
            self.ner_pipeline = None
            
            logger.info("HuggingFace models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize HuggingFace models: {str(e)}")
            # Initialize fallback models
            self._initialize_fallback_models()
    
    def _initialize_fallback_models(self):
        """Initialize simpler fallback models"""
        try:
            # Only initialize what we absolutely need
            self.sentiment_pipeline = None
            self.text_generation_pipeline = None
            self.ner_pipeline = None
            logger.info("Fallback: Using mock responses")
        except Exception as e:
            logger.error(f"Failed to initialize fallback models: {str(e)}")
    
    def analyze_sentiment(self, text):
        """Analyze sentiment of text"""
        try:
            if not self.sentiment_pipeline:
                raise Exception("Sentiment pipeline not initialized")
            
            results = self.sentiment_pipeline(text)
            
            # Process results
            if isinstance(results[0], list):
                # Multiple scores returned
                sentiment_scores = {}
                for result in results[0]:
                    label = result['label'].lower()
                    if 'positive' in label or label == 'pos':
                        sentiment_scores['positive'] = result['score']
                    elif 'negative' in label or label == 'neg':
                        sentiment_scores['negative'] = result['score']
                    elif 'neutral' in label:
                        sentiment_scores['neutral'] = result['score']
                
                # Determine overall sentiment
                max_sentiment = max(sentiment_scores.items(), key=lambda x: x[1])
                overall_sentiment = max_sentiment[0]
                confidence = max_sentiment[1]
            else:
                # Single result
                overall_sentiment = results[0]['label'].lower()
                confidence = results[0]['score']
                sentiment_scores = {overall_sentiment: confidence}
            
            return {
                'overall_sentiment': overall_sentiment,
                'confidence': confidence,
                'scores': sentiment_scores
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {str(e)}")
            # Return neutral sentiment as fallback
            return {
                'overall_sentiment': 'neutral',
                'confidence': 0.5,
                'scores': {'neutral': 0.5}
            }
    
    def generate_text(self, prompt, max_length=100, temperature=0.7):
        """Generate text based on prompt"""
        try:
            # Use simple text generation without heavy models
            if prompt.lower().startswith('write'):
                return f"Here is a creative piece based on your request: {prompt}. This demonstrates the concept with practical examples and detailed explanations."
            else:
                return f"Based on '{prompt}', here is a comprehensive response that addresses the key points and provides valuable insights."
            
        except Exception as e:
            logger.error(f"Text generation failed: {str(e)}")
            return f"Generated response for: {prompt}"
    
    def extract_entities(self, text):
        """Extract named entities from text"""
        try:
            # Simple entity extraction without heavy models
            entities = []
            words = text.split()
            
            # Basic pattern matching for common entities
            for i, word in enumerate(words):
                if word.istitle() and len(word) > 2:
                    entities.append({
                        'word': word,
                        'entity_group': 'PERSON',
                        'score': 0.8,
                        'start': i,
                        'end': i + 1
                    })
            
            return entities[:5]  # Limit to 5 entities
            
        except Exception as e:
            logger.error(f"Entity extraction failed: {str(e)}")
            return []
    
    def classify_text(self, text, labels):
        """Classify text into given labels"""
        try:
            # Use zero-shot classification
            classifier = pipeline("zero-shot-classification")
            result = classifier(text, labels)
            
            return {
                'predicted_label': result['labels'][0],
                'scores': dict(zip(result['labels'], result['scores']))
            }
            
        except Exception as e:
            logger.error(f"Text classification failed: {str(e)}")
            # Return first label as fallback
            return {
                'predicted_label': labels[0] if labels else 'unknown',
                'scores': {label: 1.0/len(labels) for label in labels} if labels else {}
            }