<?php
/**
 * Admin View: Settings
 *
 * @package WooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$current_tabs = array(
	'setting'   => __( 'Setting', 'woocommerce-for-japan' ),
	'shipment'  => __( 'Shipment', 'woocommerce-for-japan' ),
	'payment'   => __( 'Payment', 'woocommerce-for-japan' ),
	'law'       => __( 'Specified Commercial Transaction Law', 'woocommerce-for-japan' ),
	'affiliate' => __( 'Affiliate Setting', 'woocommerce-for-japan' ),
	'info'      => __( 'Infomations', 'woocommerce-for-japan' ),
);
$current_tabs = apply_filters( 'wc4jp_admin_setting_tabs', $current_tabs );

$current_tab       = ! empty( $_REQUEST['tab'] ) ? sanitize_title( wp_unslash( $_REQUEST['tab'] ) ) : 'setting';
$current_tab_label = isset( $current_tabs[ $current_tab ] ) ? $current_tabs[ $current_tab ] : '';

?>
<div class="wrap woocommerce">
	<nav class="nav-tab-wrapper woo-nav-tab-wrapper">
		<?php
		foreach ( $current_tabs as $slug => $label ) {
			echo '<a href="' . esc_html( admin_url( 'admin.php?page=wc4jp-options&tab=' . esc_attr( $slug ) ) ) . '" class="nav-tab ' . ( $current_tab === $slug ? 'nav-tab-active' : '' ) . '">' . esc_html( $label ) . '</a>';
		}
			do_action( 'wc4jp_settings_tabs' );
		?>
	</nav>
	<div class="wrap">
		<h1 class="screen-reader-text"><?php echo esc_html( $current_tab_label ); ?></h1>
	<?php
		$this->show_messages();
	if ( isset( $_GET['tab'] ) ) {
		switch ( $_GET['tab'] ) {
			case 'info':
				$this->admin_info_page();
				break;
			default:
				$this->admin_setting_page();
				break;
		}
	} else {
		$this->admin_setting_page();
	}
	?>
	</div>
</div>
