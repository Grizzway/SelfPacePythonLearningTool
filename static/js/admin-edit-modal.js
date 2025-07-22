let currentEditIndex = null;
let currentEditQuestion = null;

// Initialize edit modal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupEditModalEventListeners();
});

function setupEditModalEventListeners() {
    // Edit modal close buttons
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditQuestion').addEventListener('click', closeEditModal);
    document.getElementById('confirmEditQuestion').addEventListener('click', confirmEditQuestion);
    
    // Add option button
    document.getElementById('editAddOptionBtn').addEventListener('click', () => addEditOption());
    
    // Add tag button
    document.getElementById('editAddTagBtn').addEventListener('click', addEditTag);
    
    // Allow Enter key to add tags
    document.getElementById('editTagInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEditTag();
        }
    });
    
    // Close modal when clicking outside
    document.getElementById('editQuestionModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
}

function openEditModal(questionIndex) {
    currentEditIndex = questionIndex;
    currentEditQuestion = { ...AdminState.currentQuestions[questionIndex] };
    
    console.log('Opening edit modal for question:', currentEditIndex, currentEditQuestion);
    
    // Populate the modal with current question data
    populateEditModal(currentEditQuestion);
    
    // Show the modal
    showModal('editQuestionModal');
}

function closeEditModal() {
    currentEditIndex = null;
    currentEditQuestion = null;
    hideModal('editQuestionModal');
}

function populateEditModal(question) {
    // Set question type indicator
    const typeIndicator = document.getElementById('editTypeIndicator');
    const isMultipleChoice = question.type === 'multiple_choice';
    typeIndicator.textContent = isMultipleChoice ? 'Multiple Choice Question' : 'Code Writing Question';
    typeIndicator.className = `edit-type-indicator ${question.type.replace('_', '-')}`;
    
    // Set question text
    document.getElementById('editQuestionText').value = question.question || '';
    
    // Show/hide options section based on question type
    const optionsSection = document.getElementById('editOptionsSection');
    if (isMultipleChoice) {
        optionsSection.style.display = 'block';
        populateEditOptions(question);
    } else {
        optionsSection.style.display = 'none';
    }
    
    // Populate tags
    populateEditTags(question.tags || []);
    
    // Populate metadata
    document.getElementById('editQuestionDifficulty').value = question.difficulty || 'beginner';
    document.getElementById('editQuestionVideo').value = question.video || '';
}

function populateEditOptions(question) {
    const container = document.getElementById('editOptionsContainer');
    container.innerHTML = '';
    
    if (!question.options || question.options.length === 0) {
        // Add default options if none exist
        addEditOption('', true);
        addEditOption('', false);
        return;
    }
    
    question.options.forEach((option, index) => {
        const isCorrect = option === question.answer;
        addEditOption(option, isCorrect);
    });
}

function addEditOption(text = '', isCorrect = false) {
    const container = document.getElementById('editOptionsContainer');
    const optionIndex = container.children.length;
    
    const optionGroup = document.createElement('div');
    optionGroup.className = `edit-option-group ${isCorrect ? 'correct-option' : ''}`;
    optionGroup.innerHTML = `
        <input type="text" class="edit-option-input" value="${escapeHtml(text)}" placeholder="Enter option text...">
        <input type="radio" name="editCorrectOption" value="${optionIndex}" class="edit-correct-radio" ${isCorrect ? 'checked' : ''}>
        <span class="edit-correct-label">Correct</span>
        ${optionIndex >= 2 ? '<button type="button" class="edit-remove-option" onclick="removeEditOption(this)">×</button>' : ''}
    `;
    
    container.appendChild(optionGroup);
    
    // Add event listeners
    const radio = optionGroup.querySelector('input[type="radio"]');
    radio.addEventListener('change', function() {
        updateEditCorrectOption(this);
    });
    
    // Focus on the text input if it's empty
    const textInput = optionGroup.querySelector('input[type="text"]');
    if (!text) {
        setTimeout(() => textInput.focus(), 100);
    }
}

function removeEditOption(button) {
    const container = document.getElementById('editOptionsContainer');
    const optionGroup = button.closest('.edit-option-group');
    const wasCorrect = optionGroup.querySelector('input[type="radio"]').checked;
    
    optionGroup.remove();
    
    // Reindex radio button values
    container.querySelectorAll('.edit-option-group').forEach((group, index) => {
        const radio = group.querySelector('input[type="radio"]');
        radio.value = index;
        
        // If we removed the correct answer, make the first option correct
        if (wasCorrect && index === 0) {
            radio.checked = true;
            updateEditCorrectOption(radio);
        }
    });
    
    ensureMinimumEditOptions();
}

