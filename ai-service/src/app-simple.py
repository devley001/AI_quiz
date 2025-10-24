from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'AI Service',
        'version': '1.0.0'
    }), 200

@app.route('/api/analyze/text', methods=['POST'])
def analyze_text():
    return jsonify({
        'success': True,
        'message': 'Text analysis endpoint (simplified)',
        'data': {'sentiment': 'positive', 'confidence': 0.8}
    }), 200

@app.route('/api/generate/quiz', methods=['POST'])
def generate_quiz():
    from flask import request
    
    data = request.get_json() or {}
    topic = data.get('topic', 'General Knowledge')
    num_questions = data.get('num_questions', 5)
    difficulty = data.get('difficulty', 'medium')
    
    # Generate quiz questions based on topic
    quiz_templates = {
        'Science': [
            {'question': 'What is the chemical symbol for water?', 'options': ['H2O', 'CO2', 'NaCl', 'O2'], 'correctAnswer': 0},
            {'question': 'Which planet is known as the Red Planet?', 'options': ['Venus', 'Mars', 'Jupiter', 'Saturn'], 'correctAnswer': 1},
            {'question': 'What is the speed of light?', 'options': ['300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s'], 'correctAnswer': 0},
            {'question': 'What gas do plants absorb from the atmosphere?', 'options': ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], 'correctAnswer': 1},
            {'question': 'What is the hardest natural substance?', 'options': ['Gold', 'Iron', 'Diamond', 'Silver'], 'correctAnswer': 2}
        ],
        'History': [
            {'question': 'In which year did World War II end?', 'options': ['1944', '1945', '1946', '1947'], 'correctAnswer': 1},
            {'question': 'Who was the first President of the United States?', 'options': ['Thomas Jefferson', 'John Adams', 'George Washington', 'Benjamin Franklin'], 'correctAnswer': 2},
            {'question': 'Which empire was ruled by Julius Caesar?', 'options': ['Greek Empire', 'Roman Empire', 'Persian Empire', 'Egyptian Empire'], 'correctAnswer': 1},
            {'question': 'In which year did the Berlin Wall fall?', 'options': ['1987', '1988', '1989', '1990'], 'correctAnswer': 2},
            {'question': 'Who wrote the Declaration of Independence?', 'options': ['George Washington', 'Benjamin Franklin', 'Thomas Jefferson', 'John Adams'], 'correctAnswer': 2}
        ],
        'Mathematics': [
            {'question': 'What is 15% of 200?', 'options': ['25', '30', '35', '40'], 'correctAnswer': 1},
            {'question': 'What is the value of π (pi) approximately?', 'options': ['3.14159', '2.71828', '1.41421', '1.73205'], 'correctAnswer': 0},
            {'question': 'What is the square root of 144?', 'options': ['10', '11', '12', '13'], 'correctAnswer': 2},
            {'question': 'What is 7 × 8?', 'options': ['54', '56', '58', '60'], 'correctAnswer': 1},
            {'question': 'What is the sum of angles in a triangle?', 'options': ['90°', '180°', '270°', '360°'], 'correctAnswer': 1}
        ]
    }
    
    # Get questions for the topic or use Science as default
    available_questions = quiz_templates.get(topic, quiz_templates['Science'])
    
    # Select the requested number of questions
    selected_questions = []
    for i in range(min(num_questions, len(available_questions))):
        selected_questions.append(available_questions[i])
    
    # If we need more questions, repeat with variations
    while len(selected_questions) < num_questions:
        base_q = available_questions[len(selected_questions) % len(available_questions)]
        selected_questions.append(base_q)
    
    quiz_data = {
        'title': f'{topic} Quiz',
        'topic': topic,
        'difficulty': difficulty,
        'questions': selected_questions
    }
    
    return jsonify({
        'success': True,
        'message': 'Quiz generated successfully',
        'data': {'quiz': quiz_data}
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    print(f"Starting AI Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)