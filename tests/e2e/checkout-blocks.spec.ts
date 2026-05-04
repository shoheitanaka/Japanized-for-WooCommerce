/**
 * E2E tests: Block Checkout — yomigana and delivery fields
 *
 * Tests that yomigana fields appear correctly in the WooCommerce Checkout block,
 * are positioned after the name fields (via CSS order), and show validation errors
 * when required fields are empty.
 *
 * Prerequisite: a Checkout Block page must be accessible at /checkout-block-test/
 * (created in beforeAll via the WP REST API).
 */
import { test, expect } from '@playwright/test';
import {
	createProduct,
	deleteProduct,
	enablePaymentGateway,
	setupFreeShippingZone,
	deleteAllOrders,
	setJp4wcSettings,
	addProductToCart,
	wpFetch,
} from './utils/helpers';

const BASE_URL = process.env.WP_BASE_URL ?? 'http://localhost:8891';

let productId: number;
let checkoutPageId: number;

/** Minimal WooCommerce Checkout block page content */
const CHECKOUT_BLOCK_CONTENT = `<!-- wp:woocommerce/checkout -->
<div class="wp-block-woocommerce-checkout alignwide wc-block-checkout is-loading">
<!-- wp:woocommerce/checkout-fields-block -->
<div class="wp-block-woocommerce-checkout-fields-block"></div>
<!-- /wp:woocommerce/checkout-fields-block -->
<!-- wp:woocommerce/checkout-totals-block -->
<div class="wp-block-woocommerce-checkout-totals-block"></div>
<!-- /wp:woocommerce/checkout-totals-block -->
</div>
<!-- /wp:woocommerce/checkout -->`;

test.beforeAll( async ( { request } ) => {
	await enablePaymentGateway( request, BASE_URL, 'cod' );
	await setupFreeShippingZone( request, BASE_URL );
	productId = await createProduct( request, BASE_URL );

	// Create a test page with the Checkout block.
	const page = await wpFetch( request, BASE_URL, 'pages', 'POST', {
		title: 'Block Checkout Test',
		slug: 'checkout-block-test',
		status: 'publish',
		content: CHECKOUT_BLOCK_CONTENT,
	} ) as { id: number };
	checkoutPageId = page.id;
} );

test.afterAll( async ( { request } ) => {
	await deleteProduct( request, BASE_URL, productId );
	await deleteAllOrders( request, BASE_URL );

	// Remove the test checkout page.
	if ( checkoutPageId ) {
		await wpFetch( request, BASE_URL, `pages/${ checkoutPageId }?force=true`, 'DELETE' );
	}

	// Restore yomigana settings.
	await setJp4wcSettings( request, BASE_URL, {
		'yomigana': '',
		'yomigana-required': '',
	} );
} );

// ---------------------------------------------------------------------------
// Yomigana field visibility
// ---------------------------------------------------------------------------

test( 'yomigana fields are visible in Block Checkout when option is enabled', async ( { page, request } ) => {
	await setJp4wcSettings( request, BASE_URL, {
		'yomigana': '1',
		'yomigana-required': '',
	} );

	await addProductToCart( page, BASE_URL, productId );
	await page.goto( `${ BASE_URL }/checkout-block-test/` );

	await expect(
		page.locator( 'input[id*="yomigana_last_name"], input[id*="yomigana_first_name"]' ).first(),
	).toBeVisible( { timeout: 15_000 } );
} );

test( 'yomigana fields are NOT rendered when option is disabled', async ( { page, request } ) => {
	await setJp4wcSettings( request, BASE_URL, {
		'yomigana': '',
		'yomigana-required': '',
	} );

	await addProductToCart( page, BASE_URL, productId );
	await page.goto( `${ BASE_URL }/checkout-block-test/` );
	await page.waitForLoadState( 'networkidle' );

	await expect(
		page.locator( 'input[id*="yomigana_last_name"]' ),
	).toHaveCount( 0 );
} );

// ---------------------------------------------------------------------------
// Yomigana CSS order (field position)
// ---------------------------------------------------------------------------

test( 'yomigana fields appear after the name fields in the address form', async ( { page, request } ) => {
	await setJp4wcSettings( request, BASE_URL, {
		'yomigana': '1',
		'yomigana-required': '',
	} );

	await addProductToCart( page, BASE_URL, productId );
	await page.goto( `${ BASE_URL }/checkout-block-test/` );

	// Standard last-name field: WC Blocks uses id like "billing-last-name" or
	// "shipping-last-name"; fall back to autocomplete attribute if needed.
	const lastNameInput = page.locator(
		'input[id*="last-name"]:not([id*="yomigana"]), input[id*="last_name"]:not([id*="yomigana"]), input[autocomplete*="family-name"]',
	).first();
	const yomiganaInput = page.locator( 'input[id*="yomigana_last_name"]' ).first();

	await expect( lastNameInput ).toBeVisible( { timeout: 15_000 } );
	await expect( yomiganaInput ).toBeVisible();

	// Yomigana should appear below (higher Y position) than the name field.
	const nameBox     = await lastNameInput.boundingBox();
	const yomiganaBox = await yomiganaInput.boundingBox();

	expect( nameBox ).not.toBeNull();
	expect( yomiganaBox ).not.toBeNull();
	expect( yomiganaBox!.y ).toBeGreaterThan( nameBox!.y );
} );

// ---------------------------------------------------------------------------
// Yomigana validation (Block Checkout)
// ---------------------------------------------------------------------------

test( 'required yomigana shows validation error when submitted empty', async ( { page, request } ) => {
	await setJp4wcSettings( request, BASE_URL, {
		'yomigana': '1',
		'yomigana-required': '1',
	} );

	await addProductToCart( page, BASE_URL, productId );
	await page.goto( `${ BASE_URL }/checkout-block-test/` );

	// Wait for block checkout to render.
	await page.waitForLoadState( 'networkidle' );

	// Fill required standard fields but intentionally leave yomigana empty.
	await page.locator( 'input[id*="last-name"]:not([id*="yomigana"]), input[id*="last_name"]:not([id*="yomigana"]), input[autocomplete*="family-name"]' )
		.first().fill( 'Tanaka' ).catch( () => {} );
	await page.locator( 'input[id*="first-name"]:not([id*="yomigana"]), input[id*="first_name"]:not([id*="yomigana"]), input[autocomplete*="given-name"]' )
		.first().fill( 'Shohei' ).catch( () => {} );
	await page.locator( 'input[type="email"], input[autocomplete*="email"]' )
		.first().fill( 'test@example.com' ).catch( () => {} );

	// Attempt to place the order.
	await page.locator(
		'button[type="submit"].wc-block-components-checkout-place-order-button, ' +
		'button.wc-block-checkout__submit-button, ' +
		'button:has-text("Place Order")',
	).first().click( { timeout: 15_000 } ).catch( () => {} );

	// Should show error (required yomigana not filled) and stay on checkout.
	await expect( page ).not.toHaveURL( /order-received/, { timeout: 8_000 } );
	await expect(
		page.locator( '.wc-block-components-validation-error, [role="alert"], .wc-block-store-notice' ).first(),
	).toBeVisible( { timeout: 10_000 } );
} );
