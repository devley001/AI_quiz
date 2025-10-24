# ai-service/src/routes/adaptive_routes.py
"""
API Routes for Adaptive Assessment System
Integrates IRT and Bloom's Taxonomy
"""

from flask import Blueprint, request, jsonify
from controllers.adaptive_assessment_controller import AdaptiveAssessmentController
from utils.validators import validate_request
import logging

logger = logging.getLogger(__name__)

adaptive_bp = Blueprint('adaptive', __name__)
adaptive_controller = AdaptiveAssessmentController()

@adaptive_bp.route('/adaptive/initialize', methods=['POST'])
def initialize_adaptive_session():
    """Initialize new adaptive assessment session"""
    try:
        data = request.get_json()
        
        if not validate_request(data, ['user_id', 'topic']):
            return jsonify({
                'success': False,
                'message': 'user_id and topic are required'
            }), 400
        
        result = adaptive_controller.initialize_session(
            user_id=data['user_id'],
            topic=data['topic'],
            initial_level=data.get('initial_level', 'medium')
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Adaptive session initialized'
        }), 200
        
    except Exception as e:
        logger.error(f"Initialize session error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to initialize session'
        }), 500

@adaptive_bp.route('/adaptive/next-question', methods=['POST'])
def get_next_adaptive_question():
    """Get next adaptive question based on current ability"""
    try:
        data = request.get_json()
        
        if not validate_request(data, ['session_id']):
            return jsonify({
                'success': False,
                'message': 'session_id is required'
            }), 400
        
        # Mock question bank (in production, fetch from database)
        question_bank = data.get('question_bank', _get_sample_question_bank())
        
        result = adaptive_controller.get_next_question(
            session_id=data['session_id'],
            question_bank=question_bank
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Next question retrieved'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404
    except Exception as e:
        logger.error(f"Get next question error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get next question'
        }), 500

@adaptive_bp.route('/adaptive/submit-response', methods=['POST'])
def submit_adaptive_response():
    """Submit response and get updated ability estimate"""
    try:
        data = request.get_json()
        
        if not validate_request(data, ['session_id', 'question_id', 'response']):
            return jsonify({
                'success': False,
                'message': 'session_id, question_id, and response are required'
            }), 400
        
        result = adaptive_controller.process_response(
            session_id=data['session_id'],
            question_id=data['question_id'],
            response=data['response']
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Response processed successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404
    except Exception as e:
        logger.error(f"Submit response error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to process response'
        }), 500

@adaptive_bp.route('/adaptive/progress/<session_id>', methods=['GET'])
def get_adaptive_progress(session_id):
    """Get current session progress and analytics"""
    try:
        result = adaptive_controller.get_session_progress(session_id)
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Progress retrieved successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404
    except Exception as e:
        logger.error(f"Get progress error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get progress'
        }), 500

@adaptive_bp.route('/adaptive/classify-question', methods=['POST'])
def classify_question_taxonomy():
    """Classify a question using Bloom's Taxonomy"""
    try:
        data = request.get_json()
        
        if not validate_request(data, ['question_text']):
            return jsonify({
                'success': False,
                'message': 'question_text is required'
            }), 400
        
        result = adaptive_controller.blooms_engine.classify_question(
            data['question_text']
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Question classified successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Classify question error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to classify question'
        }), 500

@adaptive_bp.route('/adaptive/learning-path', methods=['POST'])
def generate_learning_path():
    """Generate personalized learning path"""
    try:
        data = request.get_json()
        
        if not validate_request(data, ['start_level', 'target_level']):
            return jsonify({
                'success': False,
                'message': 'start_level and target_level are required'
            }), 400
        
        result = adaptive_controller.blooms_engine.generate_learning_path(
            start_level=data['start_level'],
            target_level=data['target_level']
        )
        
        return jsonify({
            'success': True,
            'data': {
                'learning_path': result,
                'total_steps': len(result)
            },
            'message': 'Learning path generated'
        }), 200
        
    except Exception as e:
        logger.error(f"Generate learning path error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to generate learning path'
        }), 500

@adaptive_bp.route('/adaptive/calibrate-item', methods=['POST'])
def calibrate_item_parameters():
    """Calibrate IRT parameters for an item"""
    try:
        data = request.get_json()
        
        if not validate_request(data, ['responses_data']):
            return jsonify({
                'success': False,
                'message': 'responses_data is required'
            }), 400
        
        result = adaptive_controller.irt_engine.calibrate_item(
            data['responses_data']
        )
        
        return jsonify({
            'success': True,
            'data': result,
            'message': 'Item calibrated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Calibrate item error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to calibrate item'
        }), 500

