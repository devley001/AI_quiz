import logging
from services.huggingface_service import HuggingFaceService
from services.preprocessing import PreprocessingService
from services.postprocessing import PostprocessingService

logger = logging.getLogger(__name__)

class AnalysisController:
    def __init__(self):
        self.hf_service = HuggingFaceService()
        self.preprocessing = PreprocessingService()
        self.postprocessing = PostprocessingService()
    
    def analyze_text(self, text):
        """Perform comprehensive text analysis"""
        try:
            # Extract main concepts and their meanings
            main_concepts = self._extract_main_concepts(text)
            concept_meanings = self._analyze_concept_meanings(main_concepts, text)
            
            # Perform various analyses
            results = {
                'original_text': text,
                'word_count': len(text.split()),
                'character_count': len(text),
                'main_concepts': main_concepts,
                'concept_meanings': concept_meanings,
                'sentiment': self._analyze_text_sentiment(text),
                'entities': self._extract_text_entities(text),
                'keywords': self._extract_text_keywords(text),
                'text_summary': self._generate_text_summary(text, main_concepts)
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Text analysis failed: {str(e)}")
            raise
    
    def _extract_main_concepts(self, text):
        """Extract main concepts from text"""
        # Remove common words and extract meaningful concepts
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'}
        
        words = text.lower().split()
        # Extract meaningful words (nouns, adjectives, verbs)
        concepts = []
        
        for i, word in enumerate(words):
            clean_word = word.strip('.,!?;:()')
            if len(clean_word) > 3 and clean_word not in stop_words:
                # Check for compound concepts (2-3 words)
                if i < len(words) - 1:
                    next_word = words[i + 1].strip('.,!?;:()')
                    if len(next_word) > 3 and next_word not in stop_words:
                        compound = f"{clean_word} {next_word}"
                        if compound not in [c['concept'] for c in concepts]:
                            concepts.append({'concept': compound, 'frequency': text.lower().count(compound)})
                
                if clean_word not in [c['concept'] for c in concepts]:
                    concepts.append({'concept': clean_word, 'frequency': text.lower().count(clean_word)})
        
        # Sort by frequency and relevance
        concepts.sort(key=lambda x: x['frequency'], reverse=True)
        return concepts[:8]  # Return top 8 concepts
    
    def _analyze_concept_meanings(self, concepts, text):
        """Analyze the meaning of concepts within the text context"""
        meanings = []
        
        for concept_data in concepts:
            concept = concept_data['concept']
            meaning = self._get_contextual_meaning(concept, text)
            meanings.append({
                'concept': concept,
                'meaning': meaning,
                'context_usage': self._get_context_usage(concept, text),
                'importance': self._calculate_concept_importance(concept, text)
            })
        
        return meanings
    
    def _get_contextual_meaning(self, concept, text):
        """Get the meaning of a concept based on text context"""
        concept_lower = concept.lower()
        
        # Knowledge base for common concepts
        knowledge_base = {
            'artificial intelligence': 'the simulation of human intelligence processes by machines',
            'machine learning': 'a method of data analysis that automates analytical model building',
            'climate change': 'long-term shifts in global or regional climate patterns',
            'sustainability': 'meeting present needs without compromising future generations',
            'technology': 'the application of scientific knowledge for practical purposes',
            'education': 'the process of facilitating learning and knowledge acquisition',
            'innovation': 'the introduction of new ideas, methods, or products',
            'development': 'the process of growth, progress, or positive change',
            'research': 'systematic investigation to establish facts and reach conclusions',
            'analysis': 'detailed examination of elements or structure of something',
            'system': 'a set of connected things forming a complex whole',
            'process': 'a series of actions or steps taken to achieve a result',
            'management': 'the process of dealing with or controlling things or people',
            'strategy': 'a plan of action designed to achieve a long-term goal',
            'communication': 'the means of sending or receiving information',
            'collaboration': 'the action of working with someone to produce something',
            'efficiency': 'achieving maximum productivity with minimum wasted effort',
            'quality': 'the standard of something as measured against other things'
        }
        
        # Check if concept exists in knowledge base
        if concept_lower in knowledge_base:
            return knowledge_base[concept_lower]
        
        # Generate contextual meaning based on surrounding text
        sentences = text.split('.')
        relevant_sentences = [s for s in sentences if concept_lower in s.lower()]
        
        if relevant_sentences:
            context = relevant_sentences[0].strip()
            return f"refers to a key element discussed in the context: '{context[:100]}...'"
        
        return f"a significant term that appears {text.lower().count(concept_lower)} times in the text"
    
    def _get_context_usage(self, concept, text):
        """Get how the concept is used in the text"""
        sentences = text.split('.')
        usage_examples = []
        
        for sentence in sentences:
            if concept.lower() in sentence.lower():
                usage_examples.append(sentence.strip()[:150] + '...' if len(sentence) > 150 else sentence.strip())
                if len(usage_examples) >= 2:  # Limit to 2 examples
                    break
        
        return usage_examples
    
    def _calculate_concept_importance(self, concept, text):
        """Calculate the importance of a concept in the text"""
        frequency = text.lower().count(concept.lower())
        text_length = len(text.split())
        
        # Calculate importance score (0-100)
        importance_score = min(100, (frequency / text_length) * 1000)
        
        if importance_score >= 80:
            return 'Very High'
        elif importance_score >= 60:
            return 'High'
        elif importance_score >= 40:
            return 'Medium'
        elif importance_score >= 20:
            return 'Low'
        else:
            return 'Very Low'
    
    def _generate_text_summary(self, text, concepts):
        """Generate a summary of the text based on main concepts"""
        top_concepts = [c['concept'] for c in concepts[:3]]
        
        summary = f"This text primarily discusses {', '.join(top_concepts)}. "
        summary += f"The main focus appears to be on {concepts[0]['concept'] if concepts else 'various topics'}, "
        summary += f"which is mentioned {concepts[0]['frequency'] if concepts else 0} times. "
        summary += f"The text contains {len(text.split())} words and covers topics related to {', '.join(top_concepts[:2])}."
        
        return summary
    
    def _analyze_text_sentiment(self, text):
        """Simple sentiment analysis"""
        positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'beneficial', 'effective', 'successful', 'important', 'valuable', 'useful', 'helpful', 'significant']
        negative_words = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'harmful', 'ineffective', 'unsuccessful', 'problematic', 'difficult', 'challenging', 'concerning', 'issue', 'problem']
        
        words = text.lower().split()
        positive_count = sum(1 for word in words if any(pos in word for pos in positive_words))
        negative_count = sum(1 for word in words if any(neg in word for neg in negative_words))
        
        if positive_count > negative_count:
            return {'label': 'POSITIVE', 'score': 0.7 + (positive_count - negative_count) * 0.1}
        elif negative_count > positive_count:
            return {'label': 'NEGATIVE', 'score': 0.7 + (negative_count - positive_count) * 0.1}
        else:
            return {'label': 'NEUTRAL', 'score': 0.5}
    
    def _extract_text_entities(self, text):
        """Extract entities from text"""
        # Simple entity extraction
        import re
        
        entities = []
        
        # Extract potential names (capitalized words)
        names = re.findall(r'\b[A-Z][a-z]+\b', text)
        for name in set(names):
            if len(name) > 2:
                entities.append({'text': name, 'label': 'PERSON/ORG'})
        
        # Extract numbers
        numbers = re.findall(r'\b\d+(?:\.\d+)?\b', text)
        for number in set(numbers):
            entities.append({'text': number, 'label': 'NUMBER'})
        
        return entities[:10]  # Limit to 10 entities
    
    def _extract_text_keywords(self, text):
        """Extract keywords from text"""
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those'}
        
        words = text.lower().split()
        word_freq = {}
        
        for word in words:
            clean_word = word.strip('.,!?;:()')
            if len(clean_word) > 3 and clean_word not in stop_words:
                word_freq[clean_word] = word_freq.get(clean_word, 0) + 1
        
        # Sort by frequency
        keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:8]
        return [word for word, freq in keywords]
    
    def analyze_sentiment(self, text):
        """Analyze sentiment of text"""
        try:
            result = self.hf_service.analyze_sentiment(text)
            
            # Post-process results
            processed_result = self.postprocessing.format_sentiment_result(result)
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {str(e)}")
            raise
    
    def extract_entities(self, text):
        """Extract named entities from text"""
        try:
            entities = self.hf_service.extract_entities(text)
            
            # Group entities by type
            grouped_entities = {}
            for entity in entities:
                entity_type = entity.get('entity_group', 'MISC')
                if entity_type not in grouped_entities:
                    grouped_entities[entity_type] = []
                grouped_entities[entity_type].append({
                    'text': entity.get('word', ''),
                    'confidence': entity.get('score', 0.0)
                })
            
            return grouped_entities
            
        except Exception as e:
            logger.error(f"Entity extraction failed: {str(e)}")
            return {}
    
    def extract_keywords(self, text):
        """Extract keywords from text"""
        try:
            # Simple keyword extraction using word frequency
            words = text.lower().split()
            word_freq = {}
            
            # Filter out common stop words
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'}
            
            for word in words:
                if word not in stop_words and len(word) > 2:
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Sort by frequency and return top keywords
            keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
            
            return [{'word': word, 'frequency': freq} for word, freq in keywords]
            
        except Exception as e:
            logger.error(f"Keyword extraction failed: {str(e)}")
            return []
    
    def calculate_readability(self, text):
        """Calculate readability score"""
        try:
            sentences = text.split('.')
            words = text.split()
            
            if len(sentences) == 0 or len(words) == 0:
                return 0
            
            # Simple readability calculation (Flesch Reading Ease approximation)
            avg_sentence_length = len(words) / len(sentences)
            avg_syllables_per_word = sum(self._count_syllables(word) for word in words) / len(words)
            
            readability_score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables_per_word)
            
            return max(0, min(100, readability_score))
            
        except Exception as e:
            logger.error(f"Readability calculation failed: {str(e)}")
            return 0
    
    def _count_syllables(self, word):
        """Count syllables in a word (simple approximation)"""
        word = word.lower()
        vowels = 'aeiouy'
        syllable_count = 0
        prev_was_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_was_vowel:
                syllable_count += 1
            prev_was_vowel = is_vowel
        
        # Handle silent 'e'
        if word.endswith('e'):
            syllable_count -= 1
        
        return max(1, syllable_count)