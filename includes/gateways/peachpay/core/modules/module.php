<?php
/**
 * Loads active modules.
 *
 * @package PeachPay
 */

if ( ! defined( 'PEACHPAY_ABSPATH' ) ) {
	exit;
}

require_once PEACHPAY_ABSPATH . 'core/modules/field-editor/field-editor.php';
require_once PEACHPAY_ABSPATH . 'core/modules/related-products/pp-related-products.php';
