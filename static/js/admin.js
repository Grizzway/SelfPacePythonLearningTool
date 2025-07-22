const AdminState = {
    availableQuizzes: [],
    currentQuiz: null,
    originalQuestions: [],
    currentQuestions: [],
    pendingChanges: {
        added: [],
        deleted: []
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
    setupEventListeners();
});

async function initializeAdminPanel() {
    console.log('Initializing admin panel...');
    
    try {
        await loadAvailableQuizzes();
        renderQuizSelection();
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        showToast('Error loading quizzes. Please try again.', 'error');
    }
}

async function loadAvailableQuizzes() {
    console.log('Loading available quizzes...');
    
    try {
        const response = await fetch('/api/quiz/topics');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz topics: ${response.status}`);
        }
        
        const data = await response.json();
        AdminState.availableQuizzes = data.topics || [];
        
        console.log('Loaded quizzes:', AdminState.availableQuizzes);
        
        // Load basic info for each quiz
        for (const topic of AdminState.availableQuizzes) {
            try {
                const quizResponse = await fetch(`/quizzes/${topic}Quiz.json`);
                if (quizResponse.ok) {
                    const quizData = await quizResponse.json();
                    AdminState.availableQuizzes[AdminState.availableQuizzes.indexOf(topic)] = {
                        id: topic,
                        name: capitalizeFirst(topic),
                        questionCount: (quizData.questions || []).length,
                        tagCount: Object.keys(quizData.tags || {}).length
                    };
                }
            } catch (error) {
                console.warn(`Error loading info for ${topic}:`, error);
                AdminState.availableQuizzes[AdminState.availableQuizzes.indexOf(topic)] = {
                    id: topic,
                    name: capitalizeFirst(topic),
                    questionCount: 0,
                    tagCount: 0
                };
            }
        }
        
    } catch (error) {
        console.error('Error loading available quizzes:', error);
        throw error;
    }
}

function renderQuizSelection() {
    const quizList = document.getElementById('quizList');
    
    if (AdminState.availableQuizzes.length === 0) {
        quizList.innerHTML = `
            <div class="no-quizzes">
                <p>No quiz files found in the quizzes directory.</p>
                <p>Make sure you have JSON quiz files in the correct format.</p>
            </div>
        `;
        return;
    }
    
    quizList.innerHTML = AdminState.availableQuizzes.map(quiz => {
        const quizObj = typeof quiz === 'string' ? { id: quiz, name: capitalizeFirst(quiz), questionCount: 0, tagCount: 0 } : quiz;
        
        return `
            <div class="quiz-option" data-quiz-id="${quizObj.id}">
                <h3>${quizObj.name} Quiz</h3>
                <div class="quiz-stats">
                    <span>${quizObj.questionCount} questions</span>
                    <span>•</span>
                    <span>${quizObj.tagCount} tags</span>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', function() {
            const quizId = this.dataset.quizId;
            selectQuiz(quizId);
        });
    });
}

async function selectQuiz(quizId) {
    console.log('Selecting quiz:', quizId);
    
    try {
        document.getElementById('quizSelection').style.display = 'none';
        document.getElementById('quizEditor').style.display = 'block';
        document.getElementById('currentQuizTitle').textContent = `Loading ${capitalizeFirst(quizId)} Quiz...`;
        
        // Load quiz data
        const response = await fetch(`/quizzes/${quizId}Quiz.json`);
        
        if (!response.ok) {
            throw new Error(`Failed to load quiz: ${response.status}`);
        }
        
        const quizData = await response.json();
        
        // Set current quiz state
        AdminState.currentQuiz = {
            id: quizId,
            name: capitalizeFirst(quizId),
            data: quizData
        };
        
        AdminState.originalQuestions = [...(quizData.questions || [])];
        AdminState.currentQuestions = [...(quizData.questions || [])];
        AdminState.pendingChanges = { added: [], deleted: [] };
        
        // Update UI
        document.getElementById('currentQuizTitle').textContent = `Editing ${AdminState.currentQuiz.name} Quiz`;
        renderQuestionsList();
        updateChangesIndicator();
        
        console.log('Quiz loaded successfully:', AdminState.currentQuiz);
        
    } catch (error) {
        console.error('Error selecting quiz:', error);
        showToast('Error loading quiz data. Please try again.', 'error');
        
        // Return to quiz selection
        document.getElementById('quizEditor').style.display = 'none';
        document.getElementById('quizSelection').style.display = 'block';
    }
}

