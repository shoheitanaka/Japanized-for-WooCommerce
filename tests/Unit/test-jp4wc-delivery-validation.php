<?php
/**
 * Tests for JP4WC_Delivery checkout field validation (Classic Checkout)
 *
 * @package Japanized_For_WooCommerce
 */

/**
 * Unit tests for JP4WC_Delivery::validate_date_time_checkout_field().
 */
class JP4WC_Delivery_Validation_Test extends WP_UnitTestCase {

	/**
	 * @var JP4WC_Delivery
	 */
	private $delivery;

	public function setUp(): void {
		parent::setUp();
		$this->delivery = new JP4WC_Delivery();

		// Set a logged-in user so wp_create_nonce works.
		wp_set_current_user( 1 );

		// Set up WooCommerce cart.
		WC()->cart->empty_cart();
	}

	public function tearDown(): void {
		parent::tearDown();
		delete_option( 'wc4jp-delivery-date' );
		delete_option( 'wc4jp-delivery-date-required' );
		delete_option( 'wc4jp-delivery-time-zone' );
		delete_option( 'wc4jp-delivery-time-zone-required' );

		// Clear POST data.
		$_POST = array();

		WC()->cart->empty_cart();
	}

	/**
	 * Add a physical product to the cart so validation is not skipped.
	 */
	private function add_physical_product_to_cart(): void {
		$product = new WC_Product_Simple();
		$product->set_name( 'Physical Product' );
		$product->set_regular_price( '1000' );
		$product->set_virtual( false );
		$product_id = $product->save();
		WC()->cart->add_to_cart( $product_id );
	}

	/**
	 * Set a valid WooCommerce checkout nonce in $_POST.
	 */
	private function set_valid_nonce(): void {
		$_POST['woocommerce-process-checkout-nonce'] = wp_create_nonce( 'woocommerce-process_checkout' );
	}

	/**
	 * No nonce in $_POST → validation skips entirely, no errors added.
	 */
	public function test_skips_validation_when_nonce_missing() {
		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '1' );

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$this->assertEmpty( $errors->get_error_codes() );
	}

	/**
	 * Invalid nonce → validation skips entirely, no errors added.
	 */
	public function test_skips_validation_when_nonce_invalid() {
		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '1' );

		$_POST['woocommerce-process-checkout-nonce'] = 'invalid_nonce';

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$this->assertEmpty( $errors->get_error_codes() );
	}

	/**
	 * Cart has only virtual products → validation skips, no errors added.
	 */
	public function test_skips_validation_for_virtual_products_only() {
		$this->set_valid_nonce();

		$product = new WC_Product_Simple();
		$product->set_name( 'Virtual Product' );
		$product->set_regular_price( '500' );
		$product->set_virtual( true );
		$product_id = $product->save();
		WC()->cart->add_to_cart( $product_id );

		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '1' );

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$this->assertEmpty( $errors->get_error_codes() );
	}

	/**
	 * Delivery date option disabled → no error even if field is empty.
	 */
	public function test_no_error_when_delivery_date_option_disabled() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-date', '' );
		update_option( 'wc4jp-delivery-date-required', '1' );

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$this->assertNotContains( 'wc4jp_delivery_date_required', $errors->get_error_codes() );
	}

	/**
	 * Delivery date required, date present in $fields → no error.
	 */
	public function test_no_error_when_required_date_present_in_fields() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '1' );

		$fields = array( 'wc4jp_delivery_date' => '2026-05-10' );
		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( $fields, $errors );

		$this->assertNotContains( 'wc4jp_delivery_date_required', $errors->get_error_codes() );
	}

	/**
	 * Delivery date required, field missing → error added.
	 */
	public function test_adds_error_when_required_date_missing() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '1' );

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$this->assertContains( 'wc4jp_delivery_date_required', $errors->get_error_codes() );
	}

	/**
	 * Delivery date required, value is '0' (unspecified) → error added.
	 */
	public function test_adds_error_when_date_value_is_zero() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '1' );

		$fields = array( 'wc4jp_delivery_date' => '0' );
		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( $fields, $errors );

		$this->assertContains( 'wc4jp_delivery_date_required', $errors->get_error_codes() );
	}

	/**
	 * Delivery date not required → no error even if field is empty.
	 */
	public function test_no_error_when_date_is_optional_and_missing() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '0' );

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$this->assertNotContains( 'wc4jp_delivery_date_required', $errors->get_error_codes() );
	}

	/**
	 * Delivery time required, time zone missing → error added.
	 */
	public function test_adds_error_when_required_time_missing() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-time-zone', '1' );
		update_option( 'wc4jp-delivery-time-zone-required', '1' );

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$this->assertContains( 'wc4jp_delivery_time_zone_required', $errors->get_error_codes() );
	}

	/**
	 * Delivery time required, value present → no error.
	 */
	public function test_no_error_when_required_time_present() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-time-zone', '1' );
		update_option( 'wc4jp-delivery-time-zone-required', '1' );

		$fields = array( 'wc4jp_delivery_time_zone' => '10:00-12:00' );
		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( $fields, $errors );

		$this->assertNotContains( 'wc4jp_delivery_time_zone_required', $errors->get_error_codes() );
	}

	/**
	 * Both date and time required, both missing → both errors added.
	 */
	public function test_adds_both_errors_when_both_required_and_both_missing() {
		$this->set_valid_nonce();
		$this->add_physical_product_to_cart();

		update_option( 'wc4jp-delivery-date', '1' );
		update_option( 'wc4jp-delivery-date-required', '1' );
		update_option( 'wc4jp-delivery-time-zone', '1' );
		update_option( 'wc4jp-delivery-time-zone-required', '1' );

		$errors = new WP_Error();
		$this->delivery->validate_date_time_checkout_field( array(), $errors );

		$codes = $errors->get_error_codes();
		$this->assertContains( 'wc4jp_delivery_date_required', $codes );
		$this->assertContains( 'wc4jp_delivery_time_zone_required', $codes );
	}
}
