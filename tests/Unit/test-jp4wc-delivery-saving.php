<?php
/**
 * Tests for JP4WC_Delivery data saving to order meta
 *
 * @package Japanized_For_WooCommerce
 */

/**
 * Unit tests for JP4WC_Delivery::save_delivery_data_to_order().
 */
class JP4WC_Delivery_Saving_Test extends WP_UnitTestCase {

	/**
	 * @var JP4WC_Delivery
	 */
	private $delivery;

	public function setUp(): void {
		parent::setUp();
		$this->delivery = new JP4WC_Delivery();
	}

	public function tearDown(): void {
		parent::tearDown();
		delete_option( 'wc4jp-date-format' );
	}

	/**
	 * Create a saved WC_Order for use in tests.
	 */
	private function create_order(): WC_Order {
		$order = wc_create_order();
		$order->set_billing_email( 'test@example.com' );
		$order->save();
		return $order;
	}

	/**
	 * Delivery date in $data → saved to order meta.
	 */
	public function test_saves_delivery_date_to_order_meta() {
		$order = $this->create_order();
		$data  = array( 'wc4jp_delivery_date' => '2026-05-10' );

		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertSame( '2026-05-10', $refreshed->get_meta( 'wc4jp-delivery-date', true ) );

		$order->delete( true );
	}

	/**
	 * Delivery time zone in $data → saved to order meta.
	 */
	public function test_saves_delivery_time_to_order_meta() {
		$order = $this->create_order();
		$data  = array( 'wc4jp_delivery_time_zone' => '14:00-16:00' );

		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertSame( '14:00-16:00', $refreshed->get_meta( 'wc4jp-delivery-time-zone', true ) );

		$order->delete( true );
	}

	/**
	 * Both date and time in $data → both saved correctly.
	 */
	public function test_saves_both_date_and_time() {
		$order = $this->create_order();
		$data  = array(
			'wc4jp_delivery_date'      => '2026-05-15',
			'wc4jp_delivery_time_zone' => '10:00-12:00',
		);

		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertSame( '2026-05-15', $refreshed->get_meta( 'wc4jp-delivery-date', true ) );
		$this->assertSame( '10:00-12:00', $refreshed->get_meta( 'wc4jp-delivery-time-zone', true ) );

		$order->delete( true );
	}

	/**
	 * Empty $data → nothing saved, existing meta unchanged.
	 */
	public function test_does_not_save_when_data_is_empty() {
		$order = $this->create_order();
		$order->update_meta_data( 'wc4jp-delivery-date', 'existing-value' );
		$order->save();

		$this->delivery->save_delivery_data_to_order( $order, array() );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertSame( 'existing-value', $refreshed->get_meta( 'wc4jp-delivery-date', true ) );

		$order->delete( true );
	}

	/**
	 * Date value is '0' (unspecified selection) → not saved to order meta.
	 */
	public function test_does_not_save_date_when_value_is_zero() {
		$order = $this->create_order();
		$data  = array( 'wc4jp_delivery_date' => '0' );

		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertEmpty( $refreshed->get_meta( 'wc4jp-delivery-date', true ) );

		$order->delete( true );
	}

	/**
	 * Time value is '0' → not saved.
	 */
	public function test_does_not_save_time_when_value_is_zero() {
		$order = $this->create_order();
		$data  = array( 'wc4jp_delivery_time_zone' => '0' );

		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertEmpty( $refreshed->get_meta( 'wc4jp-delivery-time-zone', true ) );

		$order->delete( true );
	}

	/**
	 * When wc4jp-date-format option is set, the date is reformatted before saving.
	 */
	public function test_applies_date_format_when_option_is_set() {
		$order = $this->create_order();
		update_option( 'wc4jp-date-format', 'Y年m月d日' );

		$data = array( 'wc4jp_delivery_date' => '2026-05-10' );
		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$saved     = $refreshed->get_meta( 'wc4jp-delivery-date', true );

		// Should be formatted, not the raw Y-m-d input.
		$this->assertNotSame( '2026-05-10', $saved );
		$this->assertStringContainsString( '2026', $saved );

		$order->delete( true );
	}

	/**
	 * Block checkout path → save_delivery_data_to_order skips execution.
	 * Block checkout is detected via did_action('woocommerce_store_api_checkout_update_order_from_request').
	 */
	public function test_skips_save_on_block_checkout() {
		// Simulate block checkout having fired (pass required 2 args to satisfy registered callbacks).
		do_action( 'woocommerce_store_api_checkout_update_order_from_request', new WC_Order(), new WP_REST_Request() );

		$order = $this->create_order();
		$data  = array( 'wc4jp_delivery_date' => '2026-05-20' );

		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertEmpty( $refreshed->get_meta( 'wc4jp-delivery-date', true ) );

		$order->delete( true );
	}

	/**
	 * Tracking ship date in $data → saved to order meta.
	 */
	public function test_saves_tracking_ship_date() {
		$order = $this->create_order();
		$data  = array( 'wc4jp-tracking-ship-date' => '2026-05-12' );

		$this->delivery->save_delivery_data_to_order( $order, $data );
		$order->save();

		$refreshed = wc_get_order( $order->get_id() );
		$this->assertSame( '2026-05-12', $refreshed->get_meta( 'wc4jp-tracking-ship-date', true ) );

		$order->delete( true );
	}
}
