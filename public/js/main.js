// Main JavaScript file for Campus Lost and Found

document.addEventListener('DOMContentLoaded', function () {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Form validation for all forms
    const forms = document.querySelectorAll('.needs-validation');

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });

    // Image preview for file uploads
    const fileInputs = document.querySelectorAll('input[type="file"]');

    fileInputs.forEach(input => {
        input.addEventListener('change', function () {
            const previewId = this.dataset.preview;

            if (previewId) {
                const preview = document.getElementById(previewId);

                if (preview) {
                    if (this.files && this.files[0]) {
                        const reader = new FileReader();

                        reader.onload = function (e) {
                            preview.src = e.target.result;
                            preview.style.display = 'block';
                        };

                        reader.readAsDataURL(this.files[0]);
                    } else {
                        preview.src = '';
                        preview.style.display = 'none';
                    }
                }
            }
        });
    });

    // Search functionality
    const searchForms = document.querySelectorAll('.search-form');

    searchForms.forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const searchInput = this.querySelector('input[name="query"]');
            const resultsContainer = document.getElementById(this.dataset.results);
            const url = this.dataset.url;

            if (searchInput && resultsContainer && url) {
                resultsContainer.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin"></i> Searching...</p>';

                fetch(`${url}?query=${encodeURIComponent(searchInput.value)}`)
                    .then(response => response.json())
                    .then(data => {
                        resultsContainer.innerHTML = '';

                        if (data.length === 0) {
                            resultsContainer.innerHTML = '<p class="text-center text-muted">No results found.</p>';
                            return;
                        }

                        // Check if we're displaying lost or found items
                        if (url.includes('lost-items')) {
                            displayLostItems(data, resultsContainer);
                        } else if (url.includes('found-items')) {
                            displayFoundItems(data, resultsContainer);
                        }
                    })
                    .catch(error => {
                        console.error('Error searching:', error);
                        resultsContainer.innerHTML = '<p class="text-center text-danger">Error performing search. Please try again.</p>';
                    });
            }
        });
    });

    // Display lost items in search results
    function displayLostItems(items, container) {
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card mb-3 item-card';

            card.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title">${item.item_name}</h5>
            <span class="badge bg-secondary category-badge">${item.category}</span>
          </div>
          <p class="card-text">${item.description || 'No description provided.'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Lost on: ${new Date(item.date_lost).toLocaleDateString()}</small>
            <small class="text-muted">Location: ${item.location_lost}</small>
          </div>
          <hr>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Reported by: ${item.reporter_name || 'Anonymous'}</small>
            <a href="/lost-items/${item.lost_item_id}" class="btn btn-sm btn-primary">View Details</a>
          </div>
        </div>
      `;

            container.appendChild(card);
        });
    }

    // Display found items in search results
    function displayFoundItems(items, container) {
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card mb-3 item-card';

            const imageHtml = item.image_url
                ? `<img src="${item.image_url}" class="card-img-top item-image" alt="${item.item_name}">`
                : '';

            card.innerHTML = `
        ${imageHtml}
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title">${item.item_name}</h5>
            <span class="badge bg-secondary category-badge">${item.category}</span>
          </div>
          <p class="card-text">${item.description || 'No description provided.'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Found on: ${new Date(item.date_found).toLocaleDateString()}</small>
            <small class="text-muted">Location: ${item.location_found}</small>
          </div>
          <hr>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Found by: ${item.found_by || 'Anonymous'}</small>
            <a href="/found-items/${item.found_item_id}" class="btn btn-sm btn-success">View Details</a>
          </div>
        </div>
      `;

            container.appendChild(card);
        });
    }

    // Delete confirmations
    const deleteButtons = document.querySelectorAll('.btn-delete');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
    });
}); 