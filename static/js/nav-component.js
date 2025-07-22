class NavigationComponent {
    constructor() {
        this.menuToggle = null;
        this.sideMenu = null;
        this.menuOverlay = null;
        this.mainContent = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.menuToggle = document.getElementById('menuToggle');
        this.sideMenu = document.getElementById('sideMenu');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.mainContent = document.querySelector('.container') || document.querySelector('.main-content');

        if (!this.menuToggle || !this.sideMenu) {
            console.warn('Navigation component elements not found');
            return;
        }

        // Ensure menu starts open
        this.openMenu();

        // Toggle menu on button click
        this.menuToggle.addEventListener('click', () => this.toggleMenu());
        
        // Close menu when clicking overlay (mobile only)
        if (this.menuOverlay) {
            this.menuOverlay.addEventListener('click', () => this.closeMenu());
        }
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen()) {
                this.closeMenu();
            }
        });

        // Adjust main content based on screen size
        this.adjustMainContent();
        window.addEventListener('resize', () => this.adjustMainContent());
    }

    toggleMenu() {
        if (this.isMenuOpen()) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        // Start both animations simultaneously
        this.sideMenu.classList.add('open');
        this.sideMenu.classList.remove('collapsed');
        this.menuToggle.classList.add('menu-attached');
        this.menuToggle.classList.remove('menu-detached');
        
        // Change icon after movement is well underway
        setTimeout(() => {
            this.menuToggle.innerHTML = '×';
        }, 200);
        
        // Adjust main content for desktop
        this.adjustMainContent();
        
        // Show overlay on mobile
        if (window.innerWidth <= 768 && this.menuOverlay) {
            this.menuOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeMenu() {
        // Change icon first
        this.menuToggle.innerHTML = '☰';
        
        // Start both closing animations simultaneously 
        this.menuToggle.classList.remove('menu-attached');
        this.menuToggle.classList.add('menu-detached');
        this.sideMenu.classList.remove('open');
        this.sideMenu.classList.add('collapsed');
        
        // Remove main content margin
        if (this.mainContent) {
            this.mainContent.classList.remove('menu-open');
        }
        
        // Hide overlay
        if (this.menuOverlay) {
            this.menuOverlay.classList.remove('show');
        }
        document.body.style.overflow = '';
    }

    isMenuOpen() {
        return this.sideMenu.classList.contains('open');
    }

    adjustMainContent() {
        if (!this.mainContent) return;
        
        // Only adjust margin on desktop when menu is open
        if (window.innerWidth > 768 && this.isMenuOpen()) {
            this.mainContent.classList.add('menu-open');
        } else {
            this.mainContent.classList.remove('menu-open');
        }
    }

    // Method to populate tag navigation on results page
    populateTagNavigation(incorrectTags, tagDefinitions) {
        const tagNavigation = document.getElementById('tag-navigation');
        if (!tagNavigation || !incorrectTags || incorrectTags.length === 0) {
            return;
        }

        // Clear existing tag items
        const existingTagItems = tagNavigation.querySelectorAll('.tag-item');
        existingTagItems.forEach(item => item.remove());

        // Add tag items
        incorrectTags.forEach(tag => {
            const tagItem = document.createElement('a');
            tagItem.className = 'tag-item';
            tagItem.dataset.topic = tag;
            tagItem.innerHTML = `📚 ${tagDefinitions[tag] || tag}`;
            tagItem.href = '#';
            tagItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTag(tag);
            });
            tagNavigation.appendChild(tagItem);
        });

        // Show tag navigation
        tagNavigation.style.display = 'block';
    }

    selectTag(tag) {
        // Remove active class from all tag items
        document.querySelectorAll('.tag-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected tag
        const selectedItem = document.querySelector(`[data-topic="${tag}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        // Call the global function to select the topic tab
        if (window.selectTopicTab) {
            window.selectTopicTab(tag);
        }

        // Trigger custom event for tag selection
        const event = new CustomEvent('tagSelected', { detail: { tag } });
        document.dispatchEvent(event);
    }
}

// Initialize navigation component when script loads
const navigation = new NavigationComponent();

// Expose navigation globally so results page can use it
window.navigation = navigation;