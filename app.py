from flask import Flask, render_template, jsonify, request, session, send_from_directory
import os
import json
import openai
from dotenv import load_dotenv
import random

load_dotenv()

app = Flask(__name__)
app.secret_key = 'tempKey'

openai.api_key = os.getenv("OPENAI_API_KEY")

# Route to serve quiz files (both JS and JSON)
@app.route('/quizzes/<path:filename>')
def serve_quiz_files(filename):
    """Serve quiz files from the quizzes directory"""
    file_extension = filename.split('.')[-1].lower()
    
    if file_extension == 'js':
        mimetype = 'application/javascript'
    elif file_extension == 'json':
        mimetype = 'application/json'
    else:
        mimetype = 'text/plain'
    
    return send_from_directory('quizzes', filename, mimetype=mimetype)

# Video data - update with your actual video links
VIDEO_DATA = {
    'loops': {
        'title': 'Python Loops: For and While',
        'url': 'https://www.youtube.com/watch?v=94UHCEmprCY',
        'description': 'Learn how to automate repetitive tasks using for and while loops, understand iterables, and control flow statements.'
    },
    'functions': {
        'title': 'Python Functions Masterclass',
        'url': 'https://www.youtube.com/embed/94UHCEmprCY?enablejsapi=1',
        'description': 'Master Python functions, parameters, return values, and scope. Learn how to write reusable code blocks.'
    },
    'arrays': {
        'title': 'Understanding NumPy Arrays',
        'url': '#',
        'description': 'Discover how to use NumPy arrays for efficient numerical computations and data processing in Python.'
    },
    'lists': {
        'title': 'Python Lists and List Comprehensions',
        'url': '#',
        'description': 'Understand Python\'s built-in list data structure, methods, and operations for storing collections of items.'
    },
    'sets': {
        'title': 'Working with Python Sets',
        'url': '#',
        'description': 'Learn about Python\'s unordered collection of unique elements and set operations like union and intersection.'
    },
    'dictionaries': {
        'title': 'Python Dictionaries and Dictionary Comprehensions',
        'url': '#',
        'description': 'Explore key-value mappings in Python dictionaries, methods for accessing, modifying, and iterating through data.'
    }
}

@app.route('/')
def index():
    return render_template('index.html', topics=VIDEO_DATA)

@app.route('/admin')
def admin_panel():
    """Serve the admin panel page"""
    return render_template('admin.html')

@app.route('/api/video/<topic>')
def get_video(topic):
    if topic in VIDEO_DATA:
        return jsonify(VIDEO_DATA[topic])
    return jsonify({'error': 'Topic not found'}), 404

@app.route('/api/progress/update', methods=['POST'])
def update_progress():
    data = request.json
    topic = data.get('topic')
    progress = data.get('progress')

    if not topic or progress is None:
        return jsonify({'error': 'Missing data'}), 400

    user_progress = session.get('progress', {})
    user_progress[topic] = progress
    session['progress'] = user_progress

    return jsonify({'success': True, 'progress': user_progress})

@app.route('/api/progress')
def get_all_progress():
    user_progress = session.get('progress', {})
    return jsonify(user_progress)

@app.route('/api/quiz/generate/<topic>')
def generate_quiz_api(topic):
    """API endpoint to generate quiz questions using JavaScript quiz helpers"""
    num_questions = request.args.get('num_questions', 10, type=int)
    
    # Return a flag indicating that quiz generation should be handled client-side
    return jsonify({
        'topic': topic,
        'num_questions': num_questions,
        'use_client_generation': True
    })

@app.route('/api/quiz/remedial/<topic>')
def generate_remedial_quiz_api(topic):
    """API endpoint to generate remedial quiz questions"""
    incorrect_tags = session.get(f'incorrect_tags_{topic}', [])
    
    if not incorrect_tags:
        return jsonify({'error': 'No remedial quiz needed'}), 404
    
    return jsonify({
        'topic': topic,
        'incorrect_tags': incorrect_tags,
        'use_client_generation': True
    })

@app.route('/api/quiz/topics')
def get_quiz_topics():
    """API endpoint to discover all available quiz topics by scanning for JSON files"""
    try:
        quiz_dir = os.path.join(app.root_path, 'quizzes')
        topics = []
        
        if os.path.exists(quiz_dir):
            for filename in os.listdir(quiz_dir):
                if filename.endswith('Quiz.json'):
                    # Extract topic name (e.g., 'loopsQuiz.json' -> 'loops')
                    topic = filename.replace('Quiz.json', '')
                    topics.append(topic)
        
        topics.sort()  # Sort alphabetically for consistency
        return jsonify({'topics': topics, 'count': len(topics)})
        
    except Exception as e:
        print(f"Error discovering quiz topics: {e}")
        return jsonify({'topics': [], 'count': 0, 'error': str(e)})

