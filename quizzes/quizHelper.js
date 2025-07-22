let quizDataCache = {};
let availableTopics = null;

/**
 * Discover all available quiz topics by scanning for JSON files
 * @returns {Promise<Array>} Array of available topics
 */
async function discoverAvailableTopics() {
    if (availableTopics !== null) {
        return availableTopics;
    }
    
    try {
        // Try to get a list of available quiz files from the server
        const response = await fetch('/api/quiz/topics');
        if (response.ok) {
            const data = await response.json();
            availableTopics = data.topics || [];
            console.log('Discovered topics from API:', availableTopics);
            return availableTopics;
        }
    } catch (error) {
        console.warn('Could not fetch topics from API, falling back to known topics');
    }
    
    // Fallback: try to load known quiz files
    const knownTopics = ['loops', 'functions'];
    const discoveredTopics = [];
    
    for (const topic of knownTopics) {
        try {
            const response = await fetch(`/quizzes/${topic}Quiz.json`);
            if (response.ok) {
                discoveredTopics.push(topic);
            }
        } catch (error) {
            console.warn(`Topic ${topic} not available:`, error);
        }
    }
    
    availableTopics = discoveredTopics;
    console.log('Discovered topics by probing:', availableTopics);
    return availableTopics;
}

/**
 * Load quiz data from JSON file
 * @param {string} topic - The topic to load (e.g., 'loops')
 * @returns {Promise<Object>} The loaded quiz data
 */
