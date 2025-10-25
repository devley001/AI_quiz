# ai-service/src/engines/pedagogical_engine.py
"""
Pedagogical Engine - The Heart of the Adaptive Assessment System
Combines IRT and Bloom's Taxonomy for personalized learning experiences
"""

import logging
from typing import Dict, List, Any, Optional
from .irt_engine import IRTEngine
from .blooms_engine import BloomsEngine

logger = logging.getLogger(__name__)

class PedagogicalEngine:
    """
    Core engine that coordinates IRT and Bloom's Taxonomy for adaptive assessments
    Implements the conceptual model for Generative AI in Personalized Assessments
    """
    
    def __init__(self):
        self.irt_engine = IRTEngine()
        self.blooms_engine = BloomsEngine()
        
        # Adaptive parameters
        self.min_questions = 5
        self.max_questions = 20
        self.target_se = 0.3
        
        # Bloom's progression strategy
        self.progression_threshold = 0.8  # 80% accuracy to advance
        self.regression_threshold = 0.5   # 50% accuracy to regress
        
    def initialize_session(self, user_profile: Dict, topic: str) -> Dict[str, Any]:
        """
        Initialize adaptive session based on user profile and topic
        
        Args:
            user_profile: Student profile with ability estimates
            topic: Assessment topic
            
        Returns:
            Session initialization data
        """
        try:
            # Get initial ability from profile or use default
            initial_ability = user_profile.get('ability_estimates', {}).get(topic, 0.0)
            
            # Determine starting Bloom's level based on ability
            initial_blooms_level = self._ability_to_blooms_level(initial_ability)
            
            session_data = {
                'initial_ability': initial_ability,
                'current_ability': initial_ability,
                'initial_blooms_level': initial_blooms_level,
                'current_blooms_level': initial_blooms_level,
                'questions_answered': [],
                'ability_trajectory': [{'question': 0, 'ability': initial_ability}],
                'blooms_progression': [],
                'recommendations': []
            }
            
            logger.info(f"Session initialized: ability={initial_ability:.3f}, blooms={initial_blooms_level}")
            return session_data
            
        except Exception as e:
            logger.error(f"Error initializing session: {str(e)}")
            return self._default_session()
    
    def select_next_question(self, session_data: Dict, available_questions: List[Dict]) -> Optional[Dict]:
        """
        Select next question using combined IRT and Bloom's criteria
        
        Args:
            session_data: Current session state
            available_questions: Available question pool
            
        Returns:
            Selected question or None
        """
        try:
            current_ability = session_data['current_ability']
            current_blooms = session_data['current_blooms_level']
            answered_ids = {q['id'] for q in session_data['questions_answered']}
            
            # Filter questions by Bloom's level and availability
            suitable_questions = [
                q for q in available_questions
                if q['id'] not in answered_ids and
                self._is_suitable_blooms_level(q.get('blooms_level', 'understand'), current_blooms)
            ]
            
            if not suitable_questions:
                logger.warning("No suitable questions found")
                return None
            
            # Use IRT to select optimal question
            selected_question = self.irt_engine.select_next_item(
                current_ability,
                suitable_questions,
                answered_ids
            )
            
            logger.info(f"Selected question: {selected_question['id']} (blooms: {selected_question.get('blooms_level')})")
            return selected_question
            
        except Exception as e:
            logger.error(f"Error selecting question: {str(e)}")
            return available_questions[0] if available_questions else None
    
    def process_response(self, session_data: Dict, question: Dict, response: int, response_time: float) -> Dict[str, Any]:
        """
        Process student response and update session state
        
        Args:
            session_data: Current session state
            question: Question that was answered
            response: Student response (0=incorrect, 1=correct)
            response_time: Time taken to respond
            
        Returns:
            Updated session data with recommendations
        """
        try:
            # Add response to session
            session_data['questions_answered'].append({
                'id': question['id'],
                'blooms_level': question.get('blooms_level', 'understand'),
                'difficulty': question.get('difficulty', 0.0),
                'discrimination': question.get('discrimination', 1.0),
                'response': response,
                'response_time': response_time
            })
            
            # Update ability estimate using IRT
            responses = [q['response'] for q in session_data['questions_answered']]
            item_params = [
                {
                    'difficulty': q['difficulty'],
                    'discrimination': q['discrimination']
                }
                for q in session_data['questions_answered']
            ]
            
            new_ability = self.irt_engine.estimate_ability(responses, item_params)
            session_data['current_ability'] = new_ability
            session_data['ability_trajectory'].append({
                'question': len(session_data['questions_answered']),
                'ability': new_ability
            })
            
            # Update Bloom's level progression
            current_blooms = session_data['current_blooms_level']
            blooms_performance = self._calculate_blooms_performance(session_data, current_blooms)
            
            # Determine if Bloom's level should change
            new_blooms_level = self.blooms_engine.suggest_next_level(
                current_blooms, 
                blooms_performance
            )
            
            if new_blooms_level != current_blooms:
                session_data['current_blooms_level'] = new_blooms_level
                logger.info(f"Bloom's level changed: {current_blooms} -> {new_blooms_level}")
            
            # Generate recommendations
            recommendations = self._generate_recommendations(session_data, question, response)
            session_data['recommendations'].extend(recommendations)
            
            # Check termination criteria
            should_terminate = self._should_terminate_session(session_data, item_params)
            
            return {
                'session_data': session_data,
                'ability_change': new_ability - session_data['ability_trajectory'][-2]['ability'],
                'blooms_change': new_blooms_level != current_blooms,
                'recommendations': recommendations,
                'should_terminate': should_terminate,
                'performance_summary': self._get_performance_summary(session_data)
            }
            
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}")
            return {'session_data': session_data, 'should_terminate': True}
    
    def generate_final_report(self, session_data: Dict) -> Dict[str, Any]:
        """
        Generate comprehensive session report
        
        Args:
            session_data: Completed session data
            
        Returns:
            Detailed performance report
        """
        try:
            questions_answered = session_data['questions_answered']
            if not questions_answered:
                return {'error': 'No questions answered'}
            
            # Calculate overall metrics
            total_questions = len(questions_answered)
            correct_answers = sum(q['response'] for q in questions_answered)
            accuracy = correct_answers / total_questions
            
            # Ability progression
            initial_ability = session_data['initial_ability']
            final_ability = session_data['current_ability']
            ability_improvement = final_ability - initial_ability
            
            # Bloom's progression analysis
            blooms_analysis = self._analyze_blooms_progression(session_data)
            
            # Performance by cognitive level
            level_performance = {}
            for level in self.blooms_engine.cognitive_levels:
                level_questions = [q for q in questions_answered if q['blooms_level'] == level]
                if level_questions:
                    level_correct = sum(q['response'] for q in level_questions)
                    level_performance[level] = {
                        'questions': len(level_questions),
                        'correct': level_correct,
                        'accuracy': level_correct / len(level_questions)
                    }
            
            # Generate learning recommendations
            learning_path = self._generate_learning_path(session_data)
            
            report = {
                'session_summary': {
                    'total_questions': total_questions,
                    'correct_answers': correct_answers,
                    'accuracy': accuracy,
                    'initial_ability': initial_ability,
                    'final_ability': final_ability,
                    'ability_improvement': ability_improvement,
                    'initial_blooms_level': session_data['initial_blooms_level'],
                    'final_blooms_level': session_data['current_blooms_level']
                },
                'cognitive_analysis': {
                    'blooms_progression': blooms_analysis,
                    'level_performance': level_performance,
                    'strengths': self._identify_strengths(level_performance),
                    'weaknesses': self._identify_weaknesses(level_performance)
                },
                'learning_recommendations': learning_path,
                'next_steps': self._suggest_next_steps(session_data)
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            return {'error': str(e)}
    
    def _ability_to_blooms_level(self, ability: float) -> str:
        """Map IRT ability to appropriate Bloom's level"""
        if ability < -1.5:
            return 'remember'
        elif ability < -0.5:
            return 'understand'
        elif ability < 0.5:
            return 'apply'
        elif ability < 1.0:
            return 'analyze'
        elif ability < 1.5:
            return 'evaluate'
        else:
            return 'create'
    
    def _is_suitable_blooms_level(self, question_level: str, current_level: str) -> bool:
        """Check if question's Bloom's level is suitable for current level"""
        try:
            question_idx = self.blooms_engine.cognitive_levels.index(question_level)
            current_idx = self.blooms_engine.cognitive_levels.index(current_level)
            
            # Allow questions from current level and adjacent levels
            return abs(question_idx - current_idx) <= 1
            
        except ValueError:
            return True  # If level not found, allow question
    
    def _calculate_blooms_performance(self, session_data: Dict, blooms_level: str) -> float:
        """Calculate performance at specific Bloom's level"""
        level_questions = [
            q for q in session_data['questions_answered']
            if q['blooms_level'] == blooms_level
        ]
        
        if not level_questions:
            return 0.5  # Default performance
        
        correct = sum(q['response'] for q in level_questions)
        return correct / len(level_questions)
    
    def _should_terminate_session(self, session_data: Dict, item_params: List[Dict]) -> bool:
        """Check if session should terminate"""
        questions_count = len(session_data['questions_answered'])
        
        # Check minimum questions
        if questions_count < self.min_questions:
            return False
        
        # Check maximum questions
        if questions_count >= self.max_questions:
            return True
        
        # Check standard error
        current_ability = session_data['current_ability']
        se = self.irt_engine.calculate_standard_error(current_ability, item_params)
        
        return se <= self.target_se
    
    def _generate_recommendations(self, session_data: Dict, question: Dict, response: int) -> List[Dict]:
        """Generate immediate recommendations based on response"""
        recommendations = []
        
        if response == 0:  # Incorrect response
            recommendations.append({
                'type': 'remediate',
                'level': question.get('blooms_level', 'understand'),
                'description': f"Review concepts at {question.get('blooms_level')} level",
                'priority': 'high'
            })
        
        return recommendations
    
    def _get_performance_summary(self, session_data: Dict) -> Dict:
        """Get current performance summary"""
        questions = session_data['questions_answered']
        if not questions:
            return {}
        
        total = len(questions)
        correct = sum(q['response'] for q in questions)
        
        return {
            'questions_answered': total,
            'correct_answers': correct,
            'accuracy': correct / total,
            'current_ability': session_data['current_ability']
        }
    
    def _analyze_blooms_progression(self, session_data: Dict) -> Dict:
        """Analyze progression through Bloom's levels"""
        progression = {}
        
        for level in self.blooms_engine.cognitive_levels:
            level_questions = [
                q for q in session_data['questions_answered']
                if q['blooms_level'] == level
            ]
            
            if level_questions:
                correct = sum(q['response'] for q in level_questions)
                progression[level] = {
                    'attempted': len(level_questions),
                    'correct': correct,
                    'mastery': correct / len(level_questions)
                }
        
        return progression
    
    def _identify_strengths(self, level_performance: Dict) -> List[str]:
        """Identify cognitive strengths"""
        strengths = []
        for level, perf in level_performance.items():
            if perf['accuracy'] >= 0.8:
                strengths.append(level)
        return strengths
    
    def _identify_weaknesses(self, level_performance: Dict) -> List[str]:
        """Identify areas needing improvement"""
        weaknesses = []
        for level, perf in level_performance.items():
            if perf['accuracy'] < 0.6:
                weaknesses.append(level)
        return weaknesses
    
    def _generate_learning_path(self, session_data: Dict) -> List[Dict]:
        """Generate personalized learning path"""
        current_level = session_data['current_blooms_level']
        target_level = 'create'  # Ultimate goal
        
        return self.blooms_engine.generate_learning_path(current_level, target_level)
    
    def _suggest_next_steps(self, session_data: Dict) -> List[str]:
        """Suggest concrete next steps for learning"""
        suggestions = []
        current_ability = session_data['current_ability']
        
        if current_ability < 0:
            suggestions.append("Focus on foundational concepts and basic recall")
        elif current_ability < 1:
            suggestions.append("Practice application of learned concepts")
        else:
            suggestions.append("Engage in analysis and evaluation exercises")
        
        return suggestions
    
    def _default_session(self) -> Dict:
        """Return default session data"""
        return {
            'initial_ability': 0.0,
            'current_ability': 0.0,
            'initial_blooms_level': 'understand',
            'current_blooms_level': 'understand',
            'questions_answered': [],
            'ability_trajectory': [{'question': 0, 'ability': 0.0}],
            'blooms_progression': [],
            'recommendations': []
        }