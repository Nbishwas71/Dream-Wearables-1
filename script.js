document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const watchGrid = document.getElementById('watch-grid');
    const packingGrid = document.getElementById('packing-grid');
    const faqList = document.getElementById('faq-list');
    const brandFilterEl = document.getElementById('filter-brand');
    const colorFilterEl = document.getElementById('filter-color');
    const genderFilterEl = document.getElementById('filter-gender');
    const priceFilterEl = document.getElementById('filter-price');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const lightbox = document.getElementById('media-lightbox');
    const lightboxMediaContainer = lightbox?.querySelector('.lightbox-media-container');
    const lightboxCloseBtn = lightbox?.querySelector('.close-btn');
    const currentYearEl = document.getElementById('current-year');

    // --- State Variables ---
    let allWatches = [];
    let allPackingOptions = [];
    let allFaqs = [];
    let siteConfig = {};
    let activeSwipers = {}; // Track Swiper instances

    // --- Initialization ---
    async function initializeApp() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            allWatches = data.watches || [];
            allPackingOptions = data.packing || [];
            allFaqs = data.faq || [];
            siteConfig = data.config || {};

            populateFilters(allWatches);
            renderWatches(allWatches);
            renderPackingOptions(allPackingOptions);
            renderFaqs(allFaqs);
            setupEventListeners();
            updateCurrentYear();

        } catch (error) {
            console.error('Error initializing app:', error);
            displayErrorMessage(watchGrid, "Could not load watch data. Please try again later.");
            displayErrorMessage(packingGrid, "Could not load packing data.");
            displayErrorMessage(faqList, "Could not load FAQ data.");
            // Optionally hide filters if data fails
             const filtersSection = document.querySelector('.filters');
             if(filtersSection) filtersSection.style.display = 'none';
        }
    }

    // --- Rendering Functions ---

    function renderWatches(watchesToRender) {
        if (!watchGrid) return;
        watchGrid.innerHTML = ''; // Clear previous content
        destroySwipers(); // Clean up old Swiper instances

        if (watchesToRender.length === 0) {
            watchGrid.innerHTML = '<p class="no-results">No watches match your criteria.</p>';
            return;
        }

        watchesToRender.forEach(watch => {
            const card = document.createElement('div');
            card.className = 'watch-card';
            card.dataset.id = watch.id;
            // Add data attribute for offers to help with CSS styling if needed
            if (watch.offers && watch.offers.length > 0) {
                card.dataset.offers = watch.offers.join(' ');
            }

            const swiperContainerId = `swiper-${watch.id}-${Date.now()}`;

            // Price formatting
            const formatPrice = (price) => price ? `₹${price.toLocaleString('en-IN')}` : '';
            const currentPrice = watch.discountedPrice ?? watch.price;
            const originalPriceHTML = (watch.discountedPrice && watch.discountedPrice < watch.price)
                ? `<span class="original-price">${formatPrice(watch.price)}</span>`
                : '';

            // Offer Badges HTML
            let offersHTML = '';
            if (watch.offers && watch.offers.length > 0) {
                watch.offers.forEach(offer => {
                    // Use specific classes for easier styling
                    if (offer.toLowerCase() === 'new') {
                        offersHTML += '<div class="offer-badge new-badge">New</div>';
                    } else if (offer.toLowerCase() === 'popular') {
                        offersHTML += '<div class="offer-badge popular-badge">Popular</div>';
                    } else { // Generic badge for other offers
                         offersHTML += `<div class="offer-badge">${offer}</div>`;
                    }
                });
            }


            // Swiper Slides HTML (Images and Video Thumbnails)
            let slidesHTML = '';
            if (watch.media && watch.media.length > 0) {
                watch.media.forEach((mediaItem, index) => {
                    if (mediaItem.type === 'image') {
                        slidesHTML += `
                            <div class="swiper-slide media-item" data-type="image" data-url="${mediaItem.url}">
                                <img src="${mediaItem.url}" alt="${watch.title} - ${watch.brand}">
                            </div>`;
                    } else if (mediaItem.type === 'video') {
                        slidesHTML += `
                            <div class="swiper-slide media-item video-thumbnail" data-type="video" data-url="${mediaItem.url}">
                                <video muted loop playsinline preload="metadata">
                                    <source src="${mediaItem.url}" type="video/mp4">
                                </video>
                                <i class="fa-solid fa-play video-play-icon"></i>
                            </div>`;
                    }
                });
            } else {
                slidesHTML = `<div class="swiper-slide"><img src="images/placeholder.jpg" alt="Placeholder"></div>`; // Fallback
            }

            card.innerHTML = `
                ${offersHTML}
                <div class="media-container">
                    <div class="swiper-container" id="${swiperContainerId}">
                        <div class="swiper-wrapper">
                            ${slidesHTML}
                        </div>
                        ${watch.media && watch.media.length > 1 ? `
                            <div class="swiper-button-next"></div>
                            <div class="swiper-button-prev"></div>
                        ` : ''}
                        <!-- Optional: Add Pagination -->
                        <!-- <div class="swiper-pagination"></div> -->
                    </div>
                </div>
                <div class="card-content">
                    <div class="watch-brand">${watch.brand}</div>
                    <h3 class="watch-title">${watch.title}</h3>
                    <div class="watch-id">ID: ${watch.id}</div>
                    <div class="price-info">
                        <span class="price">
                            <span class="discounted-price">${formatPrice(currentPrice)}</span>
                            ${originalPriceHTML}
                        </span>
                    </div>
                     <button class="btn whatsapp-btn" data-watch-id="${watch.id}" data-watch-title="${watch.title}">
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp Inquiry
                    </button>
                </div>
            `;
            watchGrid.appendChild(card);

            // Initialize Swiper for this card
            if (watch.media && watch.media.length > 0) {
                 try {
                    const swiperInstance = new Swiper(`#${swiperContainerId}`, {
                        loop: watch.media.length > 1, // Loop only if multiple items
                        navigation: {
                            nextEl: `#${swiperContainerId} .swiper-button-next`,
                            prevEl: `#${swiperContainerId} .swiper-button-prev`,
                        },
                         // Attempt to play videos when they become visible (might need intersection observer for reliability)
                        on: {
                            slideChangeTransitionEnd: function () {
                                // Pause all videos in this swiper
                                const videos = this.el.querySelectorAll('video');
                                videos.forEach(v => v.pause());
                                // Play video in active slide if it exists
                                const activeSlideVideo = this.slides[this.activeIndex]?.querySelector('video');
                                activeSlideVideo?.play().catch(()=>{}); // Muted autoplay usually allowed
                            },
                            init: function() {
                                // Play video in initial active slide if it exists
                                const initialVideo = this.slides[this.activeIndex]?.querySelector('video');
                                initialVideo?.play().catch(()=>{});
                            }
                        }
                    });
                    activeSwipers[swiperContainerId] = swiperInstance;
                 } catch (e) {
                     console.error(`Failed to initialize Swiper for ${swiperContainerId}:`, e);
                 }
            }
        });
    }

    function destroySwipers() {
        Object.values(activeSwipers).forEach(swiper => {
            if (swiper && typeof swiper.destroy === 'function') {
                swiper.destroy(true, true);
            }
        });
        activeSwipers = {};
    }

    function renderPackingOptions(packingOptions) {
        if (!packingGrid) return;
        packingGrid.innerHTML = '';
        if (!packingOptions || packingOptions.length === 0) {
            packingGrid.innerHTML = '<p class="no-results">No packing options available.</p>'; return;
        }
        packingOptions.forEach(option => {
            const card = document.createElement('div');
            card.className = 'packing-card';
            card.innerHTML = `
                <img src="${option.image || 'images/placeholder.jpg'}" alt="${option.name}">
                <h3>${option.name}</h3>
                 <p><strong>Charges: ${option.price}</strong></p>
                <p>${option.description}</p>
            `;
            packingGrid.appendChild(card);
        });
    }

     function renderFaqs(faqs) {
        if (!faqList) return;
        faqList.innerHTML = '';
         if (!faqs || faqs.length === 0) {
            faqList.innerHTML = '<p class="no-results">No frequently asked questions available.</p>'; return;
        }
        faqs.forEach(faq => {
            // Use <details> for native accordion behavior
            const detail = document.createElement('details');
            detail.className = 'faq-item'; // Add class if needed
            detail.innerHTML = `
                <summary class="faq-question">${faq.question}</summary>
                <div class="faq-answer">
                    <p>${faq.answer}</p>
                </div>
            `;
            faqList.appendChild(detail);
        });
    }

     function displayErrorMessage(container, message) {
        if (container) {
            container.innerHTML = `<p class="error-message">${message}</p>`;
        }
    }

    // --- Filter Logic ---

    function populateFilters(watches) {
        if (!brandFilterEl || !colorFilterEl || !genderFilterEl) return;

        const brands = [...new Set(watches.map(w => w.brand))].sort();
        // Use flatMap to get all colors from the arrays, then Set for uniqueness
        const colors = [...new Set(watches.flatMap(w => w.colors || []))].sort();
        // Genders could be predefined or extracted like brands/colors
        // const genders = [...new Set(watches.map(w => w.gender))].sort();

        populateSelect(brandFilterEl, brands);
        populateSelect(colorFilterEl, colors);
        // populateSelect(genderFilterEl, genders); // Assuming static gender options in HTML are okay
    }

    function populateSelect(selectElement, options) {
        // Keep the first 'All' option
        const firstOption = selectElement.options[0];
        selectElement.innerHTML = ''; // Clear existing options
        if (firstOption) {
            selectElement.appendChild(firstOption); // Add back the 'All' option
        }

        options.forEach(optionValue => {
            const opt = document.createElement('option');
            opt.value = optionValue; // Use the value itself
            opt.textContent = optionValue; // Display the value
            selectElement.appendChild(opt);
        });
    }

    function applyFiltersAndSort() {
        let filteredWatches = [...allWatches];

        const selectedBrand = brandFilterEl.value;
        const selectedColor = colorFilterEl.value;
        const selectedGender = genderFilterEl.value;
        const sortOrder = priceFilterEl.value;

        // Apply filters
        if (selectedBrand) {
            filteredWatches = filteredWatches.filter(w => w.brand === selectedBrand);
        }
        if (selectedColor) {
            // Check if the watch's colors array includes the selected color
            filteredWatches = filteredWatches.filter(w => w.colors && w.colors.includes(selectedColor));
        }
         if (selectedGender) {
            filteredWatches = filteredWatches.filter(w => w.gender === selectedGender);
        }

        // Apply sorting
        const getSortPrice = (watch) => watch.discountedPrice ?? watch.price;
        if (sortOrder === 'low') {
            filteredWatches.sort((a, b) => getSortPrice(a) - getSortPrice(b));
        } else if (sortOrder === 'high') {
            filteredWatches.sort((a, b) => getSortPrice(b) - getSortPrice(a));
        }
        // 'default' or "" order is the original fetched order

        renderWatches(filteredWatches);
    }

    // --- Lightbox Logic ---

    function openLightbox(elementType, elementUrl) {
        if (!lightbox || !lightboxMediaContainer) return;

        let mediaHTML = '';
        if (elementType === 'image') {
            mediaHTML = `<img src="${elementUrl}" alt="Lightbox Image">`;
        } else if (elementType === 'video') {
            mediaHTML = `
                <video controls autoplay preload="metadata">
                    <source src="${elementUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
        }

        lightboxMediaContainer.innerHTML = mediaHTML;
        lightbox.classList.add('active');
    }

    function closeLightbox() {
        if (!lightbox || !lightboxMediaContainer) return;
        lightbox.classList.remove('active');
        lightboxMediaContainer.innerHTML = ''; // Clear content to stop video/remove image
    }

    // --- Event Listeners Setup ---

    function setupEventListeners() {
        // Filter listeners
        [brandFilterEl, colorFilterEl, genderFilterEl, priceFilterEl].forEach(filter => {
            filter?.addEventListener('change', applyFiltersAndSort);
        });

        // Reset button listener
        resetFiltersBtn?.addEventListener('click', () => {
            brandFilterEl.value = '';
            colorFilterEl.value = '';
            genderFilterEl.value = '';
            priceFilterEl.value = '';
            applyFiltersAndSort(); // Re-apply default filters/sort
        });

        // Lightbox listeners (using event delegation on the watch grid)
        watchGrid?.addEventListener('click', (event) => {
            const mediaItem = event.target.closest('.media-item'); // Click might be on img/video/icon inside
            if (mediaItem) {
                const type = mediaItem.dataset.type;
                const url = mediaItem.dataset.url;
                if (type && url) {
                    openLightbox(type, url);
                }
            }
        });

        lightboxCloseBtn?.addEventListener('click', closeLightbox);
        lightbox?.addEventListener('click', (event) => {
            // Close if clicking the background overlay, not the content inside
            if (event.target === lightbox) {
                closeLightbox();
            }
        });
         // Close lightbox with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === "Escape" && lightbox?.classList.contains('active')) {
                closeLightbox();
            }
        });


        // WhatsApp Button Listener (using event delegation)
        document.body.addEventListener('click', (event) => {
            const whatsappButton = event.target.closest('.whatsapp-btn');
            if (whatsappButton) {
                const watchId = whatsappButton.dataset.watchId;
                const watchTitle = whatsappButton.dataset.watchTitle;
                const phoneNumber = siteConfig.whatsappNumber;

                if (watchId && phoneNumber) {
                    const message = `Hello! I'm interested in the ${watchTitle} (ID: ${watchId}). Could you please provide more details?`;
                    // Basic check if it looks like an international number already
                    const numberPrefix = phoneNumber.startsWith('+') || phoneNumber.length > 10 ? '' : '91'; // Assuming India prefix if short, adjust if needed
                    const whatsappUrl = `https://wa.me/${numberPrefix}${phoneNumber}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                } else {
                    console.error("Missing watch ID or WhatsApp number in config.");
                    alert("Sorry, cannot initiate WhatsApp inquiry. Configuration missing.");
                }
            }
        });

        // FAQ Accordion (already handled by <details> element)
        // If you wanted custom JS accordion:
        // faqList?.addEventListener('click', (event) => {
        //     const question = event.target.closest('.faq-question');
        //     if (question) {
        //         const answer = question.nextElementSibling;
        //         const parentItem = question.closest('.faq-item'); // or details
        //         parentItem?.classList.toggle('active'); // Toggle class on parent
        //         // Optional: Close others
        //     }
        // });
    }

    // --- Utility Functions ---
    function updateCurrentYear() {
        if (currentYearEl) {
            currentYearEl.textContent = new Date().getFullYear();
        }
    }

    // --- Run the App ---
    initializeApp();

}); // End DOMContentLoaded