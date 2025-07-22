document.addEventListener('DOMContentLoaded', function() {
    displayQuizResults();
});

// Tab system state
let currentTabIndex = 0;
let totalTabs = 0;
let incorrectTopics = [];
let completedTabs = new Set();

function displayQuizResults() {
    // Get the actual quiz results from sessionStorage
    const quizResultsData = sessionStorage.getItem('quizResults');
    
    if (!quizResultsData) {
        showErrorState();
        return;
    }
    
    const results = JSON.parse(quizResultsData);
    
    // Check if student passed (80% or higher)
    const passed = (results.score || 0) >= 80;
    
    if (passed || !results.incorrectTags || results.incorrectTags.length === 0) {
        // Show regular results for passing scores or no incorrect tags
        showRegularResults(results);
    } else {
        // Show remedial learning system for failing scores
        showRemedialLearningSystem(results);
    }
}

function showRegularResults(results) {
    // Hide loading state and show results content
    const loadingState = document.getElementById('loadingState');
    const resultsContent = document.getElementById('resultsContent');
    
    if (loadingState) loadingState.style.display = 'none';
    if (resultsContent) resultsContent.style.display = 'block';
    
    // Update progress if passed
    if ((results.score || 0) >= 80) {
        updateProgress(results);
    }
    
    // Update the score display
    updateScoreDisplay(results);
    
    // Update the congratulations message based on score
    updateCongratulationsMessage(results);
    
    // Display AI feedback if available
    displayAIFeedback(results);
    
    // Update action buttons based on results
    updateActionButtons(results);
}

function showRemedialLearningSystem(results) {
    const container = document.getElementById('resultsContainer');
    const loadingState = document.getElementById('loadingState');
    
    if (loadingState) loadingState.style.display = 'none';
    
    // Get unique incorrect topics
    incorrectTopics = [...new Set(results.incorrectTags || [])];
    
    // Filter questions by incorrect topics to ensure we show all incorrect questions
    const incorrectQuestions = results.incorrect || [];
    
    console.log('Incorrect topics:', incorrectTopics);
    console.log('Incorrect questions:', incorrectQuestions);
    
    // Calculate total tabs: 2 per topic (video + overview) + final summary
    totalTabs = (incorrectTopics.length * 2) + 1;
    
    // Populate navigation
    populateTopicNavigation(incorrectTopics);
    
    // Create the remedial learning interface
    container.innerHTML = `
        <div class="remedial-learning-container">
            <div class="remedial-header">
                <h2>📚 Remedial Learning Required</h2>
                <p>You scored ${Math.round(results.score || 0)}% (${results.correctCount || 0}/${results.totalQuestions || 0}). Let's review the concepts you missed!</p>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                </div>
                <p class="progress-text" id="progressText">Step 1 of ${totalTabs}</p>
            </div>
            
            <div class="tab-content-area" id="tabContentArea">
                <!-- Content will be populated by showTab() -->
            </div>
            
            <div class="tab-navigation-buttons">
                <button class="nav-btn nav-btn-prev" id="prevBtn" disabled onclick="previousTab()">
                    ← Previous
                </button>
                <button class="nav-btn nav-btn-next" id="nextBtn" onclick="nextTab()">
                    Next →
                </button>
            </div>
        </div>
    `;
    
    // Show the first tab
    showTab(0, incorrectQuestions);
}

function populateTopicNavigation(topics) {
    const tagNavigation = document.getElementById('tag-navigation');
    if (!tagNavigation || !topics || topics.length === 0) {
        return;
    }

    // Clear existing tag items
    const existingTagItems = tagNavigation.querySelectorAll('.tag-item');
    existingTagItems.forEach(item => item.remove());

    const tagDefinitions = {
        'for': 'For Loops',
        'while': 'While Loops', 
        'break': 'Break Statement',
        'continue': 'Continue Statement',
        'range': 'Range Function',
        'else': 'Else with Loops',
        'pass': 'Pass Statement'
    };

    // Add tag items
    topics.forEach((topic, index) => {
        const tagItem = document.createElement('a');
        tagItem.className = 'tag-item';
        tagItem.dataset.topic = topic;
        
        // Check if this topic is accessible
        const targetTabIndex = index * 2;
        const isAccessible = canAccessTab(targetTabIndex);
        
        if (isAccessible) {
            tagItem.innerHTML = `📚 ${tagDefinitions[topic] || topic}`;
            tagItem.href = '#';
            tagItem.addEventListener('click', (e) => {
                e.preventDefault();
                selectTopicTab(topic);
            });
        } else {
            tagItem.innerHTML = `🔒 ${tagDefinitions[topic] || topic}`;
            tagItem.classList.add('locked');
            tagItem.style.opacity = '0.5';
            tagItem.style.cursor = 'not-allowed';
            tagItem.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Complete the previous topics first to unlock this one.');
            });
        }
        
        tagNavigation.appendChild(tagItem);
    });

    // Show tag navigation
    tagNavigation.style.display = 'block';
    
    // Expose variables globally for navigation component
    window.incorrectTopics = topics;
    window.showTab = showTab;
    
    // Update navigation states periodically
    setInterval(updateTopicNavigationStates, 1000);
}

