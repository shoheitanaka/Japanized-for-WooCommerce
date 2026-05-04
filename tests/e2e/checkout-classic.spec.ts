/**
 * E2E tests: Classic Checkout (shortcode) flow
 *
 * Covers the core bug regression (#166): after a successful payment,
 * the browser must redirect to the Thank You page — not spin forever.
 *
 * Payment method: COD (no external credentials required)
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
	fillClassicCheckoutBilling,
	placeClassicOrder,
	wpFetch,
} from './utils/helpers';

const BASE_URL = process.env.WP_BASE_URL ?? 'http://localhost:8891';

/** Minimal Classic Checkout page content */
const CLASSIC_CHECKOUT_CONTENT = `<!-- wp:shortcode -->[woocommerce_checkout]<!-- /wp:shortcode -->`;

let productId: number;
let classicCheckoutPageId: number;
let classicCheckoutUrl: string;

test.beforeAll( async ( { request } ) => {
	await enablePaymentGateway( request, BASE_URL, 'cod' );
	await setupFreeShippingZone( request, BASE_URL );
	productId = await createProduct( request, BASE_URL );

	// Create a test page with the Classic Checkout shortcode.
	const page = await wpFetch( request, BASE_URL, 'pages', 'POST', {
		title: 'Classic Checkout Test',
		slug: 'classic-checkout-test',
		status: 'publish',
		content: CLASSIC_CHECKOUT_CONTENT,
	} ) as { id: number; link: string };
	classicCheckoutPageId = page.id;
	classicCheckoutUrl    = page.link;

	// Ensure delivery date/time is disabled so it does not interfere.
	await setJp4wcSettings( request, BASE_URL, {
		'delivery-date': '',
		'delivery-date-required': '',
		'delivery-time-zone': '',
		'delivery-time-zone-required': '',
	} );
} );

test.afterAll( async ( { request } ) => {
	await deleteProduct( request, BASE_URL, productId );
	await deleteAllOrders( request, BASE_URL );

	if ( classicCheckoutPageId ) {
		await wpFetch( request, BASE_URL, `pages/${ classicCheckoutPageId }?force=true`, 'DELETE' );
	}
} );

// ---------------------------------------------------------------------------
// Bug regression: #166
// ---------------------------------------------------------------------------

test( 'COD payment redirects to Thank You page (regression #166)', async ( { page } ) => {
	await addProductToCart( page, BASE_URL, productId );
	await page.goto( classicCheckoutUrl );
	await page.waitForLoadState( 'domcontentloaded' );

	await page.selectOption( '#billing_country', 'JP' ).catch( () => {} );
	await page.waitForLoadState( 'networkidle' ); // Wait for AJAX to update JP address fields.
	await fillClassicCheckoutBilling( page );
	await page.check( 'input[name="payment_method"][value="cod"]' );

	const orderUrl = await placeClassicOrder( page );

	// placeClassicOrder already asserts redirect to order-received URL.
	expect( orderUrl ).toMatch( /order-received/ );
} );

test( 'Thank You page shows order number', async ( { page } ) => {
	await addProductToCart( page, BASE_URL, productId );
	await page.goto( classicCheckoutUrl );
	await page.waitForLoadState( 'domcontentloaded' );

	await page.selectOption( '#billing_country', 'JP' ).catch( () => {} );
	await page.waitForLoadState( 'networkidle' );
	await fillClassicCheckoutBilling( page );
	await page.check( 'input[name="payment_method"][value="cod"]' );

	await placeClassicOrder( page );

	await expect(
		page.locator( '.woocommerce-order-overview__order strong, .wc-bacs-bank-details-account-number' ).first(),
	).toBeTruthy();
} );

// ---------------------------------------------------------------------------
// Delivery date disabled — must not block checkout
// ---------------------------------------------------------------------------

test( 'checkout succeeds when delivery date option is disabled', async ( { page, request } ) => {
	await setJp4wcSettings( request, BASE_URL, {
		'delivery-date': '',
		'delivery-date-required': '1',
	} );

	await addProductToCart( page, BASE_URL, productId );
	await page.goto( classicCheckoutUrl );
	await page.waitForLoadState( 'domcontentloaded' );

	await page.selectOption( '#billing_country', 'JP' ).catch( () => {} );
	await page.waitForLoadState( 'networkidle' );
	await fillClassicCheckoutBilling( page );
	await page.check( 'input[name="payment_method"][value="cod"]' );

	// Even though required flag is set, the option is disabled → should pass.
	const url = await placeClassicOrder( page );
	expect( url ).toMatch( /order-received/ );
} );

// ---------------------------------------------------------------------------
// Delivery date required — validation must block submission
// ---------------------------------------------------------------------------

test( 'checkout shows error when required delivery date is missing', async ( { page, request } ) => {
	await setJp4wcSettings( request, BASE_URL, {
		'delivery-date': '1',
		'delivery-date-required': '1',
	} );

	await addProductToCart( page, BASE_URL, productId );
	await page.goto( classicCheckoutUrl );
	await page.waitForLoadState( 'domcontentloaded' );

	await page.selectOption( '#billing_country', 'JP' ).catch( () => {} );
	await page.waitForLoadState( 'networkidle' );
	await fillClassicCheckoutBilling( page );
	await page.check( 'input[name="payment_method"][value="cod"]' );

	// Select the "unspecified" placeholder (value "0").
	const dateSelect = page.locator( 'select[name="wc4jp_delivery_date"]' );
	if ( await dateSelect.isVisible() ) {
		await dateSelect.selectOption( '0' );
	}

	await page.click( '#place_order' );

	// Should stay on checkout and show validation error.
	await expect( page ).not.toHaveURL( /order-received/, { timeout: 8_000 } );
	await expect(
		page.locator( '.woocommerce-error, .woocommerce-NoticeGroup-checkout' ),
	).toBeVisible();

	// Restore setting.
	await setJp4wcSettings( request, BASE_URL, {
		'delivery-date': '',
		'delivery-date-required': '',
	} );
} );