async function loadQuizData(topic) {
    if (quizDataCache[topic]) {
        return quizDataCache[topic];
    }
    
    try {
        const response = await fetch(`/quizzes/${topic}Quiz.json`);
        if (!response.ok) {
            throw new Error(`Failed to load ${topic} quiz data: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate the quiz data structure
        if (!validateQuizDataStructure(data, topic)) {
            throw new Error(`Invalid quiz data structure for topic: ${topic}`);
        }
        
        quizDataCache[topic] = data;
        console.log(`Loaded ${topic} quiz data:`, {
            tags: Object.keys(data.tags || {}).length,
            questions: (data.questions || []).length
        });
        
        return data;
    } catch (error) {
        console.error(`Error loading ${topic} quiz data:`, error);
        throw error;
    }
}

/**
 * Validate quiz data structure
 * @param {Object} data - The quiz data to validate
 * @param {string} topic - The topic name for error reporting
 * @returns {boolean} True if valid
 */
function validateQuizDataStructure(data, topic) {
    if (!data || typeof data !== 'object') {
        console.error(`Quiz data for ${topic} is not an object`);
        return false;
    }
    
    // Check required structure
    const requiredFields = ['tags', 'questions'];
    for (const field of requiredFields) {
        if (!data[field]) {
            console.error(`Quiz data for ${topic} missing required field: ${field}`);
            return false;
        }
    }
    
    // Validate tags
    if (typeof data.tags !== 'object') {
        console.error(`Quiz data for ${topic} has invalid tags structure`);
        return false;
    }
    
    // Validate questions
    if (!Array.isArray(data.questions)) {
        console.error(`Quiz data for ${topic} has invalid questions structure`);
        return false;
    }
    
    return true;
}

// Utility functions for quiz management

/**
 * Get a random element from an array
 * @param {Array} array - The array to pick from
 * @returns {*} A random element from the array
 */
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - The array to shuffle
 * @returns {Array} A new shuffled array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Randomize the order of answer options for a multiple choice question
 * @param {Object} question - The question object to randomize
 * @returns {Object} Question with randomized options and updated correct answer
 */
function randomizeAnswerOptions(question) {
    // Only randomize multiple choice questions
    if (question.type !== 'multiple_choice' || !question.options || !Array.isArray(question.options)) {
        return question;
    }
    
    // Create a copy of the question to avoid modifying the original
    const randomizedQuestion = { ...question };
    
    // Find the index of the correct answer in the original options
    const correctAnswerIndex = question.options.indexOf(question.answer);
    
    // Create array of options with their original indices
    const optionsWithIndices = question.options.map((option, index) => ({
        option: option,
        originalIndex: index,
        isCorrect: index === correctAnswerIndex
    }));
    
    // Shuffle the options
    const shuffledOptions = shuffleArray(optionsWithIndices);
    
    // Extract just the options in their new order
    randomizedQuestion.options = shuffledOptions.map(item => item.option);
    
    // Find the correct answer in the new shuffled array
    const correctAnswerItem = shuffledOptions.find(item => item.isCorrect);
    randomizedQuestion.answer = correctAnswerItem ? correctAnswerItem.option : question.answer;
    
    return randomizedQuestion;
}

/**
 * Generate a random quiz with questions from each tag
 * @param {string} topic - The topic to generate quiz for
 * @param {number} numQuestions - Number of questions to include (default: 10)
 * @returns {Promise<Array>} Array of selected questions
 */
export async function getRandomQuiz(topic, numQuestions = 10) {
    console.log('getRandomQuiz called with topic:', topic, 'numQuestions:', numQuestions);
    
    try {
        // Load quiz data for the topic
        const quizData = await loadQuizData(topic);
        const questionBank = quizData.questions || [];
        
        if (questionBank.length === 0) {
            console.warn(`No questions found for topic: ${topic}`);
            return [];
        }
        
        // For topics with limited questions, return what we have
        if (questionBank.length <= numQuestions) {
            const result = shuffleArray(questionBank).map(randomizeAnswerOptions);
            console.log(`Returning all ${result.length} questions for topic: ${topic}`);
            return result;
        }
        
        // Get all multiple choice questions
        const mcQuestions = questionBank.filter(q => q.type === "multiple_choice");
        // Get all code writing questions
        const codeQuestions = questionBank.filter(q => q.type === "code_writing");
        
        console.log(`Found ${mcQuestions.length} MC questions and ${codeQuestions.length} code questions`);
        
        // Get all unique tags from the questions
        const allTags = [...new Set(questionBank.flatMap(q => q.tags || []))];
        console.log('Available tags:', allTags);
        
        const selectedQuestions = [];
        
        // Try to get one question per tag
        for (const tag of allTags) {
            const tagQuestions = mcQuestions.filter(q => 
                q.tags && q.tags.includes(tag) && !selectedQuestions.includes(q)
            );
            if (tagQuestions.length > 0) {
                selectedQuestions.push(getRandomElement(tagQuestions));
            }
        }
        
        console.log(`Selected ${selectedQuestions.length} questions by tag`);
        
        // Fill remaining slots with random questions up to numQuestions
        const remainingSlots = numQuestions - selectedQuestions.length;
        if (remainingSlots > 0) {
            // Add more MC questions
            const remainingMc = mcQuestions.filter(q => !selectedQuestions.includes(q));
            const mcToAdd = Math.min(remainingSlots - 1, remainingMc.length);
            
            for (let i = 0; i < mcToAdd; i++) {
                if (remainingMc.length > 0) {
                    const randomIndex = Math.floor(Math.random() * remainingMc.length);
                    selectedQuestions.push(remainingMc[randomIndex]);
                    remainingMc.splice(randomIndex, 1);
                }
            }
            
            // Add one code writing question if space and available
            if (selectedQuestions.length < numQuestions && codeQuestions.length > 0) {
                selectedQuestions.push(getRandomElement(codeQuestions));
            }
        }
        
        // Randomize answer options for all multiple choice questions and shuffle the final selection
        const result = shuffleArray(selectedQuestions.slice(0, numQuestions)).map(randomizeAnswerOptions);
        console.log(`Final quiz has ${result.length} questions with randomized answer options`);
        return result;
        
    } catch (error) {
        console.error(`Error generating quiz for topic ${topic}:`, error);
        return [];
    }
}

/**
 * Get all questions that have a specific tag
 * @param {string} tag - The tag to filter by
 * @param {string} topic - The topic to get questions from (default: 'loops')
 * @returns {Promise<Array>} Array of questions with the specified tag
 */
export async function getQuestionsByTag(tag, topic = 'loops') {
    try {
        const quizData = await loadQuizData(topic);
        const questionBank = quizData.questions || [];
        return questionBank.filter(q => q.tags && q.tags.includes(tag));
    } catch (error) {
        console.error(`Error getting questions by tag ${tag} for topic ${topic}:`, error);
        return [];
    }
}

/**
 * Generate a remedial quiz with 1 question per incorrect tag
 * @param {Array} incorrectTags - Array of tags that need remedial work
 * @param {string} topic - The topic to generate remedial quiz for (default: 'loops')
 * @returns {Promise<Array>} Array of remedial questions
 */
export async function getRemedialQuiz(incorrectTags, topic = 'loops') {
    console.log('getRemedialQuiz called with tags:', incorrectTags, 'topic:', topic);
    
    try {
        const remedialQuestions = [];
        
        for (const tag of incorrectTags) {
            const tagQuestions = await getQuestionsByTag(tag, topic);
            if (tagQuestions.length > 0) {
                // Get one random question for this tag
                remedialQuestions.push(getRandomElement(tagQuestions));
            }
        }
        
        // Randomize answer options for all multiple choice questions and shuffle the final selection
        const result = shuffleArray(remedialQuestions).map(randomizeAnswerOptions);
        console.log(`Remedial quiz has ${result.length} questions with randomized answer options`);
        return result;
        
    } catch (error) {
        console.error(`Error generating remedial quiz for topic ${topic}:`, error);
        return [];
    }
}

/**
 * Get tag definitions for a specific topic
 * @param {string} topic - The topic to get tags for
 * @returns {Promise<Object>} Object containing tag definitions
 */
export async function getTagDefinitions(topic) {
    try {
        const quizData = await loadQuizData(topic);
        return quizData.tags || {};
    } catch (error) {
        console.error(`Error getting tag definitions for topic ${topic}:`, error);
        return {};
    }
}

/**
 * Get all available quiz topics
 * @returns {Promise<Array>} Array of available topics
 */
export async function getAvailableTopics() {
    return await discoverAvailableTopics();
}

/**
 * Validate a quiz question object
 * @param {Object} question - The question to validate
 * @returns {boolean} True if question is valid
 */
export function validateQuestion(question) {
    const requiredFields = ['question', 'type', 'tags'];
    
    // Check required fields
    for (const field of requiredFields) {
        if (!question[field]) {
            return false;
        }
    }
    
    // Check question type specific requirements
    if (question.type === 'multiple_choice') {
        return question.options && Array.isArray(question.options) && 
               question.answer && question.options.includes(question.answer);
    } else if (question.type === 'code_writing') {
        return Array.isArray(question.tags) && question.tags.length > 0;
    }
    
    return false;
}

/**
 * Get statistics about question distribution by tag
 * @param {string} topic - The topic to analyze
 * @returns {Promise<Object>} Statistics object with tag counts
 */
export async function getQuestionStats(topic) {
    try {
        const quizData = await loadQuizData(topic);
        const questions = quizData.questions || [];
        
        const stats = {};
        
        questions.forEach(question => {
            if (question.tags && Array.isArray(question.tags)) {
                question.tags.forEach(tag => {
                    stats[tag] = (stats[tag] || 0) + 1;
                });
            }
        });
        
        return {
            totalQuestions: questions.length,
            byTag: stats,
            multipleChoice: questions.filter(q => q.type === 'multiple_choice').length,
            codeWriting: questions.filter(q => q.type === 'code_writing').length
        };
        
    } catch (error) {
        console.error(`Error getting question stats for topic ${topic}:`, error);
        return {
            totalQuestions: 0,
            byTag: {},
            multipleChoice: 0,
            codeWriting: 0
        };
    }
}

/**
 * Clear the quiz data cache (useful for admin updates)
 * @param {string|null} topic - Specific topic to clear, or null to clear all
 */
export function clearQuizCache(topic = null) {
    if (topic) {
        delete quizDataCache[topic];
        console.log(`Cleared cache for topic: ${topic}`);
    } else {
        quizDataCache = {};
        availableTopics = null;
        console.log('Cleared all quiz cache');
    }
}

/**
 * Preload all available quiz data for better performance
 * @returns {Promise<Object>} Object with all loaded quiz data
 */
export async function preloadAllQuizData() {
    try {
        const topics = await getAvailableTopics();
        const loadPromises = topics.map(topic => loadQuizData(topic));
        const loadedData = await Promise.all(loadPromises);
        
        const result = {};
        topics.forEach((topic, index) => {
            result[topic] = loadedData[index];
        });
        
        console.log(`Preloaded quiz data for ${topics.length} topics:`, topics);
        return result;
        
    } catch (error) {
        console.error('Error preloading quiz data:', error);
        return {};
    }
}