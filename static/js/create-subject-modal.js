// Create Subject Modal Functionality

function setupCreateSubjectModal() {
    // Always reattach listeners (no initialized flag)
    console.log('Setting up create subject modal...');
    
    // Event listeners
    const closeBtn = document.getElementById('closeCreateSubjectModal');
    const cancelBtn = document.getElementById('cancelCreateSubject');
    const confirmBtn = document.getElementById('confirmCreateSubject');
    
    if (closeBtn) closeBtn.addEventListener('click', closeCreateSubjectModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCreateSubjectModal);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmCreateSubject);
    
    // Auto-generate subject ID from name
    const subjectNameInput = document.getElementById('subjectName');
    if (subjectNameInput) {
        subjectNameInput.addEventListener('input', function() {
            const name = this.value;
            const id = name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                .replace(/\s+/g, '_') // Replace spaces with underscores
                .replace(/_+/g, '_') // Replace multiple underscores with single
                .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
            const subjectIdInput = document.getElementById('subjectId');
            if (subjectIdInput) subjectIdInput.value = id;
            updateCreateSubjectPreview();
        });
    }
    
    // Update icon preview
    const iconInput = document.getElementById('subjectIcon');
    if (iconInput) {
        iconInput.addEventListener('input', function() {
            updateIconPreview(this.value);
            updateCreateSubjectPreview();
        });
    }
    
    // Update color preview
    const colorInput = document.getElementById('subjectColor');
    if (colorInput) {
        colorInput.addEventListener('input', function() {
            updateColorPreview(this.value);
            updateCreateSubjectPreview();
        });
    }
    
    // Update description preview
    const descInput = document.getElementById('subjectDescription');
    if (descInput) descInput.addEventListener('input', updateCreateSubjectPreview);
    
    // Update tags preview
    const tagsInput = document.getElementById('initialTags');
    if (tagsInput) tagsInput.addEventListener('input', updateCreateSubjectPreview);
    
    // Icon suggestion buttons
    document.querySelectorAll('.icon-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.dataset.icon;
            const iconInput = document.getElementById('subjectIcon');
            if (iconInput) {
                iconInput.value = icon;
                updateIconPreview(icon);
                updateCreateSubjectPreview();
            }
            // Update button states
            document.querySelectorAll('.icon-suggestion-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Close modal when clicking outside
    const modal = document.getElementById('createSubjectModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeCreateSubjectModal();
        });
    }
    console.log('Create subject modal setup complete');
}

function openCreateSubjectModal() {
    console.log('Opening create subject modal...');
    loadCreateSubjectModal().then(() => {
        resetCreateSubjectForm();
        showModal('createSubjectModal');
        updateCreateSubjectPreview();
    }).catch(error => {
        console.error('Error loading create subject modal:', error);
        showToast('Error opening create subject form. Please try again.', 'error');
    });
}

async function loadCreateSubjectModal() {
    const modalContainer = document.getElementById('modalContainer');
    try {
        // Check if modal is already loaded
        if (document.getElementById('createSubjectModal')) {
            setupCreateSubjectModal();
            return;
        }
        // Load from file
        const response = await fetch('/static/js/modals/create-subject-modal.html');
        if (!response.ok) throw new Error(`Failed to load modal HTML: ${response.status} - ${response.statusText}`);
        const modalHTML = await response.text();
        modalContainer.innerHTML = modalHTML;
        // Always (re)setup after inject
        setupCreateSubjectModal();
    } catch (error) {
        console.error('Error loading create subject modal from file:', error);
        showToast('Error loading modal.', 'error');
    }
}

function closeCreateSubjectModal() {
    hideModal('createSubjectModal');
}

function resetCreateSubjectForm() {
    // Reset form fields
    const elements = {
        subjectName: document.getElementById('subjectName'),
        subjectId: document.getElementById('subjectId'),
        subjectDescription: document.getElementById('subjectDescription'),
        subjectIcon: document.getElementById('subjectIcon'),
        subjectColor: document.getElementById('subjectColor'),
        initialTags: document.getElementById('initialTags')
    };
    if (elements.subjectName) elements.subjectName.value = '';
    if (elements.subjectId) elements.subjectId.value = '';
    if (elements.subjectDescription) elements.subjectDescription.value = '';
    if (elements.subjectIcon) elements.subjectIcon.value = 'fas fa-book';
    if (elements.subjectColor) elements.subjectColor.value = '#4299e1';
    if (elements.initialTags) elements.initialTags.value = '';
    updateIconPreview('fas fa-book');
    updateColorPreview('#4299e1');
    // Reset icon button states
    document.querySelectorAll('.icon-suggestion-btn').forEach(btn => btn.classList.remove('selected'));
    const defaultIconBtn = document.querySelector('.icon-suggestion-btn[data-icon="fas fa-book"]');
    if (defaultIconBtn) defaultIconBtn.classList.add('selected');
}

function updateIconPreview(iconClass) {
    const preview = document.getElementById('iconPreview');
    const previewIcon = document.getElementById('previewIcon');
    if (preview) preview.className = iconClass;
    if (previewIcon) previewIcon.className = iconClass;
}

