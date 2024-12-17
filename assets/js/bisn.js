jQuery(document).ready(function($) {

    function createWaitlistForm(productId) {
        if (bisnAjax.isLoggedIn) {
            return `
                <div id="waitlist-form" style="margin-top: 15px;">
                    <button id="waitlist-submit">Notify Me</button>
                    <input type="hidden" name="product_id" value="${productId}" />
                </div>`;
        } else {
            return `
                <div id="waitlist-form" style="margin-top: 15px;">
                    <p>Be notified when this product is back in stock!</p>
                    <input type="email" id="waitlist-email" placeholder="Enter your email" required style="margin-right: 5px;" />
                    <button id="waitlist-submit">Notify Me</button>
                    <input type="hidden" name="product_id" value="${productId}" />
                </div>`;
        }
    }

    function handleOutOfStock($stockElement) {
        const isOutOfStock = $stockElement.hasClass('out-of-stock') || $stockElement.hasClass('no-stock');
        const $addToCartForm = $('form.cart');
        const $variationsForm = $('.variations_form');
        
        if (isOutOfStock) {
            // Handle add to cart visibility and waitlist form placement
            if ($variationsForm.length) {
                // For variable products
                const $addToCartButton = $('.single_add_to_cart_button');
                const $quantity = $('.quantity');
                
                // Hide add to cart elements
                $addToCartButton.hide();
                $quantity.hide();
                
                // Add or show waitlist form
                if (!$('#waitlist-form').length) {
                    var productID = $('[name="variation_id"]').val();
                    // Insert waitlist form before the add to cart button
                    $addToCartButton.before(createWaitlistForm(productID));
                } else {
                    $('#waitlist-form, .bisn-success-message').insertBefore($addToCartButton).show();
                }
            } else {
                // For simple products
                if ($addToCartForm.length) {
                    // If add to cart form exists, hide it and place waitlist form after it
                    $addToCartForm.hide();
                    
                    if (!$('#waitlist-form').length) {
                        var productID = $('input[name="product_id"]').val() || $('button.single_add_to_cart_button').val();
                        $addToCartForm.after(createWaitlistForm(productID));
                    } else {
                        $('#waitlist-form, .bisn-success-message').insertAfter($addToCartForm).show();
                    }
                } else {
                    // Fallback: If no add to cart form, place waitlist form after stock message
                    if (!$('#waitlist-form').length) {
                        var productID = $('input[name="product_id"]').val() || $('.product').data('product-id');
                        $stockElement.after(createWaitlistForm(productID));
                    } else {
                        $('#waitlist-form, .bisn-success-message').insertAfter($stockElement).show();
                    }
                }
            }
        } else {
            // Product is in stock
            $('#waitlist-form, .bisn-success-message').hide();
            
            // Show add to cart elements if they exist
            if ($variationsForm.length) {
                $('.single_add_to_cart_button, .quantity').show();
            } else if ($addToCartForm.length) {
                $addToCartForm.show();
            }
        }
    }

    // Initialize for both simple and variable products
    function initializeWaitlist() {
        const $stockElement = $('.stock');
        
        if ($stockElement.length) {
            // Set up mutation observer for stock element changes
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        handleOutOfStock($(mutation.target));
                    } else if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        handleOutOfStock($(mutation.target).closest('.stock'));
                    }
                });
            });

            observer.observe($stockElement[0], {
                attributes: true,
                attributeFilter: ['class'],
                childList: true,
                characterData: true,
                subtree: true
            });

            // Handle initial state
            handleOutOfStock($stockElement);

            // For variable products, listen for variation changes
            if ($('.variations_form').length) {
                $('.variations_form')
                    .on('found_variation', function() {
                        handleOutOfStock($stockElement);
                    })
                    .on('reset_data', function() {
                        handleOutOfStock($stockElement);
                    });
            }
        }
    }

    // Initialize after dynamic-variation-price.js has run
    $(document).on('wc_variation_price_initialized', function() {
        initializeWaitlist();
    });

    // Trigger custom event at the end of dynamic-variation-price.js initialization
    const originalInitElements = window.initializeElements;
    if (typeof originalInitElements === 'function') {
        window.initializeElements = function() {
            originalInitElements.apply(this, arguments);
            $(document).trigger('wc_variation_price_initialized');
        };
    } else {
        // Fallback if dynamic-variation-price.js hasn't loaded yet
        $(window).on('load', initializeWaitlist);
    }

    // Form submission
    $(document).on('click', '#waitlist-submit', function(e) {
        e.preventDefault();

        var productID;
        var email = '';
        
        // For variable products
        if ($('[name="variation_id"]').length) {
            productID = $('[name="variation_id"]').val();
        }
        // For simple products or fallback
        if (!productID) {
            productID = $('input[name="product_id"]').val() || $('button.single_add_to_cart_button').val();
        }

        // Only get email if user is not logged in
        if (!bisnAjax.isLoggedIn) {
            email = $('#waitlist-email').val();
            if (!email) {
                alert('Please enter a valid email.');
                return;
            }
        }

        $.post(bisnAjax.ajaxurl, {
            action: 'bisn_add_to_waitlist',
            product_id: productID,
            email: email,
            security: bisnAjax.nonce
        }, function(response) {
            if (response.success) {
                $('#waitlist-form').replaceWith(
                    `<p class="bisn-success-message" style="color: green;">${response.data.message}</p>`
                );
            } else {
                alert(response.data.message);
            }
        });
    });
});