function setupEventListeners() {
    // Back to selection button
    document.getElementById('backToSelection').addEventListener('click', function() {
        if (hasUnsavedChanges()) {
            if (confirm('You have unsaved changes. Are you sure you want to go back?')) {
                returnToQuizSelection();
            }
        } else {
            returnToQuizSelection();
        }
    });
    
    // Add question button
    document.getElementById('addQuestionBtn').addEventListener('click', function() {
        openAddQuestionModal();
    });
    
    // Revert changes button
    document.getElementById('revertChangesBtn').addEventListener('click', function() {
        if (hasUnsavedChanges()) {
            if (confirm('Are you sure you want to revert all changes?')) {
                revertChanges();
            }
        }
    });
    
    // Save quiz button
    document.getElementById('saveQuizBtn').addEventListener('click', function() {
        if (hasUnsavedChanges()) {
            openSaveModal();
        } else {
            showToast('No changes to save.', 'info');
        }
    });
}

function returnToQuizSelection() {
    // Reset state
    AdminState.currentQuiz = null;
    AdminState.originalQuestions = [];
    AdminState.currentQuestions = [];
    AdminState.pendingChanges = { added: [], deleted: [] };
    
    // Show quiz selection
    document.getElementById('quizEditor').style.display = 'none';
    document.getElementById('quizSelection').style.display = 'block';
}

function renderQuestionsList() {
    const questionsList = document.getElementById('questionsList');
    
    if (AdminState.currentQuestions.length === 0) {
        questionsList.innerHTML = `
            <div class="no-questions">
                <p>No questions found in this quiz.</p>
                <p>Click "Add Question" to create your first question.</p>
            </div>
        `;
        return;
    }
    
    questionsList.innerHTML = AdminState.currentQuestions.map((question, index) => {
        const isDeleted = AdminState.pendingChanges.deleted.includes(index);
        const isNew = AdminState.pendingChanges.added.some(q => q.tempId === question.tempId);
        
        return createQuestionItemHTML(question, index, isDeleted, isNew);
    }).join('');
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-question-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const questionIndex = parseInt(this.dataset.questionIndex);
            openEditModal(questionIndex);
        });
    });
    
    document.querySelectorAll('.delete-question-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const questionIndex = parseInt(this.dataset.questionIndex);
            openDeleteModal(questionIndex);
        });
    });
}

function createQuestionItemHTML(question, index, isDeleted, isNew) {
    const typeClass = question.type === 'multiple_choice' ? 'multiple-choice' : 'code-writing';
    const typeName = question.type === 'multiple_choice' ? 'Multiple Choice' : 'Code Writing';
    const tags = Array.isArray(question.tags) ? question.tags : [];
    
    let statusIndicator = '';
    if (isNew) {
        statusIndicator = '<span class="status-indicator new">NEW</span>';
    }
    
    return `
        <div class="question-item ${isDeleted ? 'pending-delete' : ''}" data-question-index="${index}">
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-type-badge ${typeClass}">${typeName}</span>
                    ${tags.map(tag => `<span class="question-tag">${tag}</span>`).join('')}
                    ${statusIndicator}
                </div>
                <div class="question-actions">
                    <button class="edit-question-btn" data-question-index="${index}" title="Edit Question">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                            <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/>
                        </svg>
                    </button>
                    <button class="delete-question-btn" data-question-index="${index}" title="Delete Question">
                        ×
                    </button>
                </div>
            </div>
            
            <div class="question-text">
                ${formatQuestionText(question.question || 'No question text')}
            </div>
            
            ${question.type === 'multiple_choice' ? createOptionsHTML(question) : ''}
            
            ${isDeleted ? '<div class="delete-notice">This question will be deleted when you save.</div>' : ''}
        </div>
    `;
}

