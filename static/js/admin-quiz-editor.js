document.addEventListener('DOMContentLoaded', function() {
    // Add any quiz editor specific initialization here
    console.log('Quiz editor module loaded');
});

// Question rendering and management functions specific to the editor

function renderQuestionForEditing(question, index) {
    // Enhanced rendering for editing mode
    const element = document.createElement('div');
    element.className = 'question-edit-item';
    element.innerHTML = createEditableQuestionHTML(question, index);
    return element;
}

function createEditableQuestionHTML(question, index) {
    const typeClass = question.type === 'multiple_choice' ? 'multiple-choice' : 'code-writing';
    const typeName = question.type === 'multiple_choice' ? 'Multiple Choice' : 'Code Writing';
    const tags = Array.isArray(question.tags) ? question.tags : [];
    
    return `
        <div class="question-edit-header">
            <div class="question-number">Question ${index + 1}</div>
            <div class="question-actions">
                <button class="btn btn-sm btn-secondary edit-question-btn" data-question-index="${index}">
                    Edit
                </button>
                <button class="btn btn-sm btn-danger delete-question-btn" data-question-index="${index}">
                    Delete
                </button>
            </div>
        </div>
        
        <div class="question-preview">
            <div class="question-meta">
                <span class="question-type-badge ${typeClass}">${typeName}</span>
                ${tags.map(tag => `<span class="question-tag">${tag}</span>`).join('')}
            </div>
            
            <div class="question-text">
                ${formatQuestionText(question.question || 'No question text')}
            </div>
            
            ${question.type === 'multiple_choice' ? createOptionsPreview(question) : ''}
        </div>
    `;
}

function createOptionsPreview(question) {
    if (!question.options || !Array.isArray(question.options)) {
        return '<div class="options-preview"><em>No options defined</em></div>';
    }
    
    return `
        <div class="options-preview">
            <strong>Options:</strong>
            <ol>
                ${question.options.map(option => `
                    <li class="${option === question.answer ? 'correct-option' : ''}">
                        ${option}
                        ${option === question.answer ? ' <span class="correct-indicator">(Correct)</span>' : ''}
                    </li>
                `).join('')}
            </ol>
        </div>
    `;
}

// Enhanced question validation
function validateQuestionStructure(question) {
    const errors = [];
    
    if (!question.question || typeof question.question !== 'string') {
        errors.push('Question text is required');
    }
    
    if (!question.type || !['multiple_choice', 'code_writing'].includes(question.type)) {
        errors.push('Valid question type is required');
    }
    
    if (!question.tags || !Array.isArray(question.tags) || question.tags.length === 0) {
        errors.push('At least one tag is required');
    }
    
    if (question.type === 'multiple_choice') {
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            errors.push('Multiple choice questions must have at least 2 options');
        }
        
        if (!question.answer || !question.options?.includes(question.answer)) {
            errors.push('Multiple choice questions must have a valid correct answer');
        }
        
        // Check for duplicate options
        const uniqueOptions = new Set(question.options);
        if (uniqueOptions.size !== question.options.length) {
            errors.push('Multiple choice options must be unique');
        }
    }
    
    return errors;
}

// Bulk operations
function deleteMultipleQuestions(indices) {
    // Sort indices in descending order to avoid index shifting issues
    const sortedIndices = [...indices].sort((a, b) => b - a);
    
    sortedIndices.forEach(index => {
        if (!AdminState.pendingChanges.deleted.includes(index)) {
            AdminState.pendingChanges.deleted.push(index);
        }
    });
    
    renderQuestionsList();
    updateChangesIndicator();
    
    showToast(`${indices.length} question(s) marked for deletion.`, 'success');
}

function duplicateQuestion(questionIndex) {
    const question = AdminState.currentQuestions[questionIndex];
    if (!question) return;
    
    // Create a copy of the question
    const duplicatedQuestion = JSON.parse(JSON.stringify(question));
    duplicatedQuestion.question = `${duplicatedQuestion.question} (Copy)`;
    
    // Add the duplicated question
    addQuestion(duplicatedQuestion);
    showToast('Question duplicated successfully!', 'success');
}

