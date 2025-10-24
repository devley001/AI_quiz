-# ai-service/src/engines/irt_engine.py
"""
Item Response Theory (IRT) Engine
Implements 2-Parameter Logistic (2PL) IRT model for adaptive assessment
"""

import numpy as np
from scipy.optimize import minimize
import logging

logger = logging.getLogger(__name__)

class IRTEngine:
    """
    Item Response Theory Engine for adaptive assessments
    Uses 2PL model: P(θ) = 1 / (1 + exp(-a(θ - b)))
    where:
    - θ (theta): Learner ability level
    - a: Item discrimination parameter
    - b: Item difficulty parameter
    """
    
    def __init__(self):
        self.min_ability = -3.0
        self.max_ability = 3.0
        self.initial_ability = 0.0
        
    def calculate_probability(self, theta, difficulty, discrimination):
        """
        Calculate probability of correct response using 2PL IRT model
        
        Args:
            theta: Learner ability level
            difficulty: Item difficulty (b parameter)
            discrimination: Item discrimination (a parameter)
            
        Returns:
            Probability of correct response (0-1)
        """
        try:
            exponent = -discrimination * (theta - difficulty)
            probability = 1 / (1 + np.exp(exponent))
            return probability
        except Exception as e:
            logger.error(f"Error calculating IRT probability: {str(e)}")
            return 0.5
    
    def estimate_ability(self, responses, item_parameters):
        """
        Estimate learner ability using Maximum Likelihood Estimation (MLE)
        
        Args:
            responses: List of response outcomes (1=correct, 0=incorrect)
            item_parameters: List of dicts with 'difficulty' and 'discrimination'
            
        Returns:
            Estimated theta (ability level)
        """
        try:
            if not responses or not item_parameters:
                return self.initial_ability
            
            def negative_log_likelihood(theta):
                """Calculate negative log-likelihood for optimization"""
                ll = 0
                for response, params in zip(responses, item_parameters):
                    prob = self.calculate_probability(
                        theta[0], 
                        params['difficulty'], 
                        params['discrimination']
                    )
                    # Avoid log(0)
                    prob = np.clip(prob, 0.0001, 0.9999)
                    
                    if response == 1:
                        ll += np.log(prob)
                    else:
                        ll += np.log(1 - prob)
                
                return -ll
            
            # Optimize to find theta
            result = minimize(
                negative_log_likelihood,
                x0=[self.initial_ability],
                bounds=[(self.min_ability, self.max_ability)],
                method='L-BFGS-B'
            )
            
            estimated_theta = result.x[0]
            logger.info(f"Estimated ability: {estimated_theta:.3f}")
            
            return estimated_theta
            
        except Exception as e:
            logger.error(f"Error estimating ability: {str(e)}")
            return self.initial_ability
    
    def select_next_item(self, current_theta, available_items, answered_items):
        """
        Select next item using Maximum Information criterion
        
        Args:
            current_theta: Current estimated ability
            available_items: List of available items with parameters
            answered_items: Set of already answered item IDs
            
        Returns:
            Selected item dict
        """
        try:
            max_information = -1
            best_item = None
            
            for item in available_items:
                if item['id'] in answered_items:
                    continue
                
                # Calculate Fisher information
                prob = self.calculate_probability(
                    current_theta,
                    item['difficulty'],
                    item['discrimination']
                )
                
                information = (item['discrimination'] ** 2) * prob * (1 - prob)
                
                if information > max_information:
                    max_information = information
                    best_item = item
            
            return best_item
            
        except Exception as e:
            logger.error(f"Error selecting next item: {str(e)}")
            return available_items[0] if available_items else None
    
    def calculate_standard_error(self, theta, item_parameters):
        """
        Calculate standard error of ability estimate
        
        Args:
            theta: Estimated ability level
            item_parameters: List of item parameters used
            
        Returns:
            Standard error of measurement
        """
        try:
            total_information = 0
            
            for params in item_parameters:
                prob = self.calculate_probability(
                    theta,
                    params['difficulty'],
                    params['discrimination']
                )
                information = (params['discrimination'] ** 2) * prob * (1 - prob)
                total_information += information
            
            if total_information > 0:
                standard_error = 1 / np.sqrt(total_information)
            else:
                standard_error = float('inf')
            
            return standard_error
            
        except Exception as e:
            logger.error(f"Error calculating standard error: {str(e)}")
            return float('inf')
    
    def is_termination_criteria_met(self, theta, item_parameters, max_items=20, target_se=0.3):
        """
        Check if test should terminate
        
        Args:
            theta: Current ability estimate
            item_parameters: Items answered so far
            max_items: Maximum number of items
            target_se: Target standard error
            
        Returns:
            Boolean indicating if test should stop
        """
        try:
            # Check max items
            if len(item_parameters) >= max_items:
                return True
            
            # Check standard error
            se = self.calculate_standard_error(theta, item_parameters)
            if se <= target_se:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking termination: {str(e)}")
            return False
    
    def get_ability_description(self, theta):
        """
        Convert theta to human-readable description
        
        Args:
            theta: Ability level
            
        Returns:
            Description string
        """
        if theta < -2.0:
            return "Beginner - Needs foundational support"
        elif theta < -1.0:
            return "Below Average - Requires additional practice"
        elif theta < 0.0:
            return "Developing - Making steady progress"
        elif theta < 1.0:
            return "Proficient - Solid understanding"
        elif theta < 2.0:
            return "Advanced - Strong mastery"
        else:
            return "Expert - Exceptional ability"
    
    def recommend_difficulty_level(self, theta):
        """
        Recommend difficulty level based on ability
        
        Args:
            theta: Current ability estimate
            
        Returns:
            Recommended difficulty string
        """
        if theta < -1.0:
            return "easy"
        elif theta < 1.0:
            return "medium"
        else:
            return "hard"
    
    def calibrate_item(self, responses_data):
        """
        Calibrate item parameters from response data
        
        Args:
            responses_data: List of dicts with 'theta' and 'response'
            
        Returns:
            Dict with estimated difficulty and discrimination
        """
        try:
            if len(responses_data) < 10:
                logger.warning("Insufficient data for calibration")
                return {'difficulty': 0.0, 'discrimination': 1.0}
            
            def negative_log_likelihood(params):
                difficulty, discrimination = params
                ll = 0
                
                for data in responses_data:
                    theta = data['theta']
                    response = data['response']
                    
                    prob = self.calculate_probability(theta, difficulty, discrimination)
                    prob = np.clip(prob, 0.0001, 0.9999)
                    
                    if response == 1:
                        ll += np.log(prob)
                    else:
                        ll += np.log(1 - prob)
                
                return -ll
            
            # Optimize parameters
            result = minimize(
                negative_log_likelihood,
                x0=[0.0, 1.0],
                bounds=[(-3, 3), (0.1, 2.5)],
                method='L-BFGS-B'
            )
            
            difficulty, discrimination = result.x
            
            return {
                'difficulty': float(difficulty),
                'discrimination': float(discrimination)
            }
            
        except Exception as e:
            logger.error(f"Error calibrating item: {str(e)}")
            return {'difficulty': 0.0, 'discrimination': 1.0}