function updateTopicNavigationStates() {
    // Update which topics are accessible based on completed tabs
    incorrectTopics.forEach((topic, index) => {
        const tagItem = document.querySelector(`[data-topic="${topic}"]`);
        if (tagItem) {
            const targetTabIndex = index * 2;
            const isAccessible = canAccessTab(targetTabIndex);
            
            if (isAccessible && tagItem.classList.contains('locked')) {
                // Unlock this topic
                tagItem.classList.remove('locked');
                tagItem.style.opacity = '1';
                tagItem.style.cursor = 'pointer';
                
                const tagDefinitions = {
                    'for': 'For Loops',
                    'while': 'While Loops', 
                    'break': 'Break Statement',
                    'continue': 'Continue Statement',
                    'range': 'Range Function',
                    'else': 'Else with Loops',
                    'pass': 'Pass Statement'
                };
                
                tagItem.innerHTML = `📚 ${tagDefinitions[topic] || topic}`;
                
                // Remove old event listeners and add new ones
                tagItem.replaceWith(tagItem.cloneNode(true));
                const newTagItem = document.querySelector(`[data-topic="${topic}"]`);
                newTagItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectTopicTab(topic);
                });
            }
        }
    });
}

function canAccessTab(tabIndex) {
    // Can always access tab 0 (first tab)
    if (tabIndex === 0) return true;
    
    // Check if all previous tabs have been completed
    for (let i = 0; i < tabIndex; i++) {
        if (!completedTabs.has(i)) {
            return false;
        }
    }
    return true;
}

