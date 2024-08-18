// src/components/PurchasePage.js
import React from 'react';

const PurchasePage = () => {
  React.useEffect(() => {
    // Make sure Stripe Buy Button script has loaded
    if (window.StripeBuyButton) {
      window.StripeBuyButton.load();
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h1>Purchase Product</h1>
      <p>Complete your purchase by selecting a payment method below.</p>
      <stripe-buy-button
        buy-button-id="buy_btn_1PoCswBQ5dVVUoajzSWdKTH7"
        publishable-key="pk_live_51PkTr0BQ5dVVUoajsRhl46KlNpxhd9RYZ2r4rUQXyfnEuA3W9Nr2S4VMGVaXzwJejXVFfxBTEGKhQv100vZXKyur00fBGlG9D7"
      ></stripe-buy-button>
    </div>
  );
};

export default PurchasePage;
