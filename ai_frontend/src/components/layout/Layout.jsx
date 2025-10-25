import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header_updated';
import Footer from './Footer';

const Layout = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
