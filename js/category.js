// Category Page Logic
// Relies on productsData from main.js

document.addEventListener('DOMContentLoaded', () => {
    const categoryGrid = document.getElementById('categoryProducts');
    if (!categoryGrid) return;

    // 1. Determine Category from URL
    const currentUrl = window.location.href.toLowerCase();
    let currentCategory = '';
    const categories = ['dresses', 'casual', 'corporate', 'shoes', 'wigs', 'makeup', 'weekend', 'beauty'];

    for (const cat of categories) {
        if (currentUrl.includes(cat)) {
            currentCategory = cat;
            break;
        }
    }

    if (!currentCategory) {
        console.warn('Could not determine category from URL');
        return;
    }

    // 2. Render Function
    const renderItems = (data) => {
        const filtered = data.filter(item => item.category === currentCategory);
        categoryGrid.innerHTML = '';

        if (filtered.length > 0) {
            const contentToRender = window.mixContent && window.socialVideos
                ? window.mixContent(filtered, window.socialVideos)
                : filtered;

            if (window.renderProductGrid) {
                window.renderProductGrid(categoryGrid, contentToRender);
            }

            const countEl = document.querySelector('.results-count');
            if (countEl) {
                countEl.textContent = `Showing ${filtered.length} products`;
            }
        } else {
            categoryGrid.innerHTML = '<p class="no-results">No products found in this category.</p>';
            const countEl = document.querySelector('.results-count');
            if (countEl) countEl.textContent = '0 products found';
        }
    };

    // 3. Initial or Event-driven Load
    if (window.productsData && window.productsData.length > 0) {
        renderItems(window.productsData);
    }
});

document.addEventListener('productsLoaded', (e) => {
    // We need to re-select the grid if it wasn't available during initial load
    const categoryGrid = document.getElementById('categoryProducts');
    if (categoryGrid) {
        const currentUrl = window.location.href.toLowerCase();
        let currentCategory = '';
        const categories = ['dresses', 'casual', 'corporate', 'shoes', 'wigs', 'makeup', 'weekend', 'beauty'];

        for (const cat of categories) {
            if (currentUrl.includes(cat)) {
                currentCategory = cat;
                break;
            }
        }

        if (currentCategory) {
            const filtered = e.detail.filter(item => item.category === currentCategory);
            categoryGrid.innerHTML = '';

            if (filtered.length > 0) {
                const contentToRender = window.mixContent && window.socialVideos
                    ? window.mixContent(filtered, window.socialVideos)
                    : filtered;

                if (window.renderProductGrid) {
                    window.renderProductGrid(categoryGrid, contentToRender);
                }

                const countEl = document.querySelector('.results-count');
                if (countEl) countEl.textContent = `Showing ${filtered.length} products`;
            } else {
                categoryGrid.innerHTML = '<p class="no-results">No products found in this category.</p>';
                const countEl = document.querySelector('.results-count');
                if (countEl) countEl.textContent = '0 products found';
            }
        }
    }
});
