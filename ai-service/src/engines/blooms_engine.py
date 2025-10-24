# ai-service/src/engines/blooms_engine.py
"""
Bloom's Taxonomy Classification Engine
Classifies questions and learning objectives by cognitive levels
"""

import logging
import re
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class BloomsEngine:
    """
    Engine for classifying questions using Bloom's Taxonomy (Revised)
    Cognitive levels: Remember, Understand, Apply, Analyze, Evaluate, Create
    """
    
    def __init__(self):
        # Bloom's Taxonomy cognitive levels (lowest to highest)
        self.cognitive_levels = [
            'remember',    # Level 1
            'understand',  # Level 2
            'apply',       # Level 3
            'analyze',     # Level 4
            'evaluate',    # Level 5
            'create'       # Level 6
        ]
        
        # Action verbs for each cognitive level
        self.level_verbs = {
            'remember': [
                'define', 'identify', 'list', 'name', 'recall', 'recognize',
                'state', 'describe', 'label', 'match', 'select', 'memorize',
                'repeat', 'reproduce', 'retrieve'
            ],
            'understand': [
                'explain', 'summarize', 'interpret', 'classify', 'compare',
                'contrast', 'demonstrate', 'illustrate', 'paraphrase',
                'translate', 'infer', 'discuss', 'distinguish', 'estimate'
            ],
            'apply': [
                'apply', 'execute', 'implement', 'solve', 'use', 'demonstrate',
                'operate', 'sketch', 'compute', 'calculate', 'construct',
                'modify', 'prepare', 'produce', 'show', 'employ'
            ],
            'analyze': [
                'analyze', 'differentiate', 'organize', 'attribute', 'deconstruct',
                'compare', 'contrast', 'distinguish', 'examine', 'experiment',
                'question', 'test', 'categorize', 'investigate', 'dissect'
            ],
            'evaluate': [
                'evaluate', 'check', 'critique', 'judge', 'assess', 'defend',
                'justify', 'support', 'argue', 'recommend', 'prioritize',
                'rate', 'conclude', 'decide', 'verify', 'validate'
            ],
            'create': [
                'create', 'design', 'construct', 'develop', 'formulate',
                'assemble', 'devise', 'compose', 'generate', 'plan',
                'produce', 'invent', 'make', 'build', 'synthesize'
            ]
        }
        
        # Complexity mapping
        self.complexity_mapping = {
            'remember': {'difficulty': 1, 'description': 'Basic recall and recognition'},
            'understand': {'difficulty': 2, 'description': 'Comprehension and interpretation'},
            'apply': {'difficulty': 3, 'description': 'Application of knowledge'},
            'analyze': {'difficulty': 4, 'description': 'Breaking down and examining'},
            'evaluate': {'difficulty': 5, 'description': 'Critical judgment'},
            'create': {'difficulty': 6, 'description': 'Building new structures'}
        }
    
    def classify_question(self, question_text: str) -> Dict[str, Any]:
        """
        Classify a question according to Bloom's Taxonomy
        
        Args:
            question_text: The question to classify
            
        Returns:
            Dict with cognitive level, confidence, and details
        """
        try:
            question_lower = question_text.lower()
            
            # Extract action verbs from question
            detected_verbs = []
            level_scores = {level: 0 for level in self.cognitive_levels}
            
            # Check for each level's verbs
            for level, verbs in self.level_verbs.items():
                for verb in verbs:
                    # Check if verb appears in question
                    pattern = r'\b' + re.escape(verb) + r'\b'
                    if re.search(pattern, question_lower):
                        detected_verbs.append((verb, level))
                        level_scores[level] += 1
            
            # Determine primary cognitive level
            if detected_verbs:
                # Get level with highest score
                primary_level = max(level_scores.items(), key=lambda x: x[1])[0]
                confidence = min(level_scores[primary_level] * 0.3, 1.0)
            else:
                # No explicit verbs found, use heuristics
                primary_level = self._classify_by_heuristics(question_text)
                confidence = 0.5
            
            # Get level index (1-6)
            level_index = self.cognitive_levels.index(primary_level) + 1
            
            return {
                'cognitive_level': primary_level,
                'level_index': level_index,
                'confidence': confidence,
                'detected_verbs': [v[0] for v in detected_verbs],
                'complexity': self.complexity_mapping[primary_level],
                'description': self._get_level_description(primary_level)
            }
            
        except Exception as e:
            logger.error(f"Error classifying question: {str(e)}")
            return {
                'cognitive_level': 'understand',
                'level_index': 2,
                'confidence': 0.3,
                'detected_verbs': [],
                'complexity': self.complexity_mapping['understand'],
                'description': 'Unable to classify accurately'
            }
    
    def _classify_by_heuristics(self, question_text: str) -> str:
        """
        Classify question using heuristic rules when no explicit verbs found
        """
        question_lower = question_text.lower()
        
        # Heuristic patterns
        if any(word in question_lower for word in ['what is', 'define', 'who is', 'when did']):
            return 'remember'
        
        elif any(word in question_lower for word in ['why', 'how does', 'explain']):
            return 'understand'
        
        elif any(word in question_lower for word in ['implement', 'code', 'write a program', 'solve']):
            return 'apply'
        
        elif any(word in question_lower for word in ['compare', 'analyze', 'examine', 'investigate']):
            return 'analyze'
        
        elif any(word in question_lower for word in ['evaluate', 'critique', 'assess', 'which is best']):
            return 'evaluate'
        
        elif any(word in question_lower for word in ['design', 'create', 'develop', 'propose']):
            return 'create'
        
        # Default to understand level
        return 'understand'
    
    def _get_level_description(self, level: str) -> str:
        """Get detailed description for cognitive level"""
        descriptions = {
            'remember': 'Retrieve relevant knowledge from long-term memory',
            'understand': 'Construct meaning from instructional messages',
            'apply': 'Carry out or use a procedure in a given situation',
            'analyze': 'Break material into parts and determine relationships',
            'evaluate': 'Make judgments based on criteria and standards',
            'create': 'Put elements together to form a coherent whole'
        }
        return descriptions.get(level, 'Unknown level')
    
    def suggest_next_level(self, current_level: str, performance: float) -> str:
        """
        Suggest next cognitive level based on current performance
        
        Args:
            current_level: Current Bloom's level
            performance: Performance score (0-1)
            
        Returns:
            Suggested next level
        """
        try:
            current_index = self.cognitive_levels.index(current_level)
            
            # If performing well (>80%), move up
            if performance > 0.8 and current_index < len(self.cognitive_levels) - 1:
                return self.cognitive_levels[current_index + 1]
            
            # If struggling (<50%), move down
            elif performance < 0.5 and current_index > 0:
                return self.cognitive_levels[current_index - 1]
            
            # Otherwise, stay at current level
            else:
                return current_level
                
        except Exception as e:
            logger.error(f"Error suggesting next level: {str(e)}")
            return current_level
    
    def generate_learning_path(self, start_level: str, target_level: str) -> List[Dict]:
        """
        Generate progressive learning path from start to target level
        
        Args:
            start_level: Starting cognitive level
            target_level: Target cognitive level
            
        Returns:
            List of learning steps
        """
        try:
            start_idx = self.cognitive_levels.index(start_level)
            target_idx = self.cognitive_levels.index(target_level)
            
            learning_path = []
            
            # Generate path from start to target
            if target_idx >= start_idx:
                levels_to_cover = self.cognitive_levels[start_idx:target_idx + 1]
            else:
                levels_to_cover = self.cognitive_levels[target_idx:start_idx + 1][::-1]
            
            for level in levels_to_cover:
                learning_path.append({
                    'level': level,
                    'level_index': self.cognitive_levels.index(level) + 1,
                    'description': self._get_level_description(level),
                    'example_verbs': self.level_verbs[level][:5],
                    'complexity': self.complexity_mapping[level]
                })
            
            return learning_path
            
        except Exception as e:
            logger.error(f"Error generating learning path: {str(e)}")
            return []
    
    def tag_question_bank(self, questions: List[Dict]) -> List[Dict]:
        """
        Tag entire question bank with Bloom's levels
        
        Args:
            questions: List of question dicts with 'text' field
            
        Returns:
            Questions with added taxonomy tags
        """
        try:
            tagged_questions = []
            
            for question in questions:
                classification = self.classify_question(question.get('text', ''))
                
                tagged_question = {
                    **question,
                    'blooms_level': classification['cognitive_level'],
                    'blooms_index': classification['level_index'],
                    'complexity_score': classification['complexity']['difficulty'],
                    'classification_confidence': classification['confidence']
                }
                
                tagged_questions.append(tagged_question)
            
            logger.info(f"Tagged {len(tagged_questions)} questions with Bloom's taxonomy")
            return tagged_questions
            
        except Exception as e:
            logger.error(f"Error tagging question bank: {str(e)}")
            return questions
    
    def get_level_distribution(self, questions: List[Dict]) -> Dict[str, int]:
        """
        Analyze distribution of cognitive levels in question bank
        
        Args:
            questions: Tagged questions
            
        Returns:
            Dict with count per cognitive level
        """
        try:
            distribution = {level: 0 for level in self.cognitive_levels}
            
            for question in questions:
                level = question.get('blooms_level', 'understand')
                if level in distribution:
                    distribution[level] += 1
            
            return distribution
            
        except Exception as e:
            logger.error(f"Error calculating distribution: {str(e)}")
            return {}
    
    def recommend_question_mix(self, total_questions: int, 
                               learner_level: str) -> Dict[str, int]:
        """
        Recommend optimal mix of questions across cognitive levels
        
        Args:
            total_questions: Total number of questions
            learner_level: Current learner cognitive level
            
        Returns:
            Dict with recommended count per level
        """
        try:
            learner_idx = self.cognitive_levels.index(learner_level)
            
            # Distribution strategy: 
            # - 40% at current level
            # - 30% one level below
            # - 20% one level above
            # - 10% mixed
            
            distribution = {level: 0 for level in self.cognitive_levels}
            
            # Current level
            distribution[learner_level] = int(total_questions * 0.4)
            
            # One below
            if learner_idx > 0:
                below_level = self.cognitive_levels[learner_idx - 1]
                distribution[below_level] = int(total_questions * 0.3)
            
            # One above
            if learner_idx < len(self.cognitive_levels) - 1:
                above_level = self.cognitive_levels[learner_idx + 1]
                distribution[above_level] = int(total_questions * 0.2)
            
            # Remaining distributed to other levels
            remaining = total_questions - sum(distribution.values())
            distribution[learner_level] += remaining
            
            return distribution
            
        except Exception as e:
            logger.error(f"Error recommending question mix: {str(e)}")
            return {learner_level: total_questions}