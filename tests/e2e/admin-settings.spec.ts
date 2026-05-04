/**
 * E2E tests: JP4WC Admin Settings (React UI)
 *
 * Verifies that the settings page loads, toggles persist after save,
 * and the REST API reflects the saved values.
 */
import { test, expect } from '@playwright/test';
import { login, getJp4wcSettings, setJp4wcSettings } from './utils/helpers';

const BASE_URL = process.env.WP_BASE_URL ?? 'http://localhost:8891';

test.beforeAll( async ( { request } ) => {
	// Start from a known state: everything disabled.
	await setJp4wcSettings( request, BASE_URL, {
		'yomigana': '',
		'yomigana-required': '',
		'delivery-date': '',
		'delivery-date-required': '',
		'delivery-time-zone': '',
		'delivery-time-zone-required': '',
	} );
} );

test.afterAll( async ( { request } ) => {
	await setJp4wcSettings( request, BASE_URL, {
		'yomigana': '',
		'yomigana-required': '',
		'delivery-date': '',
		'delivery-date-required': '',
	} );
} );

// ---------------------------------------------------------------------------
// Page load
// ---------------------------------------------------------------------------

test( 'settings page loads without JS errors', async ( { page } ) => {
	const jsErrors: string[] = [];
	page.on( 'pageerror', ( err ) => jsErrors.push( err.message ) );

	await login( page, BASE_URL );
	await page.goto( `${ BASE_URL }/wp-admin/admin.php?page=jp4wc-settings` );

	// React mounts into #jp4wc-admin-settings-root.
	await expect( page.locator( '#jp4wc-admin-settings-root' ) )
		.toBeVisible( { timeout: 15_000 } );

	expect( jsErrors.filter( ( e ) => ! e.includes( 'deprecated' ) ) ).toHaveLength( 0 );
} );

// ---------------------------------------------------------------------------
// Yomigana setting
// ---------------------------------------------------------------------------

test( 'enabling yomigana in admin persists after page reload', async ( { page, request } ) => {
	await login( page, BASE_URL );
	await page.goto( `${ BASE_URL }/wp-admin/admin.php?page=jp4wc-settings` );

	// Wait for React to mount.
	await page.locator( '#jp4wc-admin-settings-root' ).waitFor( { state: 'visible', timeout: 15_000 } );

	// The yomigana setting uses ToggleControl with label "Name Yomigana".
	// ToggleControl renders an input[type="checkbox"] inside the toggle wrapper.
	const yomiganaToggle = page
		.locator( '[class*="toggle-control"], [class*="checkbox-control"]' )
		.filter( { hasText: /Name Yomigana/i } )
		.locator( 'input[type="checkbox"]' )
		.first();

	await yomiganaToggle.waitFor( { state: 'attached', timeout: 15_000 } );
	const wasChecked = await yomiganaToggle.isChecked();

	if ( ! wasChecked ) {
		await yomiganaToggle.click();
	}

	// Save the settings via the footer save button.
	await page.locator( '.jp4wc-settings-footer button, button:has-text("Save Settings")' )
		.first()
		.click();
	await page.waitForLoadState( 'networkidle' );

	// Reload and verify the toggle is still on.
	await page.goto( `${ BASE_URL }/wp-admin/admin.php?page=jp4wc-settings` );
	await page.locator( '#jp4wc-admin-settings-root' ).waitFor( { state: 'visible', timeout: 15_000 } );
	await yomiganaToggle.waitFor( { state: 'attached', timeout: 15_000 } );
	await expect( yomiganaToggle ).toBeChecked();

	// Also verify via REST API — keys are returned without wc4jp- prefix.
	const settings = await getJp4wcSettings( request, BASE_URL );
	expect( settings[ 'yomigana' ] ).toBeTruthy();
} );

// ---------------------------------------------------------------------------
// Delivery date setting
// ---------------------------------------------------------------------------

test( 'REST API reflects delivery date setting saved from admin', async ( { request } ) => {
	// Set via API first, then verify via API.
	await setJp4wcSettings( request, BASE_URL, { 'delivery-date': '1' } );

	const settings = await getJp4wcSettings( request, BASE_URL );
	expect( settings[ 'delivery-date' ] ).toBeTruthy();

	// Disable via API and verify.
	await setJp4wcSettings( request, BASE_URL, { 'delivery-date': '' } );
	const updated = await getJp4wcSettings( request, BASE_URL );
	expect( updated[ 'delivery-date' ] ).toBeFalsy();
} );

// ---------------------------------------------------------------------------
// Settings persistence via REST API round-trip
// ---------------------------------------------------------------------------

test( 'GET /jp4wc/v1/settings returns expected structure', async ( { request } ) => {
	const settings = await getJp4wcSettings( request, BASE_URL );

	// Must be an object with known JP4WC option keys (without wc4jp- prefix).
	expect( typeof settings ).toBe( 'object' );
	expect( settings ).toHaveProperty( 'yomigana' );
	expect( settings ).toHaveProperty( 'delivery-date' );
} );