@adaptive_bp.route('/adaptive/recommend-mix', methods=['POST'])
def recommend_question_mix():
    """Recommend optimal question mix for learner"""
    try:
        data = request.get_json()
        
        if not validate_request(data, ['total_questions', 'learner_level']):
            return jsonify({
                'success': False,
                'message': 'total_questions and learner_level are required'
            }), 400
        
        result = adaptive_controller.blooms_engine.recommend_question_mix(
            total_questions=data['total_questions'],
            learner_level=data['learner_level']
        )
        
        return jsonify({
            'success': True,
            'data': {
                'recommended_distribution': result,
                'total_questions': data['total_questions']
            },
            'message': 'Question mix recommended'
        }), 200
        
    except Exception as e:
        logger.error(f"Recommend mix error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to recommend question mix'
        }), 500

def _get_sample_question_bank():
    """Sample question bank with IRT parameters and Bloom's tags"""
    return [
        {
            'id': 'q1',
            'text': 'Define a binary tree in computer science',
            'options': [
                {'id': 'A', 'text': 'A tree structure with at most two children per node'},
                {'id': 'B', 'text': 'A tree with only two nodes'},
                {'id': 'C', 'text': 'A tree with binary values'},
                {'id': 'D', 'text': 'A linear data structure'}
            ],
            'correct_answer': 'A',
            'blooms_level': 'remember',
            'difficulty': -1.5,
            'discrimination': 1.2
        },
        {
            'id': 'q2',
            'text': 'Explain the difference between a stack and a queue',
            'options': [
                {'id': 'A', 'text': 'Stack is LIFO, Queue is FIFO'},
                {'id': 'B', 'text': 'They are the same'},
                {'id': 'C', 'text': 'Stack is FIFO, Queue is LIFO'},
                {'id': 'D', 'text': 'No difference'}
            ],
            'correct_answer': 'A',
            'blooms_level': 'understand',
            'difficulty': -0.5,
            'discrimination': 1.0
        },
        {
            'id': 'q3',
            'text': 'Implement a depth-first search algorithm for a binary tree',
            'options': [
                {'id': 'A', 'text': 'Use recursion with preorder traversal'},
                {'id': 'B', 'text': 'Use iteration with level-order traversal'},
                {'id': 'C', 'text': 'Use breadth-first approach'},
                {'id': 'D', 'text': 'Use linear search'}
            ],
            'correct_answer': 'A',
            'blooms_level': 'apply',
            'difficulty': 0.5,
            'discrimination': 1.3
        },
        {
            'id': 'q4',
            'text': 'Analyze the time complexity of quicksort in worst case',
            'options': [
                {'id': 'A', 'text': 'O(n^2) when pivot is always smallest/largest'},
                {'id': 'B', 'text': 'O(n log n) always'},
                {'id': 'C', 'text': 'O(n) when sorted'},
                {'id': 'D', 'text': 'O(log n) average'}
            ],
            'correct_answer': 'A',
            'blooms_level': 'analyze',
            'difficulty': 1.0,
            'discrimination': 1.5
        },
        {
            'id': 'q5',
            'text': 'Evaluate which sorting algorithm is best for nearly sorted data',
            'options': [
                {'id': 'A', 'text': 'Insertion sort due to O(n) best case'},
                {'id': 'B', 'text': 'Bubble sort is always best'},
                {'id': 'C', 'text': 'Merge sort is fastest'},
                {'id': 'D', 'text': 'Selection sort is optimal'}
            ],
            'correct_answer': 'A',
            'blooms_level': 'evaluate',
            'difficulty': 1.5,
            'discrimination': 1.4
        },
        {
            'id': 'q6',
            'text': 'Design an efficient algorithm to detect cycles in a linked list',
            'options': [
                {'id': 'A', 'text': 'Use Floyd\'s cycle detection (tortoise and hare)'},
                {'id': 'B', 'text': 'Use linear search'},
                {'id': 'C', 'text': 'Use binary search'},
                {'id': 'D', 'text': 'Use bubble sort'}
            ],
            'correct_answer': 'A',
            'blooms_level': 'create',
            'difficulty': 2.0,
            'discrimination': 1.6
        }
    ]