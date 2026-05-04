/**
 * Playwright global setup
 *
 * Runs once before all e2e tests. Creates a WordPress Application Password
 * for the admin user (via wp-env + WP-CLI) and stores it so all test files
 * can authenticate against the REST API without browser-based login.
 *
 * Also performs initial WooCommerce configuration:
 *  - Sets store country to Japan
 *  - Enables COD payment gateway
 *  - Creates a catch-all free-shipping zone
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const AUTH_DIR  = path.resolve( __dirname, '.auth' );
const AUTH_FILE = path.join( AUTH_DIR, 'credentials.json' );

export default async function globalSetup(): Promise<void> {
	const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8891';

	// Ensure .auth directory exists.
	if ( ! fs.existsSync( AUTH_DIR ) ) {
		fs.mkdirSync( AUTH_DIR, { recursive: true } );
	}

	// Generate (or reuse) Application Password via WP-CLI on the tests container.
	let appPassword: string;
	try {
		const raw = execSync(
			'npx wp-env run tests-cli wp user application-password create admin playwright-e2e --porcelain',
			{ cwd: process.cwd(), encoding: 'utf8' },
		).trim();
		// wp-cli outputs only the password when --porcelain is set.
		appPassword = raw.split( '\n' ).pop()!.trim();
	} catch ( e ) {
		throw new Error(
			`Failed to create Application Password via WP-CLI.\n` +
			`Make sure wp-env tests instance is running: npx wp-env start\n` +
			String( e ),
		);
	}

	// Persist credentials for test files.
	fs.writeFileSync(
		AUTH_FILE,
		JSON.stringify( { user: 'admin', appPassword, baseURL } ),
		'utf8',
	);

	// Make available to all tests in the same process.
	process.env.WP_APP_PASSWORD = appPassword;
	process.env.WP_BASE_URL     = baseURL;

	// ---------------------------------------------------------------------------
	// Initial WooCommerce setup via REST API
	// ---------------------------------------------------------------------------
	const auth = Buffer.from( `admin:${ appPassword }` ).toString( 'base64' );

	const wcPut = async ( endpoint: string, body: object ) => {
		const res = await fetch( `${ baseURL }/wp-json/wc/v3/${ endpoint }`, {
			method: 'PUT',
			headers: { Authorization: `Basic ${ auth }`, 'Content-Type': 'application/json' },
			body: JSON.stringify( body ),
		} );
		if ( ! res.ok ) {
			console.warn( `⚠ wcPut ${ endpoint } returned ${ res.status }` );
		}
	};

	const wcPost = async ( endpoint: string, body: object ) => {
		const res = await fetch( `${ baseURL }/wp-json/wc/v3/${ endpoint }`, {
			method: 'POST',
			headers: { Authorization: `Basic ${ auth }`, 'Content-Type': 'application/json' },
			body: JSON.stringify( body ),
		} );
		return res.ok ? res.json() : null;
	};

	const wcGet = async ( endpoint: string ) => {
		const res = await fetch( `${ baseURL }/wp-json/wc/v3/${ endpoint }`, {
			headers: { Authorization: `Basic ${ auth }` },
		} );
		return res.ok ? res.json() : [];
	};

	// Set store country to Japan.
	await wcPut( 'settings/general/woocommerce_default_country', { value: 'JP' } );

	// Enable COD payment.
	await wcPut( 'payment_gateways/cod', { enabled: true } );

	// Create free-shipping zone for Japan if not already present.
	const zones = ( await wcGet( 'shipping/zones' ) ) as { id: number; name: string }[];
	const exists = zones.some( ( z ) => z.name === 'Japan (e2e)' );
	if ( ! exists ) {
		const zone = ( await wcPost( 'shipping/zones', { name: 'Japan (e2e)' } ) ) as { id: number } | null;
		if ( zone ) {
			await wcPost( `shipping/zones/${ zone.id }/methods`, { method_id: 'free_shipping' } );
		}
	}

	console.log( '✔ E2E global setup complete.' );
}