function createOptionsHTML(question) {
    if (!question.options || !Array.isArray(question.options)) {
        return '<div class="question-options"><em>No options defined</em></div>';
    }
    
    return `
        <div class="question-options">
            ${question.options.map(option => `
                <div class="option-item ${option === question.answer ? 'correct' : ''}">
                    ${option === question.answer ? '<span class="correct-indicator">✓</span>' : ''}
                    ${option}
                </div>
            `).join('')}
        </div>
    `;
}

function formatQuestionText(text) {
    if (!text) return '';
    
    return text
        .replace(/\[code\]/g, '<pre>')
        .replace(/\[\/code\]/g, '</pre>')
        .replace(/\[\\n\]/g, '<br>')
        .replace(/\[indent\]/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

function hasUnsavedChanges() {
    return AdminState.pendingChanges.added.length > 0 || AdminState.pendingChanges.deleted.length > 0;
}

function updateChangesIndicator() {
    const indicator = document.getElementById('changesIndicator');
    const totalChanges = AdminState.pendingChanges.added.length + AdminState.pendingChanges.deleted.length;
    
    indicator.querySelector('.changes-count').textContent = `${totalChanges} unsaved change${totalChanges !== 1 ? 's' : ''}`;
    
    if (totalChanges > 0) {
        indicator.classList.add('has-changes');
    } else {
        indicator.classList.remove('has-changes');
    }
}

function revertChanges() {
    AdminState.currentQuestions = [...AdminState.originalQuestions];
    AdminState.pendingChanges = { added: [], deleted: [] };
    
    renderQuestionsList();
    updateChangesIndicator();
    showToast('Changes reverted successfully.', 'success');
}

function deleteQuestion(questionIndex) {
    if (!AdminState.pendingChanges.deleted.includes(questionIndex)) {
        AdminState.pendingChanges.deleted.push(questionIndex);
    }
    
    renderQuestionsList();
    updateChangesIndicator();
}

function addQuestion(questionData) {
    // Add a temporary ID for tracking new questions
    questionData.tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    AdminState.currentQuestions.push(questionData);
    AdminState.pendingChanges.added.push(questionData);
    
    renderQuestionsList();
    updateChangesIndicator();
}

async function saveQuiz() {
    try {
        // Create the updated quiz data
        const filteredQuestions = AdminState.currentQuestions.filter((_, index) => 
            !AdminState.pendingChanges.deleted.includes(index)
        );
        
        // Remove temporary IDs
        const cleanedQuestions = filteredQuestions.map(q => {
            const { tempId, ...cleanQuestion } = q;
            return cleanQuestion;
        });
        
        const updatedQuizData = {
            ...AdminState.currentQuiz.data,
            questions: cleanedQuestions
        };
        
        // Send to server
        const response = await fetch(`/api/admin/save-quiz/${AdminState.currentQuiz.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedQuizData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save quiz: ${response.status}`);
        }
        
        // Update local state
        AdminState.originalQuestions = [...cleanedQuestions];
        AdminState.currentQuestions = [...cleanedQuestions];
        AdminState.pendingChanges = { added: [], deleted: [] };
        
        renderQuestionsList();
        updateChangesIndicator();
        showToast('Quiz saved successfully!', 'success');
        
        return true;
        
    } catch (error) {
        console.error('Error saving quiz:', error);
        showToast('Error saving quiz. Please try again.', 'error');
        return false;
    }
}

// Utility functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
    
    // Close button
    document.getElementById('toastClose').onclick = () => {
        toast.classList.remove('show');
    };
}

// Export functions for use in other modules
window.AdminState = AdminState;
window.deleteQuestion = deleteQuestion;
window.addQuestion = addQuestion;
window.saveQuiz = saveQuiz;
window.showToast = showToast;