function updateColorPreview(color) {
    const colorPreview = document.getElementById('colorPreview');
    const previewIcon = document.getElementById('previewIcon');
    if (colorPreview) colorPreview.style.background = color;
    if (previewIcon) previewIcon.style.color = color;
}

function updateCreateSubjectPreview() {
    const name = document.getElementById('subjectName')?.value || 'Subject Name';
    const description = document.getElementById('subjectDescription')?.value || 'Subject description will appear here...';
    const tags = document.getElementById('initialTags')?.value || '';
    const icon = document.getElementById('subjectIcon')?.value || 'fas fa-book';
    const color = document.getElementById('subjectColor')?.value || '#4299e1';
    const previewName = document.getElementById('previewName');
    const previewDescription = document.getElementById('previewDescription');
    const previewTagCount = document.getElementById('previewTagCount');
    const previewIcon = document.getElementById('previewIcon');
    if (previewName) previewName.textContent = name;
    if (previewDescription) previewDescription.textContent = description;
    if (previewIcon) {
        previewIcon.className = icon;
        previewIcon.style.color = color;
    }
    const tagCount = tags ? tags.split(',').filter(tag => tag.trim().length > 0).length : 0;
    if (previewTagCount) previewTagCount.textContent = tagCount;
}

function collectCreateSubjectData() {
    const name = document.getElementById('subjectName')?.value?.trim() || '';
    const id = document.getElementById('subjectId')?.value?.trim() || '';
    const description = document.getElementById('subjectDescription')?.value?.trim() || '';
    const icon = document.getElementById('subjectIcon')?.value?.trim() || '';
    const color = document.getElementById('subjectColor')?.value || '';
    const tagsInput = document.getElementById('initialTags')?.value?.trim() || '';
    const tags = {};
    if (tagsInput) {
        const tagList = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        tagList.forEach(tag => {
            const tagKey = tag.toLowerCase().replace(/\s+/g, '_');
            tags[tagKey] = tag;
        });
    }
    return { id, name, description, icon, color, tags };
}

function validateCreateSubjectData(data) {
    const validationErrors = [];
    if (!data.name) validationErrors.push('Subject name is required');
    if (!data.id) validationErrors.push('Subject ID is required');
    else if (!/^[a-z0-9_]+$/.test(data.id)) validationErrors.push('Subject ID can only contain lowercase letters, numbers, and underscores');
    if (!data.description) validationErrors.push('Subject description is required');
    if (!data.icon) validationErrors.push('Subject icon is required');
    if (!data.color) validationErrors.push('Subject color is required');
    return validationErrors;
}

async function confirmCreateSubject() {
    try {
        const subjectData = collectCreateSubjectData();
        const validationErrors = validateCreateSubjectData(subjectData);
        if (validationErrors.length > 0) {
            if (window.showToast) window.showToast(validationErrors.join(', '), 'error');
            else alert(validationErrors.join(', '));
            return;
        }
        showCreateSubjectLoading(true);
        const quizData = { tags: subjectData.tags, questions: [] };
        const response = await fetch('/api/admin/create-subject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subjectId: subjectData.id,
                subjectName: subjectData.name,
                description: subjectData.description,
                icon: subjectData.icon,
                color: subjectData.color,
                quizData: quizData
            })
        });
        if (!response.ok) {
            const responseText = await response.text();
            let errorData;
            try { errorData = JSON.parse(responseText); }
            catch (e) { errorData = { error: responseText || `Server error: ${response.status}` }; }
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        await response.json();
        if (window.showToast) window.showToast(`Subject "${subjectData.name}" created successfully!`, 'success');
        else alert(`Subject "${subjectData.name}" created successfully!`);
        closeCreateSubjectModal();
        if (window.AdminDashboard && typeof window.loadDashboardData === 'function') {
            await window.loadDashboardData();
            if (window.renderDashboard) window.renderDashboard();
            if (window.renderSubjectsList) window.renderSubjectsList();
        }
    } catch (error) {
        if (window.showToast) window.showToast(`Error creating subject: ${error.message}`, 'error');
        else alert(`Error creating subject: ${error.message}`);
    } finally {
        showCreateSubjectLoading(false);
    }
}

function showCreateSubjectLoading(show) {
    const modal = document.getElementById('createSubjectModal');
    const confirmBtn = document.getElementById('confirmCreateSubject');
    if (!modal || !confirmBtn) return;
    if (show) {
        modal.classList.add('loading');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        if (!modal.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Creating subject and quiz file...</p>
                </div>
            `;
            modal.querySelector('.modal').appendChild(overlay);
        }
    } else {
        modal.classList.remove('loading');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-plus"></i> Create Subject';
        const overlay = modal.querySelector('.loading-overlay');
        if (overlay) overlay.remove();
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        console.log('Modal shown:', modalId);
    } else {
        console.error('Modal not found:', modalId);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
        console.log('Modal hidden:', modalId);
    }
}

// Export functions for global access
window.setupCreateSubjectModal = setupCreateSubjectModal;
window.openCreateSubjectModal = openCreateSubjectModal;
window.closeCreateSubjectModal = closeCreateSubjectModal;
window.resetCreateSubjectForm = resetCreateSubjectForm;