// Import/Export functionality
function exportQuizData() {
    const quizData = {
        ...AdminState.currentQuiz.data,
        questions: AdminState.currentQuestions.filter((_, index) => 
            !AdminState.pendingChanges.deleted.includes(index)
        )
    };
    
    const dataStr = JSON.stringify(quizData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${AdminState.currentQuiz.id}Quiz.json`;
    link.click();
    
    showToast('Quiz exported successfully!', 'success');
}

function importQuizData(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate imported data structure
            if (!importedData.questions || !Array.isArray(importedData.questions)) {
                throw new Error('Invalid quiz file format');
            }
            
            // Validate each question
            const validationErrors = [];
            importedData.questions.forEach((question, index) => {
                const errors = validateQuestionStructure(question);
                if (errors.length > 0) {
                    validationErrors.push(`Question ${index + 1}: ${errors.join(', ')}`);
                }
            });
            
            if (validationErrors.length > 0) {
                throw new Error(`Validation errors:\n${validationErrors.join('\n')}`);
            }
            
            // If validation passes, import the data
            AdminState.currentQuiz.data = importedData;
            AdminState.currentQuestions = [...importedData.questions];
            AdminState.pendingChanges = { added: [], deleted: [] };
            
            renderQuestionsList();
            updateChangesIndicator();
            showToast('Quiz imported successfully!', 'success');
            
        } catch (error) {
            console.error('Error importing quiz:', error);
            showToast(`Error importing quiz: ${error.message}`, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Search and filter functionality
function filterQuestions(searchTerm, filterType, filterTag) {
    let filtered = AdminState.currentQuestions;
    
    if (searchTerm) {
        filtered = filtered.filter(question => 
            question.question.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    if (filterType && filterType !== 'all') {
        filtered = filtered.filter(question => question.type === filterType);
    }
    
    if (filterTag && filterTag !== 'all') {
        filtered = filtered.filter(question => 
            question.tags && question.tags.includes(filterTag)
        );
    }
    
    return filtered;
}

// Statistics and analytics
function getQuizStatistics() {
    const questions = AdminState.currentQuestions.filter((_, index) => 
        !AdminState.pendingChanges.deleted.includes(index)
    );
    
    const stats = {
        totalQuestions: questions.length,
        multipleChoice: questions.filter(q => q.type === 'multiple_choice').length,
        codeWriting: questions.filter(q => q.type === 'code_writing').length,
        tagDistribution: {},
        difficultyDistribution: {}
    };
    
    // Calculate tag distribution
    questions.forEach(question => {
        if (question.tags && Array.isArray(question.tags)) {
            question.tags.forEach(tag => {
                stats.tagDistribution[tag] = (stats.tagDistribution[tag] || 0) + 1;
            });
        }
    });
    
    // Calculate difficulty distribution
    questions.forEach(question => {
        const difficulty = question.difficulty || 'beginner';
        stats.difficultyDistribution[difficulty] = (stats.difficultyDistribution[difficulty] || 0) + 1;
    });
    
    return stats;
}

function displayQuizStatistics() {
    const stats = getQuizStatistics();
    
    const statsModal = document.createElement('div');
    statsModal.className = 'modal-overlay';
    statsModal.innerHTML = `
        <div class="modal stats-modal">
            <div class="modal-header">
                <h3>Quiz Statistics</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="stats-grid">
                    <div class="stat-item">
                        <h4>Total Questions</h4>
                        <span class="stat-value">${stats.totalQuestions}</span>
                    </div>
                    <div class="stat-item">
                        <h4>Multiple Choice</h4>
                        <span class="stat-value">${stats.multipleChoice}</span>
                    </div>
                    <div class="stat-item">
                        <h4>Code Writing</h4>
                        <span class="stat-value">${stats.codeWriting}</span>
                    </div>
                </div>
                
                <div class="distribution-section">
                    <h4>Tag Distribution</h4>
                    <div class="distribution-list">
                        ${Object.entries(stats.tagDistribution).map(([tag, count]) => 
                            `<div class="distribution-item">
                                <span class="tag-name">${tag}</span>
                                <span class="tag-count">${count} question(s)</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="distribution-section">
                    <h4>Difficulty Distribution</h4>
                    <div class="distribution-list">
                        ${Object.entries(stats.difficultyDistribution).map(([difficulty, count]) => 
                            `<div class="distribution-item">
                                <span class="difficulty-name">${difficulty}</span>
                                <span class="difficulty-count">${count} question(s)</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(statsModal);
    statsModal.classList.add('show');
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (hasUnsavedChanges()) {
                openSaveModal();
            }
        }
        
        // Ctrl/Cmd + N to add new question
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (AdminState.currentQuiz) {
                openAddQuestionModal();
            }
        }
        
        // Ctrl/Cmd + Z to revert changes
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (hasUnsavedChanges()) {
                if (confirm('Revert all changes?')) {
                    revertChanges();
                }
            }
        }
    });
}

