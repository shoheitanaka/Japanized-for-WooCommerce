<?php
/**
 * Tests for JP4WC_Delivery_Blocks_Integration field validation
 *
 * @package Japanized_For_WooCommerce
 */

/**
 * Unit tests for JP4WC_Delivery_Blocks_Integration::validate_additional_field().
 *
 * This validator runs on every Store API request (calc_totals, locale, final checkout),
 * so the calc_totals guard is critical to prevent 500 errors on intermediate updates.
 */
class JP4WC_Delivery_Blocks_Validation_Test extends WP_UnitTestCase {

	/**
	 * @var JP4WC_Delivery_Blocks_Integration
	 */
	private $integration;

	public function setUp(): void {
		parent::setUp();

		if ( ! class_exists( 'JP4WC_Delivery_Blocks_Integration' ) ) {
			require_once dirname( __DIR__, 2 ) . '/includes/blocks/class-jp4wc-delivery-blocks-integration.php';
		}

		if ( ! class_exists( 'JP4WC_Delivery_Blocks_Integration' ) ) {
			$this->markTestSkipped( 'JP4WC_Delivery_Blocks_Integration not available (WC Blocks interface missing)' );
		}

		$this->integration = new JP4WC_Delivery_Blocks_Integration();
	}

	public function tearDown(): void {
		parent::tearDown();
		delete_option( 'wc4jp-delivery-date-required' );
		delete_option( 'wc4jp-delivery-time-zone-required' );
		unset( $_GET['__experimental_calc_totals'], $_GET['_locale'] );
	}

	// ------------------------------------------------------------------
	// calc_totals / locale guard
	// ------------------------------------------------------------------

	/**
	 * calc_totals request → validation skipped, $is_valid returned unchanged.
	 */
	public function test_skips_validation_on_calc_totals_request() {
		$_GET['__experimental_calc_totals'] = '1';
		update_option( 'wc4jp-delivery-date-required', '1' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-date', '' );

		$this->assertTrue( $result );
	}

	/**
	 * calc_totals with $is_valid=false → still returned unchanged (no WP_Error).
	 */
	public function test_skips_validation_on_calc_totals_preserves_false() {
		$_GET['__experimental_calc_totals'] = '1';
		update_option( 'wc4jp-delivery-date-required', '1' );

		$result = $this->integration->validate_additional_field( false, 'jp4wc/delivery-date', '' );

		$this->assertFalse( $result );
		$this->assertNotInstanceOf( 'WP_Error', $result );
	}

	// ------------------------------------------------------------------
	// Delivery date validation
	// ------------------------------------------------------------------

	/**
	 * Delivery date required, value empty → WP_Error returned.
	 */
	public function test_returns_error_when_required_date_is_empty() {
		update_option( 'wc4jp-delivery-date-required', '1' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-date', '' );

		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertSame( 'invalid_delivery_date', $result->get_error_code() );
	}

	/**
	 * Delivery date required, value is null → WP_Error returned.
	 */
	public function test_returns_error_when_required_date_is_null() {
		update_option( 'wc4jp-delivery-date-required', '1' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-date', null );

		$this->assertInstanceOf( 'WP_Error', $result );
	}

	/**
	 * Delivery date required, value is '0' (unspecified) → WP_Error returned.
	 */
	public function test_returns_error_when_required_date_is_zero() {
		update_option( 'wc4jp-delivery-date-required', '1' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-date', '0' );

		$this->assertInstanceOf( 'WP_Error', $result );
	}

	/**
	 * Delivery date required, value present → $is_valid returned unchanged.
	 */
	public function test_passes_when_required_date_is_present() {
		update_option( 'wc4jp-delivery-date-required', '1' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-date', '2026-05-10' );

		$this->assertTrue( $result );
	}

	/**
	 * Delivery date not required → passes even when empty.
	 */
	public function test_passes_when_date_is_not_required_and_empty() {
		update_option( 'wc4jp-delivery-date-required', '0' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-date', '' );

		$this->assertTrue( $result );
		$this->assertNotInstanceOf( 'WP_Error', $result );
	}

	// ------------------------------------------------------------------
	// Delivery time validation
	// ------------------------------------------------------------------

	/**
	 * Delivery time required, value empty → WP_Error returned.
	 */
	public function test_returns_error_when_required_time_is_empty() {
		update_option( 'wc4jp-delivery-time-zone-required', '1' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-time', '' );

		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertSame( 'invalid_delivery_time', $result->get_error_code() );
	}

	/**
	 * Delivery time required, value present → passes.
	 */
	public function test_passes_when_required_time_is_present() {
		update_option( 'wc4jp-delivery-time-zone-required', '1' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-time', '14:00-16:00' );

		$this->assertTrue( $result );
	}

	/**
	 * Delivery time not required, empty → passes.
	 */
	public function test_passes_when_time_is_not_required_and_empty() {
		update_option( 'wc4jp-delivery-time-zone-required', '0' );

		$result = $this->integration->validate_additional_field( true, 'jp4wc/delivery-time', '' );

		$this->assertTrue( $result );
	}

	// ------------------------------------------------------------------
	// Unrelated field key
	// ------------------------------------------------------------------

	/**
	 * Unrelated field key → $is_valid returned unchanged without any check.
	 */
	public function test_passes_unrelated_field_key_unchanged() {
		$result = $this->integration->validate_additional_field( true, 'some/other-field', '' );

		$this->assertTrue( $result );
	}

	// ------------------------------------------------------------------
	// hide_additional_fields_from_order_meta
	// ------------------------------------------------------------------

	/**
	 * JP4WC delivery meta keys are removed from formatted order meta.
	 */
	public function test_hides_delivery_meta_keys_from_order_display() {
		$order = wc_create_order();

		$date_meta          = new stdClass();
		$date_meta->key     = '_wc_other/jp4wc/delivery-date';
		$date_meta->value   = '2026-05-10';

		$time_meta          = new stdClass();
		$time_meta->key     = '_wc_other/jp4wc/delivery-time';
		$time_meta->value   = '10:00-12:00';

		$other_meta         = new stdClass();
		$other_meta->key    = '_billing_first_name';
		$other_meta->value  = 'Shohei';

		$formatted = array( 1 => $date_meta, 2 => $time_meta, 3 => $other_meta );
		$result    = $this->integration->hide_additional_fields_from_order_meta( $formatted, $order );

		$this->assertArrayNotHasKey( 1, $result, 'delivery-date meta should be hidden' );
		$this->assertArrayNotHasKey( 2, $result, 'delivery-time meta should be hidden' );
		$this->assertArrayHasKey( 3, $result, 'unrelated meta should remain' );

		$order->delete( true );
	}

	/**
	 * No JP4WC keys in formatted meta → array returned unchanged.
	 */
	public function test_leaves_non_jp4wc_meta_unchanged() {
		$order = wc_create_order();

		$meta       = new stdClass();
		$meta->key  = '_billing_first_name';
		$meta->value = 'Test';

		$formatted = array( 1 => $meta );
		$result    = $this->integration->hide_additional_fields_from_order_meta( $formatted, $order );

		$this->assertCount( 1, $result );

		$order->delete( true );
	}
}