@app.route("/api/quiz-tags/<topic>")
def get_quiz_tags(topic):
    """API endpoint to get available tags for a topic"""
    try:
        quiz_file = os.path.join(app.root_path, 'quizzes', f'{topic}Quiz.json')
        
        if os.path.exists(quiz_file):
            with open(quiz_file, 'r') as f:
                quiz_data = json.load(f)
                return jsonify(quiz_data.get('tags', {}))
        else:
            return jsonify({'error': f'Quiz file not found for topic: {topic}'}), 404
            
    except Exception as e:
        return jsonify({'error': f'Error loading tags for topic {topic}: {str(e)}'}), 500

@app.route('/api/admin/save-quiz/<topic>', methods=['POST'])
def save_quiz_admin(topic):
    """API endpoint to save quiz data from admin panel"""
    try:
        quiz_data = request.json
        
        if not quiz_data:
            return jsonify({'error': 'No quiz data provided'}), 400
        
        # Validate quiz data structure
        required_fields = ['tags', 'questions']
        for field in required_fields:
            if field not in quiz_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate questions
        if not isinstance(quiz_data['questions'], list):
            return jsonify({'error': 'Questions must be an array'}), 400
        
        for i, question in enumerate(quiz_data['questions']):
            if 'question' not in question or 'type' not in question or 'tags' not in question:
                return jsonify({'error': f'Question {i+1} is missing required fields'}), 400
            
            if question['type'] == 'multiple_choice':
                if 'options' not in question or 'answer' not in question:
                    return jsonify({'error': f'Multiple choice question {i+1} is missing options or answer'}), 400
        
        # Save to file
        quiz_file = os.path.join(app.root_path, 'quizzes', f'{topic}Quiz.json')
        
        with open(quiz_file, 'w') as f:
            json.dump(quiz_data, f, indent=2)
        
        return jsonify({'success': True, 'message': 'Quiz saved successfully'})
        
    except Exception as e:
        print(f"Error saving quiz {topic}: {e}")
        return jsonify({'error': f'Error saving quiz: {str(e)}'}), 500

@app.route("/quiz/<topic>")
def show_quiz(topic):
    """Serve the quiz page - quiz generation will be handled client-side"""
    return render_template("quiz.html", 
                         topic=topic,
                         current_topic=topic)

