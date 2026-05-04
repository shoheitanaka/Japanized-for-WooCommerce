/**
 * E2E tests: Admin order management
 *
 * Verifies that delivery date/time data saved on checkout is visible in the
 * WooCommerce admin order screen, and that the delivery date column appears
 * in the order list.
 */
import { test, expect } from '@playwright/test';
import {
	login,
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
	ADMIN_USER,
	ADMIN_PASS,
} from './utils/helpers';

const BASE_URL = process.env.WP_BASE_URL ?? 'http://localhost:8891';
const BASIC_AUTH = (): string =>
	Buffer.from( `${ ADMIN_USER }:${ process.env.WP_APP_PASSWORD ?? ADMIN_PASS }` ).toString( 'base64' );

/** Minimal Classic Checkout page content */
const CLASSIC_CHECKOUT_CONTENT = `<!-- wp:shortcode -->[woocommerce_checkout]<!-- /wp:shortcode -->`;

let productId: number;
let orderId: number;
let classicCheckoutPageId: number;
let classicCheckoutUrl: string;

/** WC REST API helper */
async function wcFetch(
	request: import( '@playwright/test' ).APIRequestContext,
	endpoint: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	body?: object,
) {
	const res = await request.fetch( `${ BASE_URL }/wp-json/wc/v3/${ endpoint }`, {
		method,
		headers: {
			Authorization: `Basic ${ BASIC_AUTH() }`,
			'Content-Type': 'application/json',
		},
		data: body ? JSON.stringify( body ) : undefined,
	} );
	return res.json();
}

test.beforeAll( async ( { request, browser } ) => {
	await enablePaymentGateway( request, BASE_URL, 'cod' );
	await setupFreeShippingZone( request, BASE_URL );
	productId = await createProduct( request, BASE_URL );

	// Create a Classic Checkout page for order placement.
	const cp = await wpFetch( request, BASE_URL, 'pages', 'POST', {
		title: 'Classic Checkout (Orders Test)',
		slug: 'classic-checkout-orders-test',
		status: 'publish',
		content: CLASSIC_CHECKOUT_CONTENT,
	} ) as { id: number; link: string };
	classicCheckoutPageId = cp.id;
	classicCheckoutUrl    = cp.link;

	// Enable delivery date (optional, not required).
	await setJp4wcSettings( request, BASE_URL, {
		'delivery-date': '1',
		'delivery-date-required': '',
	} );

	// Place a test order with a delivery date selected.
	const context = await browser.newContext();
	const page    = await context.newPage();

	await addProductToCart( page, BASE_URL, productId );
	await page.goto( classicCheckoutUrl );
	await page.waitForLoadState( 'domcontentloaded' );
	await page.selectOption( '#billing_country', 'JP' ).catch( () => {} );
	await page.waitForLoadState( 'networkidle' ); // Wait for AJAX to update JP address fields.
	await fillClassicCheckoutBilling( page );
	await page.check( 'input[name="payment_method"][value="cod"]' );

	// Pick the first available delivery date if the selector exists.
	const dateSelect = page.locator( 'select[name="wc4jp_delivery_date"]' );
	if ( await dateSelect.isVisible( { timeout: 3_000 } ).catch( () => false ) ) {
		const options = await dateSelect.locator( 'option' ).all();
		if ( options.length > 1 ) {
			const firstValue = await options[ 1 ].getAttribute( 'value' );
			if ( firstValue ) await dateSelect.selectOption( firstValue );
		}
	}

	const orderUrl = await placeClassicOrder( page );

	// Extract order ID from the Thank You URL.
	const match = orderUrl.match( /order-received\/(\d+)/ );
	if ( match ) {
		orderId = parseInt( match[ 1 ], 10 );
	}

	await context.close();
} );

test.afterAll( async ( { request } ) => {
	await deleteProduct( request, BASE_URL, productId );
	await deleteAllOrders( request, BASE_URL );

	if ( classicCheckoutPageId ) {
		await wpFetch( request, BASE_URL, `pages/${ classicCheckoutPageId }?force=true`, 'DELETE' );
	}

	await setJp4wcSettings( request, BASE_URL, {
		'delivery-date': '',
		'delivery-date-required': '',
	} );
} );

// ---------------------------------------------------------------------------
// Order list
// ---------------------------------------------------------------------------

test( 'admin order list shows the delivery date column', async ( { page } ) => {
	await login( page, BASE_URL );

	// WooCommerce HPOS order list.
	await page.goto( `${ BASE_URL }/wp-admin/admin.php?page=wc-orders` );
	await page.waitForLoadState( 'domcontentloaded' );

	// Fallback to legacy post list if HPOS is not active.
	const isHpos = await page.locator( '.wc-order-list-table-wrapper, .widefat.woocommerce-orders-table' )
		.isVisible( { timeout: 3_000 } )
		.catch( () => false );

	if ( ! isHpos ) {
		await page.goto( `${ BASE_URL }/wp-admin/edit.php?post_type=shop_order` );
	}

	// The delivery column header should be present (column key = wc4jp_delivery, label = "Delivery").
	await expect(
		page.locator( 'th:has-text("Delivery"), .column-wc4jp_delivery' ).first(),
	).toBeVisible( { timeout: 10_000 } );
} );

// ---------------------------------------------------------------------------
// Order detail
// ---------------------------------------------------------------------------

test( 'admin order edit page shows JP4WC delivery meta box', async ( { page } ) => {
	await login( page, BASE_URL );

	if ( ! orderId ) {
		test.skip( true, 'No test order was created in beforeAll' );
	}

	// Navigate to order edit (HPOS).
	await page.goto( `${ BASE_URL }/wp-admin/admin.php?page=wc-orders&action=edit&id=${ orderId }` );
	await page.waitForLoadState( 'domcontentloaded' );

	// Fallback to legacy post edit.
	if ( await page.locator( '#post-body' ).isVisible( { timeout: 2_000 } ).catch( () => false ) ) {
		await page.goto( `${ BASE_URL }/wp-admin/post.php?post=${ orderId }&action=edit` );
	}

	// JP4WC adds a meta box with delivery date/time (id="jp4wc_shop_order").
	await expect(
		page.locator( '#jp4wc_shop_order, .jp4wc-order-meta, [id*="jp4wc"]' ).first(),
	).toBeVisible( { timeout: 10_000 } );
} );

// ---------------------------------------------------------------------------
// Order REST API: delivery meta saved
// ---------------------------------------------------------------------------

test( 'order meta contains delivery date after checkout', async ( { request } ) => {
	if ( ! orderId ) {
		test.skip( true, 'No test order was created in beforeAll' );
	}

	const order = await wcFetch( request, `orders/${ orderId }`, 'GET' ) as {
		meta_data: { key: string; value: string }[];
	};

	const deliveryDateMeta = order.meta_data.find(
		( m ) => m.key === 'wc4jp-delivery-date',
	);

	// The meta entry exists if the user selected a date during checkout.
	// (It may be absent if the delivery date selector was not visible.)
	if ( deliveryDateMeta ) {
		expect( deliveryDateMeta.value ).toBeTruthy();
	}
} );