function selectTopicTab(topic) {
    const topicIndex = incorrectTopics.indexOf(topic);
    if (topicIndex !== -1) {
        const targetTabIndex = topicIndex * 2; // Show the video tab for this topic
        
        // Check if user can access this tab (sequential viewing)
        if (!canAccessTab(targetTabIndex)) {
            alert('Please complete the previous topics in order before jumping ahead.');
            return;
        }
        
        // Show the video tab for this topic
        const quizResultsData = sessionStorage.getItem('quizResults');
        const results = JSON.parse(quizResultsData);
        showTab(targetTabIndex, results.incorrect || []);
        
        // Update active state
        document.querySelectorAll('.tag-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-topic="${topic}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
    }
}

function showTab(tabIndex, incorrectQuestions) {
    currentTabIndex = tabIndex;
    const contentArea = document.getElementById('tabContentArea');
    
    if (!contentArea) {
        console.error('Tab content area not found');
        return;
    }
    
    // Calculate which topic and type of tab this is
    const topicIndex = Math.floor(tabIndex / 2);
    const isVideoTab = tabIndex % 2 === 0;
    const isFinalTab = tabIndex >= incorrectTopics.length * 2;
    
    let content = '';
    let currentTopicName = '';
    
    if (isFinalTab) {
        // Final summary tab
        content = createFinalSummaryTab();
        currentTopicName = 'Final Review';
    } else if (isVideoTab) {
        // Video/questions tab
        const topic = incorrectTopics[topicIndex];
        const topicQuestions = incorrectQuestions.filter(q => 
            q.tags && q.tags.includes(topic)
        );
        content = createVideoTab(topic, topicQuestions);
        currentTopicName = getTopicDisplayName(topic) + ' - Video Review';
    } else {
        // Overview/post tab
        const topic = incorrectTopics[topicIndex];
        content = createOverviewTab(topic);
        currentTopicName = getTopicDisplayName(topic) + ' - Concept Overview';
    }
    
    console.log('Showing tab', tabIndex, 'with content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));
    
    // Clear and set the content
    contentArea.innerHTML = '';
    setTimeout(() => {
        contentArea.innerHTML = content;
        console.log('Content set in DOM');
    }, 10);
    
    // Update current topic indicator
    updateCurrentTopicIndicator(currentTopicName);
    
    // Update navigation active states
    updateNavigationActiveStates(topicIndex, isVideoTab, isFinalTab);
    
    // Update progress
    updateProgressBar();
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Mark current tab as completed when user views it
    completedTabs.add(tabIndex);
}

function getTopicDisplayName(topic) {
    const topicNames = {
        'for': 'For Loops',
        'while': 'While Loops',
        'break': 'Break Statement',
        'continue': 'Continue Statement',
        'range': 'Range Function',
        'else': 'Else with Loops',
        'pass': 'Pass Statement'
    };
    return topicNames[topic] || topic;
}

function updateCurrentTopicIndicator(topicName) {
    // Update the header to show current topic
    const headerElement = document.querySelector('.remedial-header h2');
    if (headerElement) {
        headerElement.innerHTML = `📚 ${topicName}`;
    }
}

function updateNavigationActiveStates(topicIndex, isVideoTab, isFinalTab) {
    // Remove all active states
    document.querySelectorAll('.tag-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (!isFinalTab && topicIndex < incorrectTopics.length) {
        // Add active state to current topic
        const currentTopic = incorrectTopics[topicIndex];
        const activeItem = document.querySelector(`[data-topic="${currentTopic}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

function createVideoTab(topic, questions) {
    console.log('Creating video tab for topic:', topic, 'with questions:', questions);
    
    const topicNames = {
        'for': 'For Loops',
        'while': 'While Loops',
        'break': 'Break Statement',
        'continue': 'Continue Statement',
        'range': 'Range Function',
        'else': 'Else with Loops',
        'pass': 'Pass Statement'
    };
    
    const topicName = topicNames[topic] || topic;
    
    // Simplified content that should definitely work
    const content = `
        <div class="tab-content video-tab" style="display: block; padding: 20px; background: white;">
            <h3 style="color: #2c3e50; margin-bottom: 25px; display: block;">📹 ${topicName} - Video Review</h3>
            
            <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h4 style="margin-bottom: 15px;">📺 Watch This Video</h4>
                <iframe 
                    src="https://www.youtube.com/embed/0ZvaDa8eT5s" 
                    width="100%" 
                    height="400"
                    frameborder="0" 
                    allowfullscreen
                    style="border-radius: 8px;">
                </iframe>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #e74c3c; margin-bottom: 15px;">❌ Questions You Missed</h4>
                <p>Review the questions you got wrong on this topic:</p>
                ${questions && questions.length > 0 ? 
                    questions.map(q => `
                        <div style="background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #e74c3c; border-radius: 4px;">
                            <strong>Question:</strong> ${q.question || 'Question text not available'}<br>
                            <strong>Your Answer:</strong> ${q.answer || 'No answer'}<br>
                            <strong>Correct Answer:</strong> ${q.correct || 'Not available'}
                        </div>
                    `).join('') 
                    : '<p>This topic needs review based on your quiz performance.</p>'
                }
            </div>
        </div>
    `;
    
    console.log('Generated video tab content - length:', content.length);
    return content;
}

function createOverviewTab(topic) {
    console.log('Creating overview tab for topic:', topic);
    
    const topicNames = {
        'for': 'For Loops',
        'while': 'While Loops',
        'break': 'Break Statement',
        'continue': 'Continue Statement',
        'range': 'Range Function',
        'else': 'Else with Loops',
        'pass': 'Pass Statement'
    };
    
    const topicName = topicNames[topic] || topic;
    
    // Simplified content
    const content = `
        <div class="tab-content overview-tab" style="display: block; padding: 20px; background: white;">
            <h3 style="color: #2c3e50; margin-bottom: 25px;">📖 ${topicName} - Concept Overview</h3>
            
            <div style="background: #e8f4f8; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">💡 What is ${topicName}?</h4>
                <p style="line-height: 1.6;">This is an important Python concept that you need to understand better. Please read through this overview carefully.</p>
            </div>
            
            <div style="background: #f0f8f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">🎯 Key Points to Remember</h4>
                <ul style="line-height: 1.6;">
                    <li>Pay attention to the syntax and structure</li>
                    <li>Practice with simple examples first</li>
                    <li>Understand when and why to use this concept</li>
                    <li>Watch out for common mistakes</li>
                </ul>
            </div>
            
            <div style="background: #fff8e1; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">💻 Example Code</h4>
                <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto;">
# Example ${topicName} usage
# Study this example carefully
print("This is a ${topicName} example")
                </pre>
            </div>
        </div>
    `;
    
    console.log('Generated overview tab content - length:', content.length);
    return content;
}

function createFinalSummaryTab() {
    const content = `
        <div class="tab-content final-tab" style="display: block; padding: 20px; background: white; text-align: center;">
            <h3 style="color: #2c3e50; margin-bottom: 25px;">🎯 Ready for Remedial Quiz!</h3>
            
            <div style="background: #e8f5e8; padding: 30px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #28a745; margin-bottom: 20px;">🎉 Great Job! You've Completed All Review Materials</h4>
                <p style="font-size: 1.1em; line-height: 1.6; margin-bottom: 20px;">
                    You've watched the instructional videos and reviewed the key concepts for all the topics you missed. 
                    Now you're ready to test your improved understanding!
                </p>
                
                <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: left;">
                    <h5 style="color: #2c3e50; margin-bottom: 15px;">📚 Topics You've Reviewed:</h5>
                    <ul style="list-style: none; padding: 0;">
                        ${incorrectTopics.map(topic => {
                            const topicNames = {
                                'for': 'For Loops',
                                'while': 'While Loops',
                                'break': 'Break Statement',
                                'continue': 'Continue Statement',
                                'range': 'Range Function',
                                'else': 'Else with Loops',
                                'pass': 'Pass Statement'
                            };
                            return `<li style="padding: 8px 0; color: #28a745; font-weight: 500;">✅ ${topicNames[topic] || topic}</li>`;
                        }).join('')}
                    </ul>
                </div>
                
                <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: left;">
                    <h5 style="color: #856404; margin-bottom: 10px;">🚀 Next Steps:</h5>
                    <p style="color: #856404; margin: 0;">
                        Click the "Take Remedial Quiz" button below to test your understanding of these concepts. 
                        The remedial quiz will focus specifically on the areas where you need improvement.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    console.log('Generated final summary tab');
    return content;
}

function nextTab() {
    if (currentTabIndex < totalTabs - 1) {
        const quizResultsData = sessionStorage.getItem('quizResults');
        const results = JSON.parse(quizResultsData);
        showTab(currentTabIndex + 1, results.incorrect || []);
    }
}

function previousTab() {
    if (currentTabIndex > 0) {
        const quizResultsData = sessionStorage.getItem('quizResults');
        const results = JSON.parse(quizResultsData);
        showTab(currentTabIndex - 1, results.incorrect || []);
    }
}

function updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill && progressText) {
        const progress = ((currentTabIndex + 1) / totalTabs) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Step ${currentTabIndex + 1} of ${totalTabs}`;
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentTabIndex === 0;
    }
    
    if (nextBtn) {
        const isLastTab = currentTabIndex >= totalTabs - 1;
        
        if (isLastTab) {
            // Show remedial quiz button on final tab
            nextBtn.innerHTML = '📚 Take Remedial Quiz';
            nextBtn.onclick = takeRemedialQuiz;
        } else {
            nextBtn.innerHTML = 'Next →';
            nextBtn.onclick = nextTab;
        }
    }
}

function takeRemedialQuiz() {
    const topic = sessionStorage.getItem('quizTopic') || 'loops';
    const baseTopic = topic.replace('-remedial', '');
    window.location.href = `/remedial-quiz/${baseTopic}`;
}

function formatQuestionText(text) {
    if (!text) return '';
    
    return text
        .replace(/\[code\]/g, '<pre>')
        .replace(/\[\/code\]/g, '</pre>')
        .replace(/\[\\n\]/g, '<br>')
        .replace(/\[indent\]/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

// Legacy functions for regular results
function updateScoreDisplay(results) {
    const scoreElement = document.getElementById('scoreDisplay');
    
    if (scoreElement) {
        const percentage = Math.round(results.score || 0);
        const fraction = `${results.correctCount || 0}/${results.totalQuestions || 0}`;
        
        scoreElement.textContent = `Your Score: ${percentage}% (${fraction})`;
    }
}

function updateCongratulationsMessage(results) {
    const messageElement = document.getElementById('resultMessage');
    const titleElement = document.getElementById('resultTitle');
    
    const percentage = Math.round(results.score || 0);
    const correctCount = results.correctCount || 0;
    const totalQuestions = results.totalQuestions || 0;
    
    let title, message, containerClass;
    
    if (percentage >= 80) {
        title = "🎉 Congratulations!";
        message = `Excellent work! You've passed the quiz with ${percentage}% (${correctCount}/${totalQuestions}). You demonstrated a strong understanding of Python loops.`;
        containerClass = "success";
    } else if (percentage >= 60) {
        title = "📚 Almost There!";
        message = `You scored ${percentage}% (${correctCount}/${totalQuestions}). You need 80% to pass. Review the concepts you missed and try again!`;
        containerClass = "improvement";
    } else if (percentage >= 40) {
        title = "📚 Keep Learning!";
        message = `You scored ${percentage}% (${correctCount}/${totalQuestions}). You need 80% to pass. Review the concepts you missed and try again. Practice makes perfect!`;
        containerClass = "improvement";
    } else {
        title = "💪 Don't Give Up!";
        message = `You scored ${percentage}% (${correctCount}/${totalQuestions}). You need 80% to pass. Review the material and take the quiz again when you're ready.`;
        containerClass = "retry";
    }
    
    if (titleElement) {
        titleElement.textContent = title;
    }
    
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    // Update the container styling based on performance
    const container = document.getElementById('resultsContainer');
    if (container) {
        container.className = container.className.replace(/\b(success|good|improvement|retry)\b/g, '');
        container.classList.add(containerClass);
    }
}

function displayAIFeedback(results) {
    const feedbackContainer = document.getElementById('aiFeedback');
    
    if (feedbackContainer && results.feedback) {
        let formattedFeedback = results.feedback
            .replace(/\[section\](.*?)\[\/section\]/g, '<h3>$1</h3>')
            .replace(/\[highlight\](.*?)\[\/highlight\]/g, '<strong class="highlight">$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        feedbackContainer.innerHTML = `
            <div class="feedback-content">
                <h2>Detailed Analysis</h2>
                <div class="feedback-text">
                    <p>${formattedFeedback}</p>
                </div>
            </div>
        `;
    }
}

function updateActionButtons(results) {
    const retakeButton = document.querySelector('.retake-btn, .retake-quiz, [data-action="retake"]');
    const remedialButton = document.querySelector('.remedial-btn, .remedial-quiz, [data-action="remedial"]');
    const nextTopicButton = document.querySelector('.next-topic-btn, .try-another, [data-action="next"]');
    
    const topic = sessionStorage.getItem('quizTopic') || 'loops';
    const baseTopic = topic.replace('-remedial', '');
    
    // Update retake button
    if (retakeButton) {
        retakeButton.onclick = () => {
            window.location.href = `/quiz/${baseTopic}`;
        };
    }
    
    // Show/hide remedial button based on performance and incorrect tags
    if (remedialButton) {
        if (results.incorrectTags && results.incorrectTags.length > 0 && !results.isRemedial) {
            remedialButton.style.display = 'inline-block';
            remedialButton.onclick = () => {
                window.location.href = `/remedial-quiz/${baseTopic}`;
            };
        } else {
            remedialButton.style.display = 'none';
        }
    }
    
    // Update next topic button
    if (nextTopicButton) {
        nextTopicButton.onclick = () => {
            window.location.href = '/';
        };
    }
}

function showErrorState() {
    const container = document.getElementById('resultsContainer');
    
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <h2>⚠️ No Quiz Results Found</h2>
                <p>We couldn't find your quiz results. This might happen if:</p>
                <ul>
                    <li>You navigated directly to this page without taking a quiz</li>
                    <li>Your session expired</li>
                    <li>There was an error submitting your quiz</li>
                </ul>
                <div class="error-actions">
                    <button onclick="window.location.href='/'" class="btn btn-primary">
                        🏠 Go Home
                    </button>
                    <button onclick="window.location.href='/quiz/loops'" class="btn btn-secondary">
                        📝 Take a Quiz
                    </button>
                </div>
            </div>
        `;
    }
}

// Function to update progress tracking when student passes
async function updateProgress(results) {
    const topic = sessionStorage.getItem('quizTopic');
    const baseTopic = topic ? topic.replace('-remedial', '') : 'unknown';
    
    try {
        const response = await fetch('/api/progress/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: baseTopic,
                progress: {
                    completed: true,
                    score: results.score,
                    passed: true,
                    completedAt: new Date().toISOString()
                }
            })
        });
        
        if (response.ok) {
            console.log('Progress updated successfully');
        }
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

// Function to check if a score is passing
function isPassing(score) {
    return (score || 0) >= 80;
}