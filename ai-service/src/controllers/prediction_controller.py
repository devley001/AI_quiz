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
            # Generate contextual text based on prompt
            generated_text = self._generate_contextual_text(prompt, max_length, temperature)
            
            return {
                'generated_text': generated_text,
                'prompt': prompt,
                'parameters': {
                    'max_length': max_length,
                    'temperature': temperature
                }
            }
            
        except Exception as e:
            logger.error(f"Text generation failed: {str(e)}")
            raise
    
    def _generate_contextual_text(self, prompt, max_length, temperature):
        """Generate contextual text based on prompt type and main concept"""
        main_concept = self._extract_main_concept(prompt)
        prompt_lower = prompt.lower()
        
        # Educational content
        if any(word in prompt_lower for word in ['explain', 'definition', 'what is', 'describe', 'how does', 'why']):
            return self._generate_educational_content(prompt, main_concept, max_length)
        
        # Essay/article content
        elif any(word in prompt_lower for word in ['essay', 'article', 'write about', 'discuss', 'analyze']):
            return self._generate_essay_content(prompt, main_concept, max_length)
        
        # Story/creative content
        elif any(word in prompt_lower for word in ['story', 'tale', 'narrative', 'creative', 'imagine']):
            return self._generate_story_content(prompt, main_concept, max_length)
        
        # Technical content
        elif any(word in prompt_lower for word in ['algorithm', 'code', 'technical', 'programming', 'implement']):
            return self._generate_technical_content(prompt, main_concept, max_length)
        
        # Default: informative content
        else:
            return self._generate_informative_content(prompt, main_concept, max_length)
    
    def _extract_main_concept(self, prompt):
        """Extract the main concept/topic from the user prompt"""
        # Remove common instruction words
        stop_words = ['explain', 'what', 'is', 'how', 'why', 'describe', 'tell', 'me', 'about', 'write', 'an', 'essay', 'on', 'discuss', 'analyze', 'the', 'a', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'story', 'tale', 'narrative', 'creative', 'article', 'algorithm', 'code', 'technical', 'programming', 'implement']
        
        words = prompt.lower().split()
        concept_words = [word.strip('.,!?;:') for word in words if word.strip('.,!?;:') not in stop_words and len(word) > 2]
        
        # Return the main concept (first significant words)
        if concept_words:
            return ' '.join(concept_words[:3])  # Take up to 3 key words
        else:
            return prompt.strip()
    
    def _generate_educational_content(self, prompt, main_concept, max_length):
        """Generate educational explanations based on main concept"""
        concept_knowledge = self._get_concept_knowledge(main_concept)
        
        content = f"{main_concept.title()} {concept_knowledge['definition']} "
        content += f"The fundamental principles of {main_concept} include {concept_knowledge['principles']}. "
        content += f"Key characteristics involve {concept_knowledge['characteristics']}. "
        content += f"Practical applications of {main_concept} can be seen in {concept_knowledge['applications']}. "
        content += f"Understanding {main_concept} is important because {concept_knowledge['importance']}. "
        content += f"Students should focus on {concept_knowledge['study_tips']} when learning about {main_concept}."
        
        return self._truncate_to_length(content, max_length)
    
    def _generate_essay_content(self, prompt, main_concept, max_length):
        """Generate essay-style content based on main concept"""
        concept_knowledge = self._get_concept_knowledge(main_concept)
        
        content = f"Introduction: {main_concept.title()} {concept_knowledge['definition']} This essay examines the significance and impact of {main_concept} in contemporary society. "
        content += f"Body Paragraph 1: The historical development of {main_concept} shows {concept_knowledge['history']}. "
        content += f"Body Paragraph 2: Current applications demonstrate that {main_concept} {concept_knowledge['current_use']}. "
        content += f"Body Paragraph 3: The benefits of {main_concept} include {concept_knowledge['benefits']}, while challenges involve {concept_knowledge['challenges']}. "
        content += f"Conclusion: {main_concept.title()} remains crucial because {concept_knowledge['importance']} Future developments will likely focus on {concept_knowledge['future']}."
        
        return self._truncate_to_length(content, max_length)
    
    def _generate_story_content(self, prompt, main_concept, max_length):
        """Generate creative story content based on main concept"""
        story_elements = self._get_story_elements(main_concept)
        
        content = f"In a {story_elements['setting']} where {main_concept} was {story_elements['role']}, there lived {story_elements['character']}. "
        content += f"One day, they discovered something extraordinary about {main_concept}: {story_elements['discovery']}. "
        content += f"The journey began when {story_elements['conflict']} challenged everything they knew about {main_concept}. "
        content += f"Through {story_elements['journey']}, the character learned that {main_concept} {story_elements['lesson']}. "
        content += f"The climax revealed {story_elements['revelation']} about the true nature of {main_concept}. "
        content += f"Finally, {story_elements['resolution']} showing how {main_concept} transformed their world forever."
        
        return self._truncate_to_length(content, max_length)
    
    def _generate_technical_content(self, prompt, main_concept, max_length):
        """Generate technical explanations based on main concept"""
        tech_knowledge = self._get_technical_knowledge(main_concept)
        
        content = f"Technical Overview: {main_concept.title()} {tech_knowledge['definition']} "
        content += f"Architecture: The system design involves {tech_knowledge['architecture']} with {tech_knowledge['components']}. "
        content += f"Implementation: Key algorithms include {tech_knowledge['algorithms']} optimized for {tech_knowledge['optimization']}. "
        content += f"Performance: {main_concept.title()} achieves {tech_knowledge['performance']} through {tech_knowledge['methods']}. "
        content += f"Best Practices: Developers should {tech_knowledge['best_practices']} when working with {main_concept}. "
        content += f"Future Trends: Emerging developments focus on {tech_knowledge['future_trends']} and {tech_knowledge['innovations']}."
        
        return self._truncate_to_length(content, max_length)
    
    def _generate_informative_content(self, prompt, main_concept, max_length):
        """Generate general informative content based on main concept"""
        general_knowledge = self._get_general_knowledge(main_concept)
        
        content = f"{main_concept.title()} {general_knowledge['overview']} "
        content += f"Historical Context: {general_knowledge['history']} shaped the development of {main_concept}. "
        content += f"Current Significance: Today, {main_concept} {general_knowledge['current_relevance']} in various fields. "
        content += f"Key Features: The main characteristics include {general_knowledge['features']} and {general_knowledge['properties']}. "
        content += f"Impact: {main_concept.title()} influences {general_knowledge['impact']} across different sectors. "
        content += f"Future Outlook: Experts predict that {main_concept} will {general_knowledge['future']} in coming years."
        
        return self._truncate_to_length(content, max_length)
    
    def _get_concept_knowledge(self, concept):
        """Get knowledge base for educational concepts"""
        knowledge_base = {
            'artificial intelligence': {
                'definition': 'is the simulation of human intelligence in machines designed to think and learn.',
                'principles': 'machine learning, neural networks, natural language processing, and computer vision',
                'characteristics': 'pattern recognition, decision making, problem solving, and adaptive learning',
                'applications': 'healthcare, finance, transportation, education, and entertainment industries',
                'importance': 'it revolutionizes how we solve complex problems and automate tasks',
                'study_tips': 'understanding algorithms, practicing programming, and exploring real-world applications'
            },
            'climate change': {
                'definition': 'refers to long-term shifts in global temperatures and weather patterns.',
                'principles': 'greenhouse effect, carbon emissions, renewable energy, and environmental sustainability',
                'characteristics': 'rising temperatures, melting ice caps, extreme weather events, and ecosystem disruption',
                'applications': 'environmental policy, renewable energy development, and conservation efforts',
                'importance': 'it affects global ecosystems, human health, and economic stability',
                'study_tips': 'analyzing scientific data, understanding environmental systems, and exploring solutions'
            }
        }
        
        return knowledge_base.get(concept.lower(), {
            'definition': f'is an important concept that requires careful study and understanding.',
            'principles': 'fundamental theories, core methodologies, and established frameworks',
            'characteristics': 'unique properties, distinctive features, and measurable attributes',
            'applications': 'various fields, practical scenarios, and real-world implementations',
            'importance': 'it contributes to knowledge advancement and practical problem-solving',
            'study_tips': 'thorough research, critical analysis, and practical application'
        })
    
    def _get_story_elements(self, concept):
        """Get story elements based on concept"""
        return {
            'setting': 'mystical realm',
            'role': 'the source of all power',
            'character': 'a curious young scholar',
            'discovery': f'{concept} held ancient wisdom beyond imagination',
            'conflict': f'dark forces threatened to corrupt {concept}',
            'journey': 'trials of courage, wisdom, and determination',
            'lesson': f'represents the balance between knowledge and responsibility',
            'revelation': f'the true power of {concept} lies in understanding, not control',
            'resolution': f'the scholar became the guardian of {concept}'
        }
    
    def _get_technical_knowledge(self, concept):
        """Get technical knowledge for programming concepts"""
        return {
            'definition': 'is a systematic approach to solving computational problems efficiently.',
            'architecture': 'modular design patterns',
            'components': 'input processing, core logic, and output generation modules',
            'algorithms': 'optimized sorting, searching, and data manipulation techniques',
            'optimization': 'speed, memory usage, and scalability requirements',
            'performance': 'high throughput and low latency',
            'methods': 'efficient data structures and algorithmic optimizations',
            'best_practices': 'follow clean code principles, implement proper testing, and maintain documentation',
            'future_trends': 'artificial intelligence integration',
            'innovations': 'quantum computing applications'
        }
    
    def _get_general_knowledge(self, concept):
        """Get general knowledge for any concept"""
        return {
            'overview': 'represents a significant area of study with broad implications.',
            'history': 'Historical developments and key milestones',
            'current_relevance': 'plays a crucial role',
            'features': 'distinctive characteristics',
            'properties': 'measurable attributes',
            'impact': 'society, technology, and human understanding',
            'future': 'continue evolving and expanding its influence'
        }
    
    def _truncate_to_length(self, text, max_words):
        """Truncate text to specified number of words"""
        words = text.split()
        
        if len(words) <= max_words:
            return text
        
        # Take only the specified number of words
        truncated_words = words[:max_words]
        return ' '.join(truncated_words) + '...'
    
    def generate_quiz(self, topic, num_questions=5, difficulty='medium'):
        """Generate quiz questions based on topic"""
        try:
            quiz_bank = self._get_quiz_bank()
            topic_questions = quiz_bank.get(topic.lower(), quiz_bank.get('general', []))
            
            # Filter by difficulty
            filtered_questions = [q for q in topic_questions if q.get('difficulty', 'medium') == difficulty]
            if not filtered_questions:
                filtered_questions = topic_questions
            
            # Select random questions
            import random
            selected_questions = random.sample(filtered_questions, min(num_questions, len(filtered_questions)))
            
            # If we need more questions, add from other difficulties
            if len(selected_questions) < num_questions:
                remaining = [q for q in topic_questions if q not in selected_questions]
                additional = random.sample(remaining, min(num_questions - len(selected_questions), len(remaining)))
                selected_questions.extend(additional)
            
            return {
                'quiz': {
                    'title': f'{topic} Quiz - {difficulty.title()} Level',
                    'topic': topic,
                    'difficulty': difficulty,
                    'questions': selected_questions[:num_questions]
                }
            }
            
        except Exception as e:
            logger.error(f"Quiz generation failed: {str(e)}")
            raise
    
    def _get_quiz_bank(self):
        """Comprehensive quiz question bank"""
        return {
            'science': [
                # Beginner
                {'question': 'What is the chemical symbol for water?', 'options': ['H2O', 'CO2', 'NaCl', 'O2'], 'correctAnswer': 0, 'difficulty': 'beginner'},
                {'question': 'Which planet is closest to the Sun?', 'options': ['Venus', 'Mars', 'Mercury', 'Earth'], 'correctAnswer': 2, 'difficulty': 'beginner'},
                {'question': 'What gas do plants absorb from the air?', 'options': ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], 'correctAnswer': 1, 'difficulty': 'beginner'},
                # Easy
                {'question': 'Which planet is known as the Red Planet?', 'options': ['Venus', 'Mars', 'Jupiter', 'Saturn'], 'correctAnswer': 1, 'difficulty': 'easy'},
                {'question': 'What is the hardest natural substance?', 'options': ['Gold', 'Iron', 'Diamond', 'Silver'], 'correctAnswer': 2, 'difficulty': 'easy'},
                {'question': 'How many bones are in an adult human body?', 'options': ['196', '206', '216', '226'], 'correctAnswer': 1, 'difficulty': 'easy'},
                # Medium
                {'question': 'What is the speed of light in vacuum?', 'options': ['299,792,458 m/s', '300,000,000 m/s', '186,000 miles/s', 'All of the above'], 'correctAnswer': 3, 'difficulty': 'medium'},
                {'question': 'What is the pH of pure water?', 'options': ['6', '7', '8', '9'], 'correctAnswer': 1, 'difficulty': 'medium'},
                {'question': 'Which organelle is known as the powerhouse of the cell?', 'options': ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'], 'correctAnswer': 2, 'difficulty': 'medium'},
                # Hard
                {'question': 'What is the Heisenberg Uncertainty Principle?', 'options': ['Energy-time uncertainty', 'Position-momentum uncertainty', 'Wave-particle duality', 'Quantum entanglement'], 'correctAnswer': 1, 'difficulty': 'hard'},
                {'question': 'What is the half-life of Carbon-14?', 'options': ['5,730 years', '1,600 years', '24,100 years', '4.5 billion years'], 'correctAnswer': 0, 'difficulty': 'hard'},
                # Expert
                {'question': 'What is the critical temperature for superconductivity in YBa2Cu3O7?', 'options': ['77K', '93K', '123K', '273K'], 'correctAnswer': 1, 'difficulty': 'expert'}
            ],
            'mathematics': [
                # Beginner
                {'question': 'What is 5 + 3?', 'options': ['6', '7', '8', '9'], 'correctAnswer': 2, 'difficulty': 'beginner'},
                {'question': 'What is 10 - 4?', 'options': ['5', '6', '7', '8'], 'correctAnswer': 1, 'difficulty': 'beginner'},
                # Easy
                {'question': 'What is 7 × 8?', 'options': ['54', '56', '58', '60'], 'correctAnswer': 1, 'difficulty': 'easy'},
                {'question': 'What is √144?', 'options': ['10', '11', '12', '13'], 'correctAnswer': 2, 'difficulty': 'easy'},
                {'question': 'What is 25% of 80?', 'options': ['15', '20', '25', '30'], 'correctAnswer': 1, 'difficulty': 'easy'},
                # Medium
                {'question': 'What is the derivative of x²?', 'options': ['x', '2x', 'x²', '2x²'], 'correctAnswer': 1, 'difficulty': 'medium'},
                {'question': 'What is π approximately?', 'options': ['3.14159', '2.71828', '1.41421', '1.73205'], 'correctAnswer': 0, 'difficulty': 'medium'},
                {'question': 'Sum of interior angles in a triangle?', 'options': ['90°', '180°', '270°', '360°'], 'correctAnswer': 1, 'difficulty': 'medium'},
                # Hard
                {'question': 'What is the integral of sin(x)?', 'options': ['cos(x)', '-cos(x)', 'sin(x)', '-sin(x)'], 'correctAnswer': 1, 'difficulty': 'hard'},
                {'question': 'What is e^(iπ) + 1?', 'options': ['-1', '0', '1', 'i'], 'correctAnswer': 1, 'difficulty': 'hard'},
                # Expert
                {'question': 'What is the Riemann Hypothesis about?', 'options': ['Prime numbers', 'Complex analysis', 'Zeta function zeros', 'All of the above'], 'correctAnswer': 3, 'difficulty': 'expert'}
            ],
            'literature': [
                # Beginner
                {'question': 'Who wrote "Romeo and Juliet"?', 'options': ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], 'correctAnswer': 1, 'difficulty': 'beginner'},
                {'question': 'What is a haiku?', 'options': ['A novel', 'A short poem', 'A play', 'An essay'], 'correctAnswer': 1, 'difficulty': 'beginner'},
                # Easy
                {'question': 'Who wrote "Pride and Prejudice"?', 'options': ['Emily Brontë', 'Charlotte Brontë', 'Jane Austen', 'George Eliot'], 'correctAnswer': 2, 'difficulty': 'easy'},
                {'question': 'What is the first book in the Harry Potter series?', 'options': ['Chamber of Secrets', 'Philosopher\'s Stone', 'Prisoner of Azkaban', 'Goblet of Fire'], 'correctAnswer': 1, 'difficulty': 'easy'},
                # Medium
                {'question': 'What literary device is used in "The pen is mightier than the sword"?', 'options': ['Metaphor', 'Simile', 'Metonymy', 'Hyperbole'], 'correctAnswer': 2, 'difficulty': 'medium'},
                {'question': 'Who wrote "One Hundred Years of Solitude"?', 'options': ['Jorge Luis Borges', 'Gabriel García Márquez', 'Mario Vargas Llosa', 'Octavio Paz'], 'correctAnswer': 1, 'difficulty': 'medium'},
                # Hard
                {'question': 'What is the narrative technique in "The Sound and the Fury"?', 'options': ['Stream of consciousness', 'Epistolary', 'Frame narrative', 'Unreliable narrator'], 'correctAnswer': 0, 'difficulty': 'hard'},
                # Expert
                {'question': 'What is the significance of the green light in "The Great Gatsby"?', 'options': ['Hope and desire', 'Money and greed', 'Nature and purity', 'All of the above'], 'correctAnswer': 3, 'difficulty': 'expert'}
            ],
            'history': [
                # Beginner
                {'question': 'When did World War II end?', 'options': ['1944', '1945', '1946', '1947'], 'correctAnswer': 1, 'difficulty': 'beginner'},
                {'question': 'Who was the first US President?', 'options': ['Thomas Jefferson', 'John Adams', 'George Washington', 'Benjamin Franklin'], 'correctAnswer': 2, 'difficulty': 'beginner'},
                # Easy
                {'question': 'When did the Berlin Wall fall?', 'options': ['1987', '1988', '1989', '1990'], 'correctAnswer': 2, 'difficulty': 'easy'},
                {'question': 'Which empire did Julius Caesar rule?', 'options': ['Greek Empire', 'Roman Empire', 'Persian Empire', 'Egyptian Empire'], 'correctAnswer': 1, 'difficulty': 'easy'},
                # Medium
                {'question': 'What year did the American Civil War begin?', 'options': ['1860', '1861', '1862', '1863'], 'correctAnswer': 1, 'difficulty': 'medium'},
                {'question': 'Who wrote the Communist Manifesto?', 'options': ['Lenin', 'Stalin', 'Marx and Engels', 'Trotsky'], 'correctAnswer': 2, 'difficulty': 'medium'},
                # Hard
                {'question': 'What was the Treaty of Westphalia (1648)?', 'options': ['End of Thirty Years War', 'End of Napoleonic Wars', 'End of WWI', 'End of Cold War'], 'correctAnswer': 0, 'difficulty': 'hard'},
                # Expert
                {'question': 'What was the significance of the Battle of Salamis?', 'options': ['Greek naval victory over Persians', 'Roman victory over Carthage', 'End of Peloponnesian War', 'Alexander\'s conquest'], 'correctAnswer': 0, 'difficulty': 'expert'}
            ]
        }
    
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