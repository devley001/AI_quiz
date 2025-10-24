import logging
import random
from services.huggingface_service import HuggingFaceService
from services.openai_service import OpenAIService
from models.recommendation_model import RecommendationModel

logger = logging.getLogger(__name__)

class PredictionController:
    def __init__(self):
        self.hf_service = HuggingFaceService()
        self.openai_service = OpenAIService()
        self.recommendation_model = RecommendationModel()
    
    def generate_text(self, prompt, max_length=100, temperature=0.7):
        """Generate text based on prompt"""
        try:
            # Try OpenAI first, fallback to HuggingFace
            try:
                result = self.openai_service.generate_text(prompt, max_length, temperature)
            except:
                result = self.hf_service.generate_text(prompt, max_length, temperature)
            
            return {
                'generated_text': result,
                'prompt': prompt,
                'parameters': {
                    'max_length': max_length,
                    'temperature': temperature
                }
            }
            
        except Exception as e:
            logger.error(f"Text generation failed: {str(e)}")
            raise
    
    def generate_quiz(self, topic, num_questions=5, difficulty='medium'):
        """Generate quiz questions based on topic"""
        try:
            # Predefined quiz templates
            quiz_templates = {
                'Science': [
                    {'question': 'What is the chemical symbol for water?', 'options': ['H2O', 'CO2', 'NaCl', 'O2'], 'correctAnswer': 0},
                    {'question': 'Which planet is known as the Red Planet?', 'options': ['Venus', 'Mars', 'Jupiter', 'Saturn'], 'correctAnswer': 1},
                    {'question': 'What is the speed of light?', 'options': ['300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s'], 'correctAnswer': 0},
                    {'question': 'What gas do plants absorb?', 'options': ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], 'correctAnswer': 1},
                    {'question': 'What is the hardest natural substance?', 'options': ['Gold', 'Iron', 'Diamond', 'Silver'], 'correctAnswer': 2}
                ],
                'History': [
                    {'question': 'When did World War II end?', 'options': ['1944', '1945', '1946', '1947'], 'correctAnswer': 1},
                    {'question': 'Who was the first US President?', 'options': ['Jefferson', 'Adams', 'Washington', 'Franklin'], 'correctAnswer': 2},
                    {'question': 'Which empire did Julius Caesar rule?', 'options': ['Greek', 'Roman', 'Persian', 'Egyptian'], 'correctAnswer': 1},
                    {'question': 'When did the Berlin Wall fall?', 'options': ['1987', '1988', '1989', '1990'], 'correctAnswer': 2},
                    {'question': 'Who wrote the Declaration of Independence?', 'options': ['Washington', 'Franklin', 'Jefferson', 'Adams'], 'correctAnswer': 2}
                ],
                'Mathematics': [
                    {'question': 'What is 15% of 200?', 'options': ['25', '30', '35', '40'], 'correctAnswer': 1},
                    {'question': 'What is π approximately?', 'options': ['3.14159', '2.71828', '1.41421', '1.73205'], 'correctAnswer': 0},
                    {'question': 'What is √144?', 'options': ['10', '11', '12', '13'], 'correctAnswer': 2},
                    {'question': 'What is 7 × 8?', 'options': ['54', '56', '58', '60'], 'correctAnswer': 1},
                    {'question': 'Sum of angles in a triangle?', 'options': ['90°', '180°', '270°', '360°'], 'correctAnswer': 1},
                    {'question': 'What is 25% of 80?', 'options': ['15', '20', '25', '30'], 'correctAnswer': 1},
                    {'question': 'What is 9²?', 'options': ['72', '81', '90', '99'], 'correctAnswer': 1},
                    {'question': 'What is 144 ÷ 12?', 'options': ['10', '11', '12', '13'], 'correctAnswer': 2},
                    {'question': 'What is 6 × 9?', 'options': ['52', '54', '56', '58'], 'correctAnswer': 1},
                    {'question': 'What is √81?', 'options': ['7', '8', '9', '10'], 'correctAnswer': 2}
                ]
            }
            
            # Get questions for the specific topic only
            available_questions = quiz_templates.get(topic, [])
            
            # If topic not found, create generic questions for that topic
            if not available_questions:
                available_questions = [
                    {'question': f'What is a fundamental concept in {topic}?', 'options': [f'{topic} concept A', f'{topic} concept B', f'{topic} concept C', f'{topic} concept D'], 'correctAnswer': 0},
                    {'question': f'Which principle applies to {topic}?', 'options': [f'Principle A', f'Principle B', f'Principle C', f'Principle D'], 'correctAnswer': 1}
                ]
            
            # Generate exactly the requested number of questions for this topic
            questions = []
            for i in range(num_questions):
                if i < len(available_questions):
                    questions.append(available_questions[i])
                else:
                    # Create topic-specific variations
                    base_q = available_questions[i % len(available_questions)]
                    variation = dict(base_q)
                    variation['question'] = f"Advanced {topic}: {base_q['question']}"
                    questions.append(variation)
            
            return {
                'quiz': {
                    'title': f'{topic} Quiz',
                    'topic': topic,
                    'difficulty': difficulty,
                    'questions': questions
                }
            }
            
        except Exception as e:
            logger.error(f"Quiz generation failed: {str(e)}")
            raise
    
    def get_recommendations(self, user_id, preferences=None, limit=10):
        """Get personalized recommendations for user"""
        try:
            if preferences is None:
                preferences = {}
            
            # Use recommendation model to generate suggestions
            recommendations = self.recommendation_model.get_recommendations(
                user_id, preferences, limit
            )
            
            return {
                'user_id': user_id,
                'preferences': preferences,
                'recommendations': recommendations,
                'total_count': len(recommendations)
            }
            
        except Exception as e:
            logger.error(f"Recommendations failed: {str(e)}")
            raise
    
    def _generate_fallback_question(self, topic, difficulty, question_num):
        """Generate fallback question when AI services are unavailable"""
        templates = {
            'easy': [
                f"What is a basic concept related to {topic}?",
                f"Which of the following is associated with {topic}?",
                f"What is the main purpose of {topic}?"
            ],
            'medium': [
                f"How does {topic} relate to modern applications?",
                f"What are the key principles of {topic}?",
                f"Which approach is most effective for {topic}?"
            ],
            'hard': [
                f"What are the advanced implications of {topic}?",
                f"How would you optimize {topic} for complex scenarios?",
                f"What are the theoretical foundations of {topic}?"
            ]
        }
        
        question_templates = templates.get(difficulty, templates['medium'])
        question = random.choice(question_templates)
        
        # Generate sample options
        options = [
            f"Option A related to {topic}",
            f"Option B about {topic}",
            f"Option C concerning {topic}",
            f"Option D regarding {topic}"
        ]
        
        return f"{question}\nA) {options[0]}\nB) {options[1]}\nC) {options[2]}\nD) {options[3]}\nCorrect Answer: A"
    
    def _parse_question(self, question_text, question_num):
        """Parse generated question text into structured format"""
        try:
            lines = question_text.strip().split('\n')
            
            # Extract question
            question = lines[0] if lines else f"Question {question_num} about the topic"
            
            # Extract options
            options = []
            correct_answer = 'A'
            
            for line in lines[1:]:
                line = line.strip()
                if line.startswith(('A)', 'B)', 'C)', 'D)')):
                    options.append({
                        'id': line[0],
                        'text': line[3:].strip()
                    })
                elif line.lower().startswith('correct answer:'):
                    correct_answer = line.split(':')[1].strip().upper()
            
            # Ensure we have 4 options
            while len(options) < 4:
                option_id = chr(65 + len(options))  # A, B, C, D
                options.append({
                    'id': option_id,
                    'text': f"Option {option_id}"
                })
            
            return {
                'id': question_num,
                'question': question,
                'options': options[:4],
                'correct_answer': correct_answer,
                'explanation': f"This question tests knowledge about the given topic."
            }
            
        except Exception as e:
            logger.error(f"Question parsing failed: {str(e)}")
            return {
                'id': question_num,
                'question': f"Sample question {question_num}",
                'options': [
                    {'id': 'A', 'text': 'Option A'},
                    {'id': 'B', 'text': 'Option B'},
                    {'id': 'C', 'text': 'Option C'},
                    {'id': 'D', 'text': 'Option D'}
                ],
                'correct_answer': 'A',
                'explanation': 'Sample explanation'
            }