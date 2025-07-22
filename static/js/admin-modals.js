let currentDeleteIndex = null;

// Initialize modal event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupModalEventListeners();
});

function setupModalEventListeners() {
    // Delete Modal
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteQuestion);
    
    // Add Question Modal
    document.getElementById('closeAddModal').addEventListener('click', closeAddQuestionModal);
    document.getElementById('cancelAddQuestion').addEventListener('click', closeAddQuestionModal);
    document.getElementById('confirmAddQuestion').addEventListener('click', confirmAddQuestion);
    
    // Question type change handler
    document.querySelectorAll('input[name="questionType"]').forEach(radio => {
        radio.addEventListener('change', handleQuestionTypeChange);
    });
    
    // Tag selection handlers
    document.getElementById('toggleNewTag').addEventListener('click', toggleNewTagInput);
    document.getElementById('questionTag').addEventListener('change', handleTagChange);
    
    // Add option button
    document.getElementById('addOptionBtn').addEventListener('click', addNewOption);
    
    // Save Modal
    document.getElementById('cancelSave').addEventListener('click', closeSaveModal);
    document.getElementById('confirmSave').addEventListener('click', confirmSaveQuiz);
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });
    
    // Close modals on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Delete Modal Functions
function openDeleteModal(questionIndex) {
    currentDeleteIndex = questionIndex;
    const question = AdminState.currentQuestions[questionIndex];
    
    // Show question preview
    const preview = document.getElementById('deleteQuestionPreview');
    preview.innerHTML = `
        <strong>Question:</strong> ${question.question || 'No question text'}<br>
        <strong>Type:</strong> ${question.type === 'multiple_choice' ? 'Multiple Choice' : 'Code Writing'}<br>
        <strong>Tags:</strong> ${Array.isArray(question.tags) ? question.tags.join(', ') : 'None'}
    `;
    
    showModal('deleteModal');
}

function closeDeleteModal() {
    currentDeleteIndex = null;
    hideModal('deleteModal');
}

function confirmDeleteQuestion() {
    if (currentDeleteIndex !== null) {
        deleteQuestion(currentDeleteIndex);
        showToast('Question marked for deletion.', 'success');
        closeDeleteModal();
    }
}

// Add Question Modal Functions
function openAddQuestionModal() {
    resetAddQuestionForm();
    populateTagOptions();
    showModal('addQuestionModal');
}

function closeAddQuestionModal() {
    hideModal('addQuestionModal');
}

function resetAddQuestionForm() {
    // Reset form fields
    document.getElementById('questionText').value = '';
    document.getElementById('questionDifficulty').value = 'beginner';
    document.getElementById('questionVideo').value = '';
    document.getElementById('newTagInput').style.display = 'none';
    document.getElementById('newTagInput').value = '';
    document.getElementById('questionTag').style.display = 'block';
    document.getElementById('toggleNewTag').textContent = 'New Tag';
    
    // Reset question type to multiple choice
    document.querySelector('input[name="questionType"][value="multiple_choice"]').checked = true;
    
    // Reset options
    resetOptionsContainer();
    
    // Show/hide appropriate sections
    handleQuestionTypeChange();
}

function populateTagOptions() {
    const tagSelect = document.getElementById('questionTag');
    const currentTags = AdminState.currentQuiz?.data?.tags || {};
    
    tagSelect.innerHTML = '<option value="">Select a tag</option>';
    
    Object.keys(currentTags).forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = `${tag} - ${currentTags[tag]}`;
        tagSelect.appendChild(option);
    });
}

function handleQuestionTypeChange() {
    const isMultipleChoice = document.querySelector('input[name="questionType"]:checked').value === 'multiple_choice';
    const multipleChoiceSection = document.getElementById('multipleChoiceSection');
    
    if (isMultipleChoice) {
        multipleChoiceSection.style.display = 'block';
        ensureMinimumOptions();
    } else {
        multipleChoiceSection.style.display = 'none';
    }
}

function toggleNewTagInput() {
    const tagSelect = document.getElementById('questionTag');
    const newTagInput = document.getElementById('newTagInput');
    const toggleBtn = document.getElementById('toggleNewTag');
    
    if (newTagInput.style.display === 'none') {
        tagSelect.style.display = 'none';
        newTagInput.style.display = 'block';
        newTagInput.focus();
        toggleBtn.textContent = 'Select Existing';
    } else {
        tagSelect.style.display = 'block';
        newTagInput.style.display = 'none';
        toggleBtn.textContent = 'New Tag';
    }
}

function handleTagChange() {
    // Could add validation or other logic here
}

// Options Management
function resetOptionsContainer() {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    // Add default two options
    addNewOption();
    addNewOption();
    
    // Set first option as correct by default
    const firstRadio = container.querySelector('input[type="radio"]');
    if (firstRadio) {
        firstRadio.checked = true;
    }
}