// Auto-save functionality
let autoSaveTimer = null;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

function enableAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }
    
    autoSaveTimer = setInterval(() => {
        if (hasUnsavedChanges()) {
            saveQuizDraft();
        }
    }, AUTO_SAVE_INTERVAL);
}

function disableAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
}

async function saveQuizDraft() {
    try {
        const draftData = {
            currentQuestions: AdminState.currentQuestions,
            pendingChanges: AdminState.pendingChanges,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(`quiz_draft_${AdminState.currentQuiz.id}`, JSON.stringify(draftData));
        
        // Show subtle indication of auto-save
        const indicator = document.createElement('div');
        indicator.className = 'auto-save-indicator';
        indicator.textContent = 'Draft saved';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
        
    } catch (error) {
        console.warn('Error saving draft:', error);
    }
}

function loadQuizDraft() {
    try {
        const draftKey = `quiz_draft_${AdminState.currentQuiz.id}`;
        const draftData = localStorage.getItem(draftKey);
        
        if (draftData) {
            const parsed = JSON.parse(draftData);
            
            if (confirm('A draft of this quiz was found. Would you like to restore it?')) {
                AdminState.currentQuestions = parsed.currentQuestions || AdminState.currentQuestions;
                AdminState.pendingChanges = parsed.pendingChanges || AdminState.pendingChanges;
                
                renderQuestionsList();
                updateChangesIndicator();
                showToast('Draft restored successfully!', 'success');
            }
            
            // Clean up the draft after loading or declining
            localStorage.removeItem(draftKey);
        }
    } catch (error) {
        console.warn('Error loading draft:', error);
    }
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    setupKeyboardShortcuts();
    
    // Show keyboard shortcuts help
    const helpButton = document.createElement('button');
    helpButton.className = 'btn btn-sm btn-secondary help-button';
    helpButton.innerHTML = '?';
    helpButton.title = 'Keyboard Shortcuts';
    helpButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        z-index: 1000;
    `;
    
    helpButton.onclick = showKeyboardShortcuts;
    document.body.appendChild(helpButton);
});

function showKeyboardShortcuts() {
    const helpModal = document.createElement('div');
    helpModal.className = 'modal-overlay';
    helpModal.innerHTML = `
        <div class="modal help-modal">
            <div class="modal-header">
                <h3>Keyboard Shortcuts</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="shortcuts-list">
                    <div class="shortcut-item">
                        <kbd>Ctrl/Cmd + S</kbd>
                        <span>Save quiz</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl/Cmd + N</kbd>
                        <span>Add new question</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl/Cmd + Z</kbd>
                        <span>Revert changes</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Escape</kbd>
                        <span>Close modals</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
    helpModal.classList.add('show');
}

// Export functions for global use
window.duplicateQuestion = duplicateQuestion;
window.exportQuizData = exportQuizData;
window.importQuizData = importQuizData;
window.displayQuizStatistics = displayQuizStatistics;
window.enableAutoSave = enableAutoSave;
window.disableAutoSave = disableAutoSave;
window.loadQuizDraft = loadQuizDraft;