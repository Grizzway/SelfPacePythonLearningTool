// Admin Dashboard State Management
const AdminDashboard = {
    currentView: 'dashboard',
    subjects: [],
    quizzes: [],
    stats: {
        totalSubjects: 0,
        totalSubtopics: 0,
        totalLessons: 0,
        totalQuestions: 0
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminDashboard();
    setupNavigationListeners();
    setupDashboardEventListeners();
});

async function initializeAdminDashboard() {
    try {
        await loadDashboardData();
        renderDashboard();
        renderSubjectsList();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('Error loading dashboard data. Please try again.', 'error');
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch('/api/quiz/topics');
        if (!response.ok) throw new Error(`Failed to fetch quiz topics: ${response.status}`);
        const data = await response.json();
        AdminDashboard.quizzes = data.topics || [];

        AdminDashboard.subjects = [];
        let totalQuestions = 0;

        for (const topic of AdminDashboard.quizzes) {
            try {
                const quizResponse = await fetch(`/quizzes/${topic}Quiz.json`);
                if (quizResponse.ok) {
                    const quizData = await quizResponse.json();
                    const questionCount = (quizData.questions || []).length;
                    totalQuestions += questionCount;

                    AdminDashboard.subjects.push({
                        id: topic,
                        name: capitalizeFirst(topic),
                        description: `${capitalizeFirst(topic)} programming concepts and questions`,
                        icon: getSubjectIcon(topic),
                        color: getSubjectColor(topic),
                        questionCount: questionCount,
                        subtopic_count: Object.keys(quizData.tags || {}).length,
                        status: 'active',
                        created_date: 'Recently'
                    });
                }
            } catch (error) {
                console.warn(`Error loading info for ${topic}:`, error);
                AdminDashboard.subjects.push({
                    id: topic,
                    name: capitalizeFirst(topic),
                    description: `${capitalizeFirst(topic)} programming concepts`,
                    icon: getSubjectIcon(topic),
                    color: getSubjectColor(topic),
                    questionCount: 0,
                    subtopic_count: 0,
                    status: 'active',
                    created_date: 'Recently'
                });
            }
        }

        AdminDashboard.stats = {
            totalSubjects: AdminDashboard.subjects.length,
            totalSubtopics: AdminDashboard.subjects.reduce((sum, subject) => sum + subject.subtopic_count, 0),
            totalLessons: AdminDashboard.subjects.length,
            totalQuestions: totalQuestions
        };
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
}

function renderDashboard() {
    document.getElementById('totalSubjects').textContent = AdminDashboard.stats.totalSubjects;
    document.getElementById('totalSubtopics').textContent = AdminDashboard.stats.totalSubtopics;
    document.getElementById('totalLessons').textContent = AdminDashboard.stats.totalLessons;
    document.getElementById('totalQuestions').textContent = AdminDashboard.stats.totalQuestions;
}

function renderSubjectsList() {
    const subjectsList = document.getElementById('subjectsList');

    if (AdminDashboard.subjects.length === 0) {
        subjectsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No subjects created yet</p>
                <button class="action-btn primary" id="createFirstSubject">Create Your First Subject</button>
            </div>
        `;
        document.getElementById('createFirstSubject').addEventListener('click', openCreateSubjectModal);
        return;
    }

    subjectsList.innerHTML = AdminDashboard.subjects.map(subject => {
        return `
            <div class="subject-item">
                <div class="subject-icon">
                    <i class="${subject.icon}" style="color: ${subject.color};"></i>
                </div>
                <div class="subject-details">
                    <h3>${subject.name}</h3>
                    <p>${subject.description}</p>
                    <span class="subtopic-count">${subject.questionCount} questions</span>
                </div>
                <div class="subject-actions">
                    <button class="btn-small edit-subject-btn" data-subject-id="${subject.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-small view-subject-btn" data-subject-id="${subject.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-small delete-subject-btn" data-subject-id="${subject.id}" style="background: #f56565;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.edit-subject-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openEditSubjectModal(this.dataset.subjectId);
        });
    });

    document.querySelectorAll('.view-subject-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openViewSubjectModal(this.dataset.subjectId);
        });
    });

    document.querySelectorAll('.delete-subject-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteSubject(this.dataset.subjectId);
        });
    });
}

