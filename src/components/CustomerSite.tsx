import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import CartDrawer from './CartDrawer';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const CustomerSite: React.FC = () => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-crema font-body text-carbon">
      <ScrollToTop />
      <Header onCartClick={() => setCartOpen(true)} />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default CustomerSite;
