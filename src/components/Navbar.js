import React, { useEffect, useRef, useCallback } from 'react';
import { NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../hooks/useAuth';
import logo2 from '../components/logo/logo1.png';

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #000;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const LogoImage = styled.img`
  width: 50px;
  height: auto;
  transition: transform 0.3s;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    transform: rotate(-10deg);
  }
`;

const NavLinks = styled.ul`
  list-style: none;
  display: flex;
  gap: 2rem;
  align-items: center;
  margin: 0;
  padding: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLinkItem = styled.li`
  position: relative;

  a {
    color: #fff;
    text-decoration: none;
    font-size: 1rem;
    transition: color 0.3s;

    &.active {
      color: #ff4136;
    }

    &:hover {
      color: #ff4136;
    }
  }

  &:after {
    content: '';
    display: block;
    position: absolute;
    width: 0;
    height: 2px;
    background: #ff4136;
    transition: width 0.3s;
    bottom: -5px;
    left: 0;
  }

  &:has(a.active)::after {
    width: 100%;
  }
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #ff4136;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.3s;
  font-size: 1rem;

  &:hover {
    background-color: #fff;
    color: #ff4136;
    transform: translateY(-3px);
  }

  &:focus-visible {
    outline: 2px solid #ff4136;
    outline-offset: 2px;
  }
`;

const Hamburger = styled.button`
  display: none;
  flex-direction: column;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.5rem;

  @media (max-width: 768px) {
    display: flex;
  }

  span {
    height: 3px;
    width: 25px;
    background-color: #fff;
    margin-bottom: 4px;
    border-radius: 2px;
    transition: background-color 0.3s;
  }

  &:hover span,
  &:focus-visible span {
    background-color: #ff4136;
  }

  &:focus-visible {
    outline: 2px solid #ff4136;
    outline-offset: 2px;
  }
`;

const MobileMenu = styled.div`
  display: ${props => (props.$open ? 'flex' : 'none')};
  flex-direction: column;
  background-color: #000;
  position: absolute;
  top: 60px;
  right: 0;
  width: 100%;
  padding: 1rem;
  gap: 1rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

  @media (min-width: 769px) {
    display: none;
  }

  a {
    color: #fff;
    text-decoration: none;
    font-size: 1rem;
    padding: 0.5rem 0;

    &.active {
      color: #ff4136;
    }

    &:hover {
      color: #ff4136;
    }
  }
`;

const NAV_LINKS = [
  { to: '/', label: 'Home', auth: false },
  { to: '/polymarket', label: 'Polymarket Bot', auth: false },
  { to: '/blog', label: 'Blog', auth: false },
  { to: '/trade-plan', label: 'Trade Plan', auth: true },
  { to: '/connect-api', label: 'ConnectAPI', auth: true },
  { to: '/trading-journal', label: 'Trading Journal', auth: true },
  { to: '/dashboard', label: 'Dashboard', auth: true },
  { to: '/admin', label: 'Admin', auth: true, adminOnly: true },
];

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    setIsOpen(false);
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(e.target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeMenu]);

  const filteredLinks = NAV_LINKS.filter(link => {
    if (link.auth && !user) return false;
    if (link.adminOnly && (!user || !user.isAdmin)) return false;
    return true;
  });

  const renderLinks = (onClick) =>
    filteredLinks.map(link => (
      <NavLinkItem key={link.to}>
        <RouterNavLink
          to={link.to}
          end={link.to === '/'}
          onClick={onClick}
        >
          {link.label}
        </RouterNavLink>
      </NavLinkItem>
    ));

  return (
    <Nav role="navigation" aria-label="Main navigation">
      <RouterNavLink to="/" onClick={closeMenu}>
        <LogoImage src={logo2} alt="MarketPlaymaker home" />
      </RouterNavLink>
      <NavLinks>
        {renderLinks(undefined)}
        {user ? (
          <Button onClick={handleLogout}>Logout</Button>
        ) : (
          <>
            <NavLinkItem>
              <RouterNavLink to="/login">Login</RouterNavLink>
            </NavLinkItem>
            <NavLinkItem>
              <RouterNavLink to="/signup">Sign-up</RouterNavLink>
            </NavLinkItem>
          </>
        )}
      </NavLinks>
      <Hamburger
        ref={hamburgerRef}
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label="Toggle navigation menu"
      >
        <span />
        <span />
        <span />
      </Hamburger>
      <MobileMenu id="mobile-menu" $open={isOpen} ref={menuRef} role="menu">
        {renderLinks(closeMenu)}
        {user ? (
          <Button onClick={handleLogout}>Logout</Button>
        ) : (
          <>
            <RouterNavLink to="/login" onClick={closeMenu}>Login</RouterNavLink>
            <RouterNavLink to="/signup" onClick={closeMenu}>Sign-up</RouterNavLink>
          </>
        )}
      </MobileMenu>
    </Nav>
  );
};

export default Navbar;
