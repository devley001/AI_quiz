# ai-service/src/controllers/adaptive_assessment_controller.py
"""
Adaptive Assessment Controller
Integrates IRT Engine and Bloom's Taxonomy for personalized adaptive quizzes
"""

import logging
from datetime import datetime
from typing import Dict, List, Any
from engines.irt_engine import IRTEngine
from engines.blooms_engine import BloomsEngine
from services.openai_service import OpenAIService

logger = logging.getLogger(__name__)

class AdaptiveAssessmentController:
    """
    Main controller for adaptive assessments combining IRT and Bloom's Taxonomy
    """
    
    def __init__(self):
        self.irt_engine = IRTEngine()
        self.blooms_engine = BloomsEngine()
        self.openai_service = OpenAIService()
        
        # Session storage (in production, use database)
        self.active_sessions = {}
    
    def initialize_session(self, user_id: str, topic: str, 
                          initial_level: str = 'medium') -> Dict[str, Any]:
        """
        Initialize new adaptive assessment session
        
        Args:
            user_id: Student ID
            topic: Assessment topic
            initial_level: Starting difficulty level
            
        Returns:
            Session initialization data
        """
        try:
            session_id = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Map initial level to Bloom's cognitive level
            blooms_level = self._map_difficulty_to_blooms(initial_level)
            
            # Initialize session data
            session_data = {
                'session_id': session_id,
                'user_id': user_id,
                'topic': topic,
                'start_time': datetime.now().isoformat(),
                'current_theta': self.irt_engine.initial_ability,
                'current_blooms_level': blooms_level,
                'responses': [],
                'item_parameters': [],
                'answered_item_ids': set(),
                'question_count': 0,
                'performance_metrics': {
                    'correct_count': 0,
                    'total_count': 0,
                    'current_accuracy': 0.0
                }
            }
            
            # Store session
            self.active_sessions[session_id] = session_data
            
            logger.info(f"Initialized adaptive session: {session_id}")
            
            return {
                'session_id': session_id,
                'initial_ability': self.irt_engine.initial_ability,
                'initial_level': blooms_level,
                'status': 'initialized',
                'message': 'Adaptive assessment session started'
            }
            
        except Exception as e:
            logger.error(f"Error initializing session: {str(e)}")
            raise
    
    def get_next_question(self, session_id: str, question_bank: List[Dict]) -> Dict[str, Any]:
        """
        Select and generate next adaptive question
        
        Args:
            session_id: Active session ID
            question_bank: Available questions with IRT parameters and Bloom's tags
            
        Returns:
            Next question with metadata
        """
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Session not found: {session_id}")
            
            session = self.active_sessions[session_id]
            
            # Check termination criteria
            if self.irt_engine.is_termination_criteria_met(
                session['current_theta'],
                session['item_parameters'],
                max_items=20,
                target_se=0.3
            ):
                return self._finalize_assessment(session_id)
            
            # Filter questions by Bloom's level
            current_blooms = session['current_blooms_level']
            target_questions = self._filter_by_blooms_level(
                question_bank,
                current_blooms,
                session['answered_item_ids']
            )
            
            if not target_questions:
                # No questions at current level, use any available
                target_questions = [q for q in question_bank 
                                   if q['id'] not in session['answered_item_ids']]
            
            # Select best question using IRT
            next_item = self.irt_engine.select_next_item(
                session['current_theta'],
                target_questions,
                session['answered_item_ids']
            )
            
            if not next_item:
                # Generate new question if bank exhausted
                next_item = self._generate_question(
                    session['topic'],
                    current_blooms,
                    session['current_theta']
                )
            
            # Update session
            session['question_count'] += 1
            session['answered_item_ids'].add(next_item['id'])
            
            return {
                'question_id': next_item['id'],
                'question_text': next_item['text'],
                'options': next_item.get('options', []),
                'blooms_level': next_item.get('blooms_level', current_blooms),
                'estimated_difficulty': next_item.get('difficulty', 0.0),
                'question_number': session['question_count'],
                'current_ability': session['current_theta'],
                'ability_description': self.irt_engine.get_ability_description(
                    session['current_theta']
                )
            }
            
        except Exception as e:
            logger.error(f"Error getting next question: {str(e)}")
            raise
    
    def process_response(self, session_id: str, question_id: str,
                        response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process student response and update ability estimate
        
        Args:
            session_id: Active session ID
            question_id: Question ID
            response: Response data with 'answer' and 'item_parameters'
            
        Returns:
            Feedback and updated metrics
        """
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Session not found: {session_id}")
            
            session = self.active_sessions[session_id]
            
            # Determine if response is correct
            is_correct = response.get('is_correct', False)
            correct_value = 1 if is_correct else 0
            
            # Get item parameters
            item_params = response.get('item_parameters', {
                'difficulty': 0.0,
                'discrimination': 1.0
            })
            
            # Update session data
            session['responses'].append(correct_value)
            session['item_parameters'].append(item_params)
            
            # Update performance metrics
            session['performance_metrics']['total_count'] += 1
            if is_correct:
                session['performance_metrics']['correct_count'] += 1
            
            session['performance_metrics']['current_accuracy'] = (
                session['performance_metrics']['correct_count'] / 
                session['performance_metrics']['total_count']
            )
            
            # Re-estimate ability using IRT
            new_theta = self.irt_engine.estimate_ability(
                session['responses'],
                session['item_parameters']
            )
            
            previous_theta = session['current_theta']
            session['current_theta'] = new_theta
            
            # Update Bloom's level based on performance
            current_blooms = session['current_blooms_level']
            new_blooms = self.blooms_engine.suggest_next_level(
                current_blooms,
                session['performance_metrics']['current_accuracy']
            )
            session['current_blooms_level'] = new_blooms
            
            # Calculate standard error
            standard_error = self.irt_engine.calculate_standard_error(
                new_theta,
                session['item_parameters']
            )
            
            # Generate feedback
            feedback = self._generate_feedback(
                is_correct,
                new_theta,
                previous_theta,
                new_blooms,
                response.get('explanation', '')
            )
            
            logger.info(f"Processed response - Theta: {new_theta:.3f}, Level: {new_blooms}")
            
            return {
                'correct': is_correct,
                'feedback': feedback,
                'updated_ability': new_theta,
                'ability_change': new_theta - previous_theta,
                'ability_description': self.irt_engine.get_ability_description(new_theta),
                'current_blooms_level': new_blooms,
                'standard_error': standard_error,
                'performance_metrics': session['performance_metrics'],
                'continue_assessment': not self.irt_engine.is_termination_criteria_met(
                    new_theta,
                    session['item_parameters']
                )
            }
            
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}")
            raise
    
    def get_session_progress(self, session_id: str) -> Dict[str, Any]:
        """
        Get current session progress and analytics
        
        Args:
            session_id: Session ID
            
        Returns:
            Progress data and analytics
        """
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Session not found: {session_id}")
            
            session = self.active_sessions[session_id]
            
            # Calculate progress percentage
            max_questions = 20
            progress_percentage = (session['question_count'] / max_questions) * 100
            
            # Get ability trajectory
            ability_history = []
            running_responses = []
            running_params = []
            
            for i, (resp, param) in enumerate(zip(session['responses'], 
                                                   session['item_parameters'])):
                running_responses.append(resp)
                running_params.append(param)
                
                theta = self.irt_engine.estimate_ability(running_responses, running_params)
                ability_history.append({
                    'question_number': i + 1,
                    'ability': theta,
                    'correct': resp == 1
                })
            
            return {
                'session_id': session_id,
                'progress_percentage': progress_percentage,
                'questions_answered': session['question_count'],
                'current_ability': session['current_theta'],
                'ability_description': self.irt_engine.get_ability_description(
                    session['current_theta']
                ),
                'current_blooms_level': session['current_blooms_level'],
                'performance_metrics': session['performance_metrics'],
                'ability_history': ability_history,
                'estimated_questions_remaining': max(0, max_questions - session['question_count'])
            }
            
        except Exception as e:
            logger.error(f"Error getting session progress: {str(e)}")
            raise
    
    def _finalize_assessment(self, session_id: str) -> Dict[str, Any]:
        """
        Finalize assessment and generate comprehensive report
        
        Args:
            session_id: Session ID
            
        Returns:
            Final assessment report
        """
        try:
            session = self.active_sessions[session_id]
            
            # Calculate final metrics
            final_theta = session['current_theta']
            standard_error = self.irt_engine.calculate_standard_error(
                final_theta,
                session['item_parameters']
            )
            
            # Determine proficiency level
            ability_description = self.irt_engine.get_ability_description(final_theta)
            
            # Calculate Bloom's level mastery
            blooms_distribution = {}
            for item in session['item_parameters']:
                level = item.get('blooms_level', 'understand')
                blooms_distribution[level] = blooms_distribution.get(level, 0) + 1
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                final_theta,
                session['current_blooms_level'],
                session['performance_metrics']
            )
            
            # Mark session as complete
            session['end_time'] = datetime.now().isoformat()
            session['status'] = 'completed'
            
            report = {
                'session_id': session_id,
                'status': 'completed',
                'final_ability': final_theta,
                'ability_description': ability_description,
                'standard_error': standard_error,
                'confidence_interval': {
                    'lower': final_theta - (1.96 * standard_error),
                    'upper': final_theta + (1.96 * standard_error)
                },
                'final_blooms_level': session['current_blooms_level'],
                'total_questions': session['question_count'],
                'performance_metrics': session['performance_metrics'],
                'blooms_distribution': blooms_distribution,
                'recommendations': recommendations,
                'duration_minutes': self._calculate_duration(session),
                'assessment_complete': True
            }
            
            logger.info(f"Assessment finalized: {session_id}")
            return report
            
        except Exception as e:
            logger.error(f"Error finalizing assessment: {str(e)}")
            raise
    
    def _filter_by_blooms_level(self, questions: List[Dict], 
                                target_level: str,
                                answered_ids: set) -> List[Dict]:
        """Filter questions by Bloom's taxonomy level"""
        try:
            # Get adjacent levels (current, one below, one above)
            levels = self.blooms_engine.cognitive_levels
            target_idx = levels.index(target_level)
            
            valid_levels = [target_level]
            if target_idx > 0:
                valid_levels.append(levels[target_idx - 1])
            if target_idx < len(levels) - 1:
                valid_levels.append(levels[target_idx + 1])
            
            filtered = [
                q for q in questions
                if q.get('blooms_level') in valid_levels
                and q['id'] not in answered_ids
            ]
            
            return filtered
            
        except Exception as e:
            logger.error(f"Error filtering by Bloom's level: {str(e)}")
            return questions
    
    def _generate_question(self, topic: str, blooms_level: str, 
                          theta: float) -> Dict[str, Any]:
        """
        Generate new question dynamically using AI
        
        Args:
            topic: Question topic
            blooms_level: Target Bloom's level
            theta: Current ability estimate
            
        Returns:
            Generated question with parameters
        """
        try:
            # Map theta to difficulty
            difficulty_map = {
                'easy': (-2, -0.5),
                'medium': (-0.5, 0.5),
                'hard': (0.5, 2)
            }
            
            if theta < -0.5:
                difficulty = 'easy'
            elif theta < 0.5:
                difficulty = 'medium'
            else:
                difficulty = 'hard'
            
            # Generate question prompt
            prompt = f"""Generate a {difficulty} difficulty multiple choice question about {topic} 
at the {blooms_level} cognitive level of Bloom's Taxonomy.

The question should:
- Be appropriate for {blooms_level} level (use verbs like: {', '.join(self.blooms_engine.level_verbs[blooms_level][:5])})
- Have 4 options (A, B, C, D)
- Include the correct answer
- Provide a brief explanation

Format:
Question: [Your question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [A/B/C/D]
Explanation: [Brief explanation]"""
            
            # Generate using AI service
            if self.openai_service.is_available():
                generated_text = self.openai_service.generate_text(prompt, max_length=300)
            else:
                # Fallback to template
                generated_text = self._fallback_question_template(topic, blooms_level)
            
            # Parse generated question
            parsed = self._parse_generated_question(generated_text)
            
            # Estimate IRT parameters
            target_difficulty = sum(difficulty_map[difficulty]) / 2
            
            question = {
                'id': f"generated_{datetime.now().timestamp()}",
                'text': parsed['question'],
                'options': parsed['options'],
                'correct_answer': parsed['correct_answer'],
                'explanation': parsed['explanation'],
                'blooms_level': blooms_level,
                'difficulty': target_difficulty,
                'discrimination': 1.0,
                'generated': True
            }
            
            return question
            
        except Exception as e:
            logger.error(f"Error generating question: {str(e)}")
            return self._fallback_question(topic, blooms_level)
    
    def _parse_generated_question(self, text: str) -> Dict[str, Any]:
        """Parse AI-generated question text"""
        try:
            lines = text.strip().split('\n')
            
            question = ""
            options = []
            correct_answer = "A"
            explanation = ""
            
            for line in lines:
                line = line.strip()
                if line.startswith('Question:'):
                    question = line.replace('Question:', '').strip()
                elif line.startswith(('A)', 'B)', 'C)', 'D)')):
                    options.append({
                        'id': line[0],
                        'text': line[3:].strip()
                    })
                elif line.startswith('Correct Answer:'):
                    correct_answer = line.split(':')[1].strip()[0]
                elif line.startswith('Explanation:'):
                    explanation = line.replace('Explanation:', '').strip()
            
            return {
                'question': question or "Generated question",
                'options': options or [
                    {'id': 'A', 'text': 'Option A'},
                    {'id': 'B', 'text': 'Option B'},
                    {'id': 'C', 'text': 'Option C'},
                    {'id': 'D', 'text': 'Option D'}
                ],
                'correct_answer': correct_answer,
                'explanation': explanation or "No explanation provided"
            }
            
        except Exception as e:
            logger.error(f"Error parsing generated question: {str(e)}")
            return {
                'question': "Sample question",
                'options': [
                    {'id': 'A', 'text': 'Option A'},
                    {'id': 'B', 'text': 'Option B'},
                    {'id': 'C', 'text': 'Option C'},
                    {'id': 'D', 'text': 'Option D'}
                ],
                'correct_answer': 'A',
                'explanation': 'Sample explanation'
            }
    
    def _fallback_question_template(self, topic: str, blooms_level: str) -> str:
        """Generate fallback question when AI unavailable"""
        templates = {
            'remember': f"Question: What is the definition of {topic}?\nA) Definition A\nB) Definition B\nC) Definition C\nD) Definition D\nCorrect Answer: A",
            'understand': f"Question: Explain the concept of {topic}?\nA) Explanation A\nB) Explanation B\nC) Explanation C\nD) Explanation D\nCorrect Answer: A",
            'apply': f"Question: How would you apply {topic} to solve a problem?\nA) Method A\nB) Method B\nC) Method C\nD) Method D\nCorrect Answer: A",
            'analyze': f"Question: Analyze the components of {topic}?\nA) Analysis A\nB) Analysis B\nC) Analysis C\nD) Analysis D\nCorrect Answer: A",
            'evaluate': f"Question: Evaluate the effectiveness of {topic}?\nA) Evaluation A\nB) Evaluation B\nC) Evaluation C\nD) Evaluation D\nCorrect Answer: A",
            'create': f"Question: Design a solution using {topic}?\nA) Design A\nB) Design B\nC) Design C\nD) Design D\nCorrect Answer: A"
        }
        
        return templates.get(blooms_level, templates['understand'])
    
    def _fallback_question(self, topic: str, blooms_level: str) -> Dict:
        """Create fallback question structure"""
        return {
            'id': f"fallback_{datetime.now().timestamp()}",
            'text': f"Sample {blooms_level} question about {topic}",
            'options': [
                {'id': 'A', 'text': 'Option A'},
                {'id': 'B', 'text': 'Option B'},
                {'id': 'C', 'text': 'Option C'},
                {'id': 'D', 'text': 'Option D'}
            ],
            'correct_answer': 'A',
            'explanation': 'Sample explanation',
            'blooms_level': blooms_level,
            'difficulty': 0.0,
            'discrimination': 1.0
        }
    
    def _generate_feedback(self, is_correct: bool, new_theta: float,
                          old_theta: float, blooms_level: str,
                          explanation: str) -> Dict[str, Any]:
        """Generate personalized feedback"""
        try:
            if is_correct:
                message = "Excellent work! "
                if new_theta > old_theta:
                    message += "Your understanding is improving. "
            else:
                message = "Not quite correct. "
                if new_theta < old_theta:
                    message += "Let's review this concept. "
            
            message += f"\n{explanation}"
            
            # Add level-specific guidance
            level_guidance = {
                'remember': "Focus on key definitions and facts.",
                'understand': "Try to explain concepts in your own words.",
                'apply': "Practice applying concepts to different scenarios.",
                'analyze': "Break down complex problems into components.",
                'evaluate': "Consider multiple perspectives and criteria.",
                'create': "Synthesize knowledge to create new solutions."
            }
            
            guidance = level_guidance.get(blooms_level, "")
            
            return {
                'message': message,
                'guidance': guidance,
                'ability_level': self.irt_engine.get_ability_description(new_theta),
                'cognitive_level': blooms_level
            }
            
        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
            return {'message': 'Response recorded', 'guidance': ''}
    
    def _generate_recommendations(self, theta: float, blooms_level: str,
                                 metrics: Dict) -> List[str]:
        """Generate personalized learning recommendations"""
        recommendations = []
        
        # Ability-based recommendations
        if theta < -1.0:
            recommendations.append("Focus on foundational concepts before advancing")
            recommendations.append("Review basic materials and examples")
        elif theta < 0.0:
            recommendations.append("Continue practicing at current level")
            recommendations.append("Try additional exercises for reinforcement")
        elif theta < 1.0:
            recommendations.append("You're ready for more challenging material")
            recommendations.append("Explore advanced topics in this area")
        else:
            recommendations.append("Excellent mastery! Consider mentoring others")
            recommendations.append("Explore cutting-edge topics and research")
        
        # Bloom's level recommendations
        next_level_idx = self.blooms_engine.cognitive_levels.index(blooms_level) + 1
        if next_level_idx < len(self.blooms_engine.cognitive_levels):
            next_level = self.blooms_engine.cognitive_levels[next_level_idx]
            recommendations.append(
                f"Progress to {next_level}-level activities to deepen understanding"
            )
        
        # Performance-based recommendations
        accuracy = metrics.get('current_accuracy', 0.0)
        if accuracy < 0.6:
            recommendations.append("Review incorrect responses and explanations")
        
        return recommendations
    
    def _calculate_duration(self, session: Dict) -> float:
        """Calculate session duration in minutes"""
        try:
            start = datetime.fromisoformat(session['start_time'])
            end = datetime.fromisoformat(session['end_time'])
            duration = (end - start).total_seconds() / 60
            return round(duration, 2)
        except:
            return 0.0
    
    def _map_difficulty_to_blooms(self, difficulty: str) -> str:
        """Map difficulty level to Bloom's cognitive level"""
        mapping = {
            'easy': 'remember',
            'medium': 'understand',
            'hard': 'apply'
        }
        return mapping.get(difficulty, 'understand')