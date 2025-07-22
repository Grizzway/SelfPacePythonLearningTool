let currentQuestions = [];

// Initialize quiz when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading initially
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    try {
        await initializeQuiz();
    } catch (error) {
        console.error('Error initializing quiz:', error);
        showErrorMessage('Error loading quiz. Please try again.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

async function initializeQuiz() {
    const form = document.getElementById('quiz-form');
    const topicInput = form.querySelector('input[name="topic"]');
    const topic = topicInput.value;
    
    console.log('Initializing quiz for topic:', topic);
    
    // Check if this is a remedial quiz
    const isRemedial = topic.includes('-remedial');
    const baseTopic = topic.replace('-remedial', '');
    
    try {
        // Import quiz helper functions dynamically with correct path
        console.log('Importing quiz modules...');
        
        // Use the correct path - quizHelper.js is in the same quizzes folder
        const { getRandomQuiz, getRemedialQuiz } = await import('/quizzes/quizHelper.js');
        console.log('Quiz modules imported successfully');
        
        if (isRemedial) {
            console.log('Loading remedial quiz...');
            // Get incorrect tags from the page data or make API call
            const response = await fetch(`/api/quiz/remedial/${baseTopic}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch remedial quiz data: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.use_client_generation && data.incorrect_tags) {
                currentQuestions = await getRemedialQuiz(data.incorrect_tags, baseTopic);
            } else {
                throw new Error('No remedial quiz data available');
            }
        } else {
            console.log('Generating regular quiz...');
            // Generate regular quiz
            currentQuestions = await getRandomQuiz(baseTopic, 10);
        }
        
        console.log('Generated questions:', currentQuestions.length);
        
        // Validate we have questions
        if (!currentQuestions || currentQuestions.length === 0) {
            throw new Error('No questions generated for topic: ' + baseTopic);
        }
        
        // Render questions
        console.log('Rendering questions...');
        renderQuestions(currentQuestions);
        console.log('Quiz initialization complete');
        
    } catch (error) {
        console.error('Error in initializeQuiz:', error);
        
        // More specific error handling
        if (error.message.includes('Failed to resolve module')) {
            throw new Error('Quiz module files could not be loaded. Please check file paths.');
        } else if (error.message.includes('import')) {
            throw new Error('Error importing quiz modules. Please check JavaScript console for details.');
        } else {
            throw error;
        }
    }
}

function renderQuestions(questions) {
    const form = document.getElementById('quiz-form');
    const existingQuestions = form.querySelectorAll('.question');
    
    // Remove existing questions except the hidden topic input
    existingQuestions.forEach(q => q.remove());
    
    // Find submit container
    const submitContainer = form.querySelector('.submit-container');
    
    // Render each question
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        
        let questionHTML = `
            <div class="question-number">Question ${index + 1}</div>
            <div class="question-text">
                <strong>${formatQuestionText(question.question)}</strong>
            </div>
        `;
        
        if (question.type === 'code_writing') {
            questionHTML += `
                <div class="code-question">
                    <textarea name="q${index}" 
                              placeholder="Write your Python code here..." 
                              required></textarea>
                    <div class="code-hint">Write complete, working Python code. Use proper indentation.</div>
                </div>
            `;
        } else {
            questionHTML += '<div class="options">';
            if (question.options && Array.isArray(question.options)) {
                question.options.forEach(option => {
                    questionHTML += `
                        <label>
                            <input type="radio"
                                   name="q${index}"
                                   value="${escapeHtml(option)}"
                                   required>
                            <span>${escapeHtml(option)}</span>
                        </label>
                    `;
                });
            }
            questionHTML += '</div>';
        }
        
        questionDiv.innerHTML = questionHTML;
        form.insertBefore(questionDiv, submitContainer);
    });
    
    console.log('Rendered', questions.length, 'questions');
}

function formatQuestionText(text) {
    if (!text) return '';
    
    return text
        .replace(/\[code\]/g, '<pre>')
        .replace(/\[\/code\]/g, '</pre>')
        .replace(/\[\\n\]/g, '<br>')
        .replace(/\[indent\]/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showErrorMessage(message) {
    const container = document.querySelector('.container');
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 20px;
        border-radius: 5px;
        margin: 20px 0;
        text-align: center;
    `;
    errorDiv.innerHTML = `
        <h3>Quiz Loading Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        ">Reload Page</button>
    `;
    
    // Clear existing content and show error
    container.innerHTML = '';
    container.appendChild(errorDiv);
}

// Quiz form submission
document.getElementById('quiz-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Check if we have questions
    if (!currentQuestions || currentQuestions.length === 0) {
        alert('No quiz questions available. Please reload the page.');
        return;
    }
    
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    const submitButton = document.getElementById('submitButton');
    
    loadingOverlay.style.display = 'flex';
    loadingOverlay.querySelector('.loading-text').textContent = 'Submitting your quiz...';
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    const formData = new FormData(e.target);
    const responses = {};
    let topic = null;

    for (const [name, value] of formData.entries()) {
        if (name === 'topic') {
            topic = value;
        } else {
            responses[name] = value;
        }
    }
    
    // Store in sessionStorage for compatibility with results page
    sessionStorage.setItem('quizTopic', topic);
    sessionStorage.setItem('quizAnswers', JSON.stringify(responses));

    try {
        // Submit to /analyze with topic and questions included
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                answers: responses, 
                topic: topic,
                questions: currentQuestions 
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        
        // Store the ACTUAL quiz results in sessionStorage
        sessionStorage.setItem('quizResults', JSON.stringify({
            feedback: result.feedback,
            score: result.score_percentage,
            correctCount: result.correct_count,
            totalQuestions: result.total_questions,
            incorrect: result.incorrect,
            incorrectTags: result.incorrect_tags,
            isRemedial: result.is_remedial,
            needsMoreRemedial: result.needs_more_remedial,
            remainingTags: result.remaining_tags
        }));
        
        window.location.href = "/results";
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('There was an error submitting your quiz. Please try again.');
        loadingOverlay.style.display = 'none';
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Quiz';
    }
});