function addNewOption() {
    const container = document.getElementById('optionsContainer');
    const optionIndex = container.children.length;
    
    const optionGroup = document.createElement('div');
    optionGroup.className = 'option-input-group';
    optionGroup.innerHTML = `
        <input type="text" placeholder="Enter option text..." required>
        <input type="radio" name="correctOption" value="${optionIndex}" ${optionIndex === 0 ? 'checked' : ''}>
        <span class="correct-label">Correct</span>
        ${optionIndex >= 2 ? '<button type="button" class="remove-option-btn" onclick="removeOption(this)">×</button>' : ''}
    `;
    
    container.appendChild(optionGroup);
}

function removeOption(button) {
    const container = document.getElementById('optionsContainer');
    const optionGroup = button.closest('.option-input-group');
    const wasCorrect = optionGroup.querySelector('input[type="radio"]').checked;
    
    optionGroup.remove();
    
    // Reindex radio button values
    container.querySelectorAll('.option-input-group').forEach((group, index) => {
        const radio = group.querySelector('input[type="radio"]');
        radio.value = index;
        
        // If we removed the correct answer, make the first option correct
        if (wasCorrect && index === 0) {
            radio.checked = true;
        }
    });
    
    ensureMinimumOptions();
}

function ensureMinimumOptions() {
    const container = document.getElementById('optionsContainer');
    while (container.children.length < 2) {
        addNewOption();
    }
}

function confirmAddQuestion() {
    const questionData = collectQuestionData();
    
    if (validateQuestionData(questionData)) {
        addQuestion(questionData);
        showToast('Question added successfully!', 'success');
        closeAddQuestionModal();
    }
}

function collectQuestionData() {
    const questionType = document.querySelector('input[name="questionType"]:checked').value;
    const questionText = document.getElementById('questionText').value.trim();
    const difficulty = document.getElementById('questionDifficulty').value;
    const video = document.getElementById('questionVideo').value.trim();
    
    // Get tag
    let tag;
    const newTagInput = document.getElementById('newTagInput');
    if (newTagInput.style.display !== 'none' && newTagInput.value.trim()) {
        tag = newTagInput.value.trim().toLowerCase().replace(/\s+/g, '_');
    } else {
        tag = document.getElementById('questionTag').value;
    }
    
    const questionData = {
        question: questionText,
        type: questionType,
        tags: tag ? [tag] : [],
        difficulty: difficulty
    };
    
    if (video) {
        questionData.video = video;
    }
    
    if (questionType === 'multiple_choice') {
        const options = [];
        let correctAnswer = '';
        
        document.querySelectorAll('#optionsContainer .option-input-group').forEach((group, index) => {
            const optionText = group.querySelector('input[type="text"]').value.trim();
            const isCorrect = group.querySelector('input[type="radio"]').checked;
            
            if (optionText) {
                options.push(optionText);
                if (isCorrect) {
                    correctAnswer = optionText;
                }
            }
        });
        
        questionData.options = options;
        questionData.answer = correctAnswer;
    }
    
    return questionData;
}

function validateQuestionData(questionData) {
    if (!questionData.question) {
        showToast('Please enter a question.', 'error');
        return false;
    }
    
    if (!questionData.tags || questionData.tags.length === 0) {
        showToast('Please select or create a tag.', 'error');
        return false;
    }
    
    if (questionData.type === 'multiple_choice') {
        if (!questionData.options || questionData.options.length < 2) {
            showToast('Please provide at least 2 options for multiple choice questions.', 'error');
            return false;
        }
        
        if (!questionData.answer) {
            showToast('Please select the correct answer.', 'error');
            return false;
        }
    }
    
    return true;
}

// Save Modal Functions
function openSaveModal() {
    generateChangesSummary();
    showModal('saveModal');
}

function closeSaveModal() {
    hideModal('saveModal');
}

function generateChangesSummary() {
    const summary = document.getElementById('changesSummary');
    const changes = [];
    
    if (AdminState.pendingChanges.added.length > 0) {
        changes.push(`<li class="change-added">Added ${AdminState.pendingChanges.added.length} question(s)</li>`);
    }
    
    if (AdminState.pendingChanges.deleted.length > 0) {
        changes.push(`<li class="change-deleted">Deleted ${AdminState.pendingChanges.deleted.length} question(s)</li>`);
    }
    
    summary.innerHTML = `
        <h4>Changes to be saved:</h4>
        <ul>${changes.join('')}</ul>
    `;
}

async function confirmSaveQuiz() {
    const success = await saveQuiz();
    if (success) {
        closeSaveModal();
    }
}

// Modal Utility Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    
    // Focus first input if available
    const firstInput = modal.querySelector('input, textarea, select');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('show');
    });
    currentDeleteIndex = null;
}

// Global functions for onclick handlers
window.openAddQuestionModal = openAddQuestionModal;
window.openDeleteModal = openDeleteModal;
window.openSaveModal = openSaveModal;
window.removeOption = removeOption;