function setupNavigationListeners() {
    document.getElementById('quizEditorNav').addEventListener('click', function() {
        loadQuizEditor();
        showView('quizEditor');
    });

    document.querySelectorAll('.admin-nav a').forEach(link => {
        link.addEventListener('click', function() {
            document.querySelectorAll('.admin-nav a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function setupDashboardEventListeners() {
    document.getElementById('createSubjectBtn').addEventListener('click', openCreateSubjectModal);
    document.getElementById('manageLessonsBtn').addEventListener('click', function() {
        showView('quizEditor');
        loadQuizEditor();
    });
    document.getElementById('addQuestionsBtn').addEventListener('click', function() {
        showView('quizEditor');
        loadQuizEditor();
    });
    document.getElementById('exportDataBtn').addEventListener('click', exportData);

    setTimeout(() => {
        const backToSelectionBtn = document.getElementById('backToSelection');
        if (backToSelectionBtn) {
            backToSelectionBtn.addEventListener('click', function() {
                if (window.hasUnsavedChanges && window.hasUnsavedChanges()) {
                    if (confirm('You have unsaved changes. Are you sure you want to go back?')) {
                        showView('dashboard');
                        document.getElementById('quizEditor').style.display = 'none';
                        document.getElementById('quizSelection').style.display = 'block';
                        document.querySelectorAll('.admin-nav a').forEach(l => l.classList.remove('active'));
                        document.querySelector('.admin-nav a[href="/admin"]').classList.add('active');
                    }
                } else {
                    showView('dashboard');
                    document.getElementById('quizEditor').style.display = 'none';
                    document.getElementById('quizSelection').style.display = 'block';
                    document.querySelectorAll('.admin-nav a').forEach(l => l.classList.remove('active'));
                    document.querySelector('.admin-nav a[href="/admin"]').classList.add('active');
                }
            });
        }
    }, 100);
}

function showView(viewName) {
    document.querySelectorAll('.admin-view').forEach(view => {
        view.classList.remove('active');
    });
    const viewElement = document.getElementById(viewName + 'View');
    if (viewElement) {
        viewElement.classList.add('active');
        AdminDashboard.currentView = viewName;
    }
}

async function loadQuizEditor() {
    if (window.loadAvailableQuizzes) {
        try {
            await window.loadAvailableQuizzes();
            if (window.renderQuizSelection) window.renderQuizSelection();
        } catch (error) {
            showToast('Error loading quiz editor. Please try again.', 'error');
        }
    } else {
        showToast('Quiz editor not available. Please refresh the page.', 'error');
    }
}

// ---- ONLY USE THE PROPER MODAL, NO FALLBACK ----
async function openCreateSubjectModal() {
    if (typeof window.setupCreateSubjectModal === 'function') {
        window.setupCreateSubjectModal();

        if (typeof window.openCreateSubjectModal === 'function' && window.openCreateSubjectModal !== openCreateSubjectModal) {
            window.openCreateSubjectModal();
        } else {
            try {
                const modalContainer = document.getElementById('modalContainer');
                if (!document.getElementById('createSubjectModal')) {
                    const response = await fetch('/static/js/modals/create-subject-modal.html');
                    if (response.ok) {
                        const modalHTML = await response.text();
                        modalContainer.innerHTML = modalHTML;
                        window.setupCreateSubjectModal();
                    } else {
                        throw new Error('Failed to load modal HTML');
                    }
                }
                if (typeof window.resetCreateSubjectForm === 'function') window.resetCreateSubjectForm();
                const modal = document.getElementById('createSubjectModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('show');
                }
            } catch (error) {
                showToast('Error loading modal.', 'error');
            }
        }
    } else {
        showToast('Critical error: create subject modal not available.', 'error');
    }
}
// ---- END ONLY PROPER MODAL ----

function openViewSubjectModal(subjectId) {
    const subject = AdminDashboard.subjects.find(s => s.id === subjectId);
    if (!subject) {
        showToast('Subject not found', 'error');
        return;
    }

    const modalHTML = `
        <div class="modal-overlay" id="viewSubjectModal">
            <div class="modal view-subject-modal">
                <div class="modal-header">
                    <h3>
                        <i class="${subject.icon}" style="color: ${subject.color};"></i>
                        ${subject.name}
                    </h3>
                    <button class="modal-close" onclick="closeViewSubjectModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="subject-info-grid">
                        <div class="info-section">
                            <h4>📚 Basic Information</h4>
                            <div class="info-item">
                                <label>Subject Name:</label>
                                <span>${subject.name}</span>
                            </div>
                            <div class="info-item">
                                <label>Subject ID:</label>
                                <span>${subject.id}</span>
                            </div>
                            <div class="info-item">
                                <label>Description:</label>
                                <span>${subject.description}</span>
                            </div>
                            <div class="info-item">
                                <label>Status:</label>
                                <span class="status-badge ${subject.status}">${subject.status}</span>
                            </div>
                        </div>
                        <div class="info-section">
                            <h4>📊 Statistics</h4>
                            <div class="stats-list">
                                <div class="stat-item">
                                    <i class="fas fa-question-circle"></i>
                                    <span>${subject.questionCount} Questions</span>
                                </div>
                                <div class="stat-item">
                                    <i class="fas fa-tags"></i>
                                    <span>${subject.subtopic_count} Categories</span>
                                </div>
                                <div class="stat-item">
                                    <i class="fas fa-calendar"></i>
                                    <span>Created ${subject.created_date}</span>
                                </div>
                            </div>
                        </div>
                        <div class="info-section">
                            <h4>🎨 Visual Settings</h4>
                            <div class="visual-info">
                                <div class="icon-display">
                                    <label>Icon:</label>
                                    <div class="icon-sample">
                                        <i class="${subject.icon}" style="color: ${subject.color}; font-size: 2rem;"></i>
                                        <code>${subject.icon}</code>
                                    </div>
                                </div>
                                <div class="color-display">
                                    <label>Theme Color:</label>
                                    <div class="color-sample">
                                        <div class="color-swatch" style="background: ${subject.color};"></div>
                                        <code>${subject.color}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeViewSubjectModal()">Close</button>
                    <button class="btn btn-primary" onclick="closeViewSubjectModal(); openEditSubjectModal('${subject.id}')">
                        <i class="fas fa-edit"></i> Edit Subject
                    </button>
                    <button class="btn btn-success" onclick="openQuizEditor('${subject.id}')">
                        <i class="fas fa-edit"></i> Edit Questions
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = modalHTML;
    document.getElementById('viewSubjectModal').classList.add('show');
}

function closeViewSubjectModal() {
    const modal = document.getElementById('viewSubjectModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function openEditSubjectModal(subjectId) {
    const subject = AdminDashboard.subjects.find(s => s.id === subjectId);
    if (!subject) {
        showToast('Subject not found', 'error');
        return;
    }

    const modalHTML = `
        <div class="modal-overlay" id="editSubjectModal">
            <div class="modal edit-subject-modal">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-edit"></i>
                        Edit Subject
                    </h3>
                    <button class="modal-close" onclick="closeEditSubjectModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editSubjectForm">
                        <div class="form-section">
                            <h4>📚 Basic Information</h4>
                            <div class="form-group">
                                <label for="editSubjectName">Subject Name *</label>
                                <input type="text" id="editSubjectName" value="${subject.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="editSubjectDescription">Description *</label>
                                <textarea id="editSubjectDescription" rows="3" required>${subject.description}</textarea>
                            </div>
                        </div>
                        <div class="form-section">
                            <h4>🎨 Visual Settings</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editSubjectIcon">Icon *</label>
                                    <div class="icon-selector">
                                        <input type="text" id="editSubjectIcon" value="${subject.icon}" required>
                                        <div class="icon-preview">
                                            <i id="editIconPreview" class="${subject.icon}"></i>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editSubjectColor">Theme Color *</label>
                                    <div class="color-selector">
                                        <input type="color" id="editSubjectColor" value="${subject.color}" required>
                                        <div class="color-preview" id="editColorPreview"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="form-section preview-section">
                            <h4>👀 Preview</h4>
                            <div class="subject-card-preview">
                                <div class="subject-icon-preview">
                                    <i id="editPreviewIcon" class="${subject.icon}"></i>
                                </div>
                                <div class="subject-content-preview">
                                    <h5 id="editPreviewName">${subject.name}</h5>
                                    <p id="editPreviewDescription">${subject.description}</p>
                                    <div class="subject-stats-preview">
                                        <span><i class="fas fa-book"></i> ${subject.questionCount} Questions</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeEditSubjectModal()">Cancel</button>
                    <button class="btn btn-success" onclick="saveSubjectChanges('${subject.id}')">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = modalHTML;
    setupEditSubjectListeners();
    updateEditSubjectColor(subject.color);

    document.getElementById('editSubjectModal').classList.add('show');
}

function closeEditSubjectModal() {
    const modal = document.getElementById('editSubjectModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function setupEditSubjectListeners() {
    document.getElementById('editSubjectName').addEventListener('input', updateEditSubjectPreview);
    document.getElementById('editSubjectDescription').addEventListener('input', updateEditSubjectPreview);
    document.getElementById('editSubjectIcon').addEventListener('input', function() {
        updateEditSubjectIconPreview(this.value);
        updateEditSubjectPreview();
    });
    document.getElementById('editSubjectColor').addEventListener('input', function() {
        updateEditSubjectColor(this.value);
        updateEditSubjectPreview();
    });

    document.getElementById('editSubjectModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditSubjectModal();
        }
    });
}

function updateEditSubjectIconPreview(iconClass) {
    const preview = document.getElementById('editIconPreview');
    const previewIcon = document.getElementById('editPreviewIcon');

    if (preview) preview.className = iconClass;
    if (previewIcon) previewIcon.className = iconClass;
}

function updateEditSubjectColor(color) {
    const colorPreview = document.getElementById('editColorPreview');
    const previewIcon = document.getElementById('editPreviewIcon');

    if (colorPreview) colorPreview.style.background = color;
    if (previewIcon) previewIcon.style.color = color;
}

function updateEditSubjectPreview() {
    const name = document.getElementById('editSubjectName')?.value || 'Subject Name';
    const description = document.getElementById('editSubjectDescription')?.value || 'Subject description';
    const icon = document.getElementById('editSubjectIcon')?.value || 'fas fa-book';
    const color = document.getElementById('editSubjectColor')?.value || '#4299e1';

    const previewName = document.getElementById('editPreviewName');
    const previewDescription = document.getElementById('editPreviewDescription');
    const previewIcon = document.getElementById('editPreviewIcon');

    if (previewName) previewName.textContent = name;
    if (previewDescription) previewDescription.textContent = description;
    if (previewIcon) {
        previewIcon.className = icon;
        previewIcon.style.color = color;
    }
}

function saveSubjectChanges(subjectId) {
    const name = document.getElementById('editSubjectName').value.trim();
    const description = document.getElementById('editSubjectDescription').value.trim();
    const icon = document.getElementById('editSubjectIcon').value.trim();
    const color = document.getElementById('editSubjectColor').value;

    if (!name || !description || !icon || !color) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const subjectIndex = AdminDashboard.subjects.findIndex(s => s.id === subjectId);
    if (subjectIndex !== -1) {
        AdminDashboard.subjects[subjectIndex] = {
            ...AdminDashboard.subjects[subjectIndex],
            name,
            description,
            icon,
            color
        };

        renderSubjectsList();
        closeEditSubjectModal();
        showToast('Subject updated successfully!', 'success');
    } else {
        showToast('Subject not found', 'error');
    }
}

function openQuizEditor(subjectId) {
    closeViewSubjectModal();
    showView('quizEditor');
    loadQuizEditor().then(() => {
        if (window.selectQuiz) {
            setTimeout(() => {
                window.selectQuiz(subjectId);
            }, 100);
        }
    });
}

async function deleteSubject(subjectId) {
    const subject = AdminDashboard.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    if (confirm(`Are you sure you want to delete "${subject.name}"? This will remove all associated questions and cannot be undone.`)) {
        try {
            const response = await fetch(`/api/admin/delete-subject/${subjectId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const responseText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    errorData = { error: responseText || `Server error: ${response.status}` };
                }
                throw new Error(errorData.error || `Failed to delete subject: ${response.status}`);
            }
            await loadDashboardData();
            renderDashboard();
            renderSubjectsList();
            showToast(`Subject "${subject.name}" deleted successfully.`, 'success');
        } catch (error) {
            showToast(`Error deleting subject: ${error.message}`, 'error');
        }
    }
}

async function exportData() {
    try {
        const response = await fetch('/api/admin/export-data');
        if (!response.ok) throw new Error('Failed to export data');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `learning-platform-export-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Data exported successfully!', 'success');
    } catch (error) {
        showToast('Error exporting data. Please try again.', 'error');
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getSubjectIcon(subject) {
    const iconMap = {
        'python': 'fab fa-python',
        'javascript': 'fab fa-js-square',
        'java': 'fab fa-java',
        'cpp': 'fas fa-code',
        'c': 'fas fa-code',
        'html': 'fab fa-html5',
        'css': 'fab fa-css3-alt',
        'react': 'fab fa-react',
        'node': 'fab fa-node-js',
        'sql': 'fas fa-database',
        'git': 'fab fa-git-alt',
        'docker': 'fab fa-docker',
        'math': 'fas fa-calculator',
        'science': 'fas fa-flask',
        'history': 'fas fa-landmark',
        'geography': 'fas fa-globe'
    };
    return iconMap[subject.toLowerCase()] || 'fas fa-book';
}

function getSubjectColor(subject) {
    const colorMap = {
        'python': '#306998',
        'javascript': '#f7df1e',
        'java': '#ed8b00',
        'cpp': '#00599c',
        'c': '#a8b9cc',
        'html': '#e34f26',
        'css': '#1572b6',
        'react': '#61dafb',
        'node': '#339933',
        'sql': '#336791',
        'git': '#f05032',
        'docker': '#2496ed',
        'math': '#4299e1',
        'science': '#48bb78',
        'history': '#ed8936',
        'geography': '#38b2ac'
    };
    return colorMap[subject.toLowerCase()] || '#4299e1';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
    document.getElementById('toastClose').onclick = () => {
        toast.classList.remove('show');
    };
}

// Export functions for global access
window.AdminDashboard = AdminDashboard;
window.showToast = showToast;
window.openViewSubjectModal = openViewSubjectModal;
window.closeViewSubjectModal = closeViewSubjectModal;
window.openEditSubjectModal = openEditSubjectModal;
window.closeEditSubjectModal = closeEditSubjectModal;
window.saveSubjectChanges = saveSubjectChanges;
window.openQuizEditor = openQuizEditor;
window.loadDashboardData = loadDashboardData;
window.renderDashboard = renderDashboard;
window.renderSubjectsList = renderSubjectsList;
