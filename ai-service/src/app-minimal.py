from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'AI Service'}), 200

@app.route('/api/generate/quiz', methods=['POST'])
def generate_quiz():
    data = request.get_json() or {}
    topic = data.get('topic', 'General Knowledge')
    num_questions = data.get('num_questions', 5)
    difficulty = data.get('difficulty', 'medium')
    
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
            {'question': 'Sum of angles in a triangle?', 'options': ['90°', '180°', '270°', '360°'], 'correctAnswer': 1}
        ]
    }
    
    available_questions = quiz_templates.get(topic, quiz_templates['Science'])
    questions = []
    
    for i in range(num_questions):
        if i < len(available_questions):
            questions.append(available_questions[i])
        else:
            questions.append(available_questions[i % len(available_questions)])
    
    return jsonify({
        'success': True,
        'data': {
            'quiz': {
                'title': f'{topic} Quiz',
                'topic': topic,
                'difficulty': difficulty,
                'questions': questions
            }
        }
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    print(f"Starting minimal AI Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)