function ensureMinimumEditOptions() {
    const container = document.getElementById('editOptionsContainer');
    while (container.children.length < 2) {
        addEditOption();
    }
}

function updateEditCorrectOption(radio) {
    const container = document.getElementById('editOptionsContainer');
    
    // Remove correct styling from all options
    container.querySelectorAll('.edit-option-group').forEach(group => {
        group.classList.remove('correct-option');
    });
    
    // Add correct styling to selected option
    if (radio.checked) {
        radio.closest('.edit-option-group').classList.add('correct-option');
    }
}

function populateEditTags(tags) {
    const container = document.getElementById('editTagsContainer');
    container.innerHTML = '';
    
    tags.forEach(tag => {
        addEditTagToContainer(tag);
    });
}

function addEditTagToContainer(tagText) {
    const container = document.getElementById('editTagsContainer');
    
    const tagItem = document.createElement('div');
    tagItem.className = 'edit-tag-item';
    tagItem.innerHTML = `
        <span>${escapeHtml(tagText)}</span>
        <button type="button" class="edit-tag-remove" onclick="removeEditTag(this)">×</button>
    `;
    
    container.appendChild(tagItem);
}

function addEditTag() {
    const input = document.getElementById('editTagInput');
    const tagText = input.value.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (!tagText) {
        showToast('Please enter a tag name.', 'error');
        return;
    }
    
    // Check if tag already exists
    const existingTags = Array.from(document.querySelectorAll('#editTagsContainer .edit-tag-item span'))
        .map(span => span.textContent);
    
    if (existingTags.includes(tagText)) {
        showToast('Tag already exists.', 'error');
        return;
    }
    
    addEditTagToContainer(tagText);
    input.value = '';
    input.focus();
}

function removeEditTag(button) {
    button.closest('.edit-tag-item').remove();
}

function collectEditQuestionData() {
    const questionText = document.getElementById('editQuestionText').value.trim();
    const difficulty = document.getElementById('editQuestionDifficulty').value;
    const video = document.getElementById('editQuestionVideo').value.trim();
    
    // Collect tags
    const tags = Array.from(document.querySelectorAll('#editTagsContainer .edit-tag-item span'))
        .map(span => span.textContent);
    
    const questionData = {
        question: questionText,
        type: currentEditQuestion.type,
        tags: tags,
        difficulty: difficulty
    };
    
    if (video) {
        questionData.video = video;
    }
    
    if (currentEditQuestion.type === 'multiple_choice') {
        const options = [];
        let correctAnswer = '';
        
        document.querySelectorAll('#editOptionsContainer .edit-option-group').forEach((group) => {
            const optionText = group.querySelector('.edit-option-input').value.trim();
            const isCorrect = group.querySelector('.edit-correct-radio').checked;
            
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

function validateEditQuestionData(questionData) {
    if (!questionData.question) {
        showToast('Please enter a question.', 'error');
        return false;
    }
    
    if (!questionData.tags || questionData.tags.length === 0) {
        showToast('Please add at least one tag.', 'error');
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
        
        // Check for duplicate options
        const uniqueOptions = new Set(questionData.options);
        if (uniqueOptions.size !== questionData.options.length) {
            showToast('All options must be unique.', 'error');
            return false;
        }
        
        // Check for empty options
        if (questionData.options.some(opt => !opt.trim())) {
            showToast('All options must have text.', 'error');
            return false;
        }
    }
    
    return true;
}

function confirmEditQuestion() {
    const questionData = collectEditQuestionData();
    
    if (validateEditQuestionData(questionData)) {
        // Update the question in AdminState
        AdminState.currentQuestions[currentEditIndex] = questionData;
        
        // Re-render the questions list
        renderQuestionsList();
        updateChangesIndicator();
        
        showToast('Question updated successfully!', 'success');
        closeEditModal();
    }
}

// Utility function for HTML escaping (if not already defined)
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal utility functions (if not already defined)
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

// Global functions for onclick handlers
window.openEditModal = openEditModal;
window.removeEditOption = removeEditOption;
window.removeEditTag = removeEditTag;