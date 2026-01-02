// Category Page Logic
// Relies on productsData from main.js

document.addEventListener('DOMContentLoaded', () => {
    const categoryGrid = document.getElementById('categoryProducts');

    // Only run if we are on a category page with this grid
    if (!categoryGrid) return;

    // 1. Determine Category from URL (Robust Check)
    const currentUrl = window.location.href.toLowerCase();
    let currentCategory = '';

    const categories = ['dresses', 'casual', 'corporate', 'shoes', 'wigs', 'makeup', 'weekend'];

    // Find which category keyword is in the URL
    for (const cat of categories) {
        if (currentUrl.includes(cat)) {
            currentCategory = cat;
            break;
        }
    }

    if (!currentCategory) {
        console.warn('Could not determine category from URL:', currentUrl);
        return;
    }

    console.log(`Current Category Detected: ${currentCategory}`);

    // 2. Filter Products from Global Data
    if (typeof productsData === 'undefined') {
        console.error('Error: productsData not found. Ensure main.js is loaded first.');
        return;
    }

    // Filter items that match the category
    const filteredItems = productsData.filter(item => item.category === currentCategory);

    // 3. Render Grid
    // 3. Render Grid with Mixing
    const renderCategory = (items) => {
        categoryGrid.innerHTML = '';

        if (items.length > 0) {
            // Apply Mixing if window.mixContent is available, otherwise just items
            const contentToRender = window.mixContent && window.socialVideos
                ? window.mixContent(items, window.socialVideos)
                : items;

            if (window.renderProductGrid) {
                window.renderProductGrid(categoryGrid, contentToRender);
            } else {
                console.warn('renderProductGrid not found, using basic render');
                // Fallback (redundant if main.js is loaded, but safe)
            }

            // Update results count
            const countEl = document.querySelector('.results-count');
            if (countEl) {
                countEl.textContent = `Showing ${items.length} products`;
            }
        } else {
            categoryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No products found in this category.</p>';
        }
    };

    renderCategory(filteredItems);
});