@app.route("/analyze", methods=["POST"])
def analyze_quiz():
    data = request.json
    answers = data.get("answers", {})
    topic = data.get("topic")
    questions = data.get("questions", [])  # Questions now sent from client

    print(f"DEBUG: Analyzing quiz for topic: {topic}")
    print(f"DEBUG: Received {len(questions)} questions")
    print(f"DEBUG: Received answers: {answers}")

    # Handle remedial quiz topic format (e.g., "loops-remedial")
    base_topic = topic.replace("-remedial", "")
    is_remedial = "-remedial" in topic
    
    # Store questions in session for reference
    session[f'current_quiz_{topic}'] = questions

    incorrect = []
    incorrect_tags = set()
    total_questions = len(questions)
    correct_count = 0

    for i, q in enumerate(questions):
        user_answer = answers.get(f"q{i}", "[No answer]")
        
        print(f"DEBUG: Question {i}: {q.get('question', 'No question text')[:50]}...")
        print(f"DEBUG: User answer: '{user_answer}'")
        print(f"DEBUG: Correct answer: '{q.get('answer', 'No correct answer')}'")
        print(f"DEBUG: Question type: {q.get('type', 'unknown')}")
        
        if q["type"] == "code_writing":
            # For code writing questions, let AI evaluate
            code_evaluation = evaluate_code_answer(q["question"], user_answer)
            print(f"DEBUG: Code evaluation result: {code_evaluation}")
            
            if code_evaluation["is_correct"]:
                correct_count += 1
                print(f"DEBUG: Code answer is CORRECT")
            else:
                print(f"DEBUG: Code answer is INCORRECT")
                incorrect.append({
                    "index": i,
                    "question": q["question"],
                    "answer": user_answer,
                    "correct": "AI will evaluate your code",
                    "ai_review": code_evaluation["feedback"],
                    "video": q.get("video", "#"),
                    "tags": q.get("tags", []),
                    "type": "code_writing"
                })
                incorrect_tags.update(q.get("tags", []))
        else:
            # For multiple choice, use predetermined answer
            correct_answer = q.get("answer", "")
            
            # Clean up answers for comparison - remove extra whitespace and normalize
            user_answer_clean = str(user_answer).strip()
            correct_answer_clean = str(correct_answer).strip()
            
            print(f"DEBUG: Comparing '{user_answer_clean}' == '{correct_answer_clean}'")
            
            if user_answer_clean == correct_answer_clean:
                correct_count += 1
                print(f"DEBUG: Multiple choice answer is CORRECT")
            else:
                print(f"DEBUG: Multiple choice answer is INCORRECT")
                ai_review = get_ai_review_for_mc(q["question"], user_answer, correct_answer)
                incorrect.append({
                    "index": i,
                    "question": q["question"],
                    "answer": user_answer,
                    "correct": correct_answer,
                    "ai_review": ai_review,
                    "video": q.get("video", "#"),
                    "tags": q.get("tags", []),
                    "type": "multiple_choice"
                })
                incorrect_tags.update(q.get("tags", []))

    print(f"DEBUG: Final score: {correct_count}/{total_questions}")
    print(f"DEBUG: Incorrect questions: {len(incorrect)}")
    print(f"DEBUG: Incorrect tags: {list(incorrect_tags)}")

    # Store incorrect tags for remedial quiz generation
    if is_remedial:
        # For remedial quizzes, update the original incorrect tags
        original_incorrect_tags = session.get(f'incorrect_tags_{base_topic}', [])
        # Remove tags that were answered correctly this time
        correct_tags = set()
        for i, q in enumerate(questions):
            user_answer = answers.get(f"q{i}", "[No answer]")
            if q["type"] == "code_writing":
                code_evaluation = evaluate_code_answer(q["question"], user_answer)
                if code_evaluation["is_correct"]:
                    correct_tags.update(q.get("tags", []))
            else:
                user_answer_clean = str(user_answer).strip()
                correct_answer_clean = str(q.get("answer", "")).strip()
                if user_answer_clean == correct_answer_clean:
                    correct_tags.update(q.get("tags", []))
        
        # Update incorrect tags - remove the ones that are now correct
        remaining_incorrect_tags = [tag for tag in original_incorrect_tags if tag not in correct_tags]
        session[f'incorrect_tags_{base_topic}'] = remaining_incorrect_tags
        
        # Store the current incorrect tags for this remedial session
        session[f'current_remedial_incorrect_tags_{base_topic}'] = list(incorrect_tags)
    else:
        # For regular quizzes, store incorrect tags normally
        session[f'incorrect_tags_{topic}'] = list(incorrect_tags)

    # Create submission text for AI analysis
    submission = ""
    for item in incorrect:
        submission += f"Question {item['index'] + 1}: {item['question']}\n"
        submission += f"Student answered: {item['answer']}\n"
        submission += f"Correct answer: {item['correct']}\n"
        submission += f"Concept tags: {', '.join(item['tags'])}\n\n"

    # Check if this is a remedial quiz and if student has mastered all concepts
    if is_remedial:
        remaining_incorrect_tags = session.get(f'incorrect_tags_{base_topic}', [])
        if not remaining_incorrect_tags:
            # Student has mastered all concepts!
            prompt = (
                "Congratulations! The student has successfully mastered all the Python loop concepts they were struggling with.\n\n"
                "You must respond using the following custom formatting tags:\n"
                "[section]Section Title[/section] — for section headers\n"
                "[highlight]Important idea[/highlight] — to emphasize key points\n\n"
                "Create a celebratory message that includes:\n"
                "1. [section]Congratulations![/section]\n"
                "- Celebrate their improvement and mastery\n"
                "- Mention that they've overcome their challenging concepts\n\n"
                "2. [section]Next Steps[/section]\n"
                "- Suggest they try a new topic or take the full quiz again\n"
                "- Encourage continued learning\n\n"
                "Keep the tone positive and encouraging!"
            )
        else:
            # Still have concepts to work on
            current_incorrect = session.get(f'current_remedial_incorrect_tags_{base_topic}', [])
            prompt = (
                f"You are a Python instructor analyzing a student's performance on a remedial quiz.\n"
                f"The student is working on mastering these concepts: {', '.join(remaining_incorrect_tags)}\n"
                f"In this remedial session, they got these tags wrong: {', '.join(current_incorrect)}\n\n"
                "You must respond using the following custom formatting tags:\n"
                "[section]Section Title[/section] — for section headers\n"
                "[highlight]Important idea[/highlight] — to emphasize key points\n\n"
                "In your response, include:\n"
                "1. [section]Progress Update[/section]\n"
                "- Acknowledge any improvement since the original quiz\n"
                "- Mention which concepts still need work\n\n"
                "2. [section]Focus Areas[/section]\n"
                "- Identify the specific concepts that need more practice\n"
                "- Give targeted advice for improvement\n\n"
                "Be encouraging and supportive. Remind them that learning takes practice.\n\n"
                f"Here is the current quiz submission:\n{submission}"
            )
    else:
        # Original quiz analysis prompt
        prompt = (
            "You are a Python instructor analyzing a student's performance on a quiz.\n"
            "You will receive a list of quiz questions and the student's selected answers.\n\n"
            "You must respond using the following custom formatting tags:\n"
            "[section]Section Title[/section] — for section headers\n"
            "[highlight]Important idea[/highlight] — to emphasize key points\n\n"
            "Use line breaks and spacing between items to improve readability.\n\n"
            "In your response, include:\n"
            "1. [section]Weak Python Concepts[/section]\n"
            "- List the incorrect questions by number.\n"
            "- Explain what concept was misunderstood.\n"
            "- Include a short reason why this error likely occurred.\n\n"
            "2. [section]Study Suggestions[/section]\n"
            "- Offer 2–4 clear suggestions, each on a new line, to help the student learn.\n\n"
            "Use plain, student-friendly language.\n"
            "Only refer to questions the student answered incorrectly.\n\n"
            f"Here is the student's quiz submission:\n{submission}"
        )

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800
        )
        feedback = response.choices[0].message.content.strip()
        
        # Determine if student needs another remedial quiz or has completed remedial learning
        needs_more_remedial = False
        if is_remedial:
            remaining_incorrect_tags = session.get(f'incorrect_tags_{base_topic}', [])
            needs_more_remedial = len(remaining_incorrect_tags) > 0
        
        return jsonify({ 
            "feedback": feedback, 
            "incorrect": incorrect,
            "incorrect_tags": list(incorrect_tags),
            "is_remedial": is_remedial,
            "needs_more_remedial": needs_more_remedial,
            "remaining_tags": session.get(f'incorrect_tags_{base_topic}', []) if is_remedial else list(incorrect_tags),
            "total_questions": total_questions,
            "correct_count": correct_count,
            "score_percentage": round((correct_count / total_questions) * 100, 1) if total_questions > 0 else 0
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({ "feedback": f"Error during OpenAI call: {e}" }), 500

def evaluate_code_answer(question, user_code):
    """Use AI to evaluate code writing answers"""
    prompt = f"""
    You are evaluating a student's Python code answer. 
    
    Question: {question}
    
    Student's Code:
    {user_code}
    
    Please evaluate if this code correctly solves the problem. Consider:
    1. Does it solve the intended problem?
    2. Is the syntax correct?
    3. Will it run without errors?
    4. Does it follow good Python practices?
    
    Respond with a JSON object containing:
    - "is_correct": true/false
    - "feedback": detailed explanation of what's right/wrong and how to improve
    
    Be encouraging but honest in your feedback.
    """
    
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful Python instructor. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500
        )
        
        result = json.loads(response.choices[0].message.content.strip())
        return result
    except Exception as e:
        return {
            "is_correct": False,
            "feedback": f"Error evaluating code: {str(e)}"
        }

def get_ai_review_for_mc(question, user_answer, correct_answer):
    """Get AI review for multiple choice questions"""
    prompt = f"""
    A student answered a multiple choice question incorrectly. Provide a brief, helpful explanation.
    
    Question: {question}
    Student's Answer: {user_answer}
    Correct Answer: {correct_answer}
    
    Explain in 1-2 sentences why the correct answer is right and what the student might have misunderstood. Be encouraging and educational.
    """
    
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful Python instructor."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"The correct answer is {correct_answer}. Please review the concept and try again."

@app.route("/remedial-quiz/<topic>")
def show_remedial_quiz(topic):
    """Generate a remedial quiz based on incorrectly answered concepts"""
    incorrect_tags = session.get(f'incorrect_tags_{topic}', [])
    
    if not incorrect_tags:
        return "No remedial quiz needed or session expired.", 404
    
    # Pass the remedial quiz to be generated client-side
    return render_template("quiz.html", 
                         topic=f"{topic}-remedial",
                         current_topic=topic,
                         incorrect_tags=incorrect_tags)

@app.route("/results")
def show_results():
    # Get context for navigation
    topic = session.get('quizTopic', '')
    # Handle remedial topic format
    base_topic = topic.replace("-remedial", "")
    incorrect_tags = session.get(f'incorrect_tags_{base_topic}', [])
    
    return render_template("results.html",
                         currentTopic=base_topic,
                         incorrectTags=incorrect_tags)

if __name__ == '__main__':
    app.run(debug=True)