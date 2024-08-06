import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
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
  width: 50px; /* Adjust the size as needed */
  height: auto;
  transition: transform 0.3s;
  &:hover {
    transform: rotate(-10deg);
  }
`;

const NavLinks = styled.ul`
  list-style: none;
  display: flex;
  gap: 2rem;
  align-items: center; /* Ensure alignment with the button */

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled.li`
  position: relative;
  a {
    color: #fff;
    text-decoration: none;
    font-size: 1rem;
    transition: color 0.3s, transform 0.3s;

    &:hover {
      color: #ff4136;
      transform: scale(1.1);
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

  &:hover:after {
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

  &:hover {
    background-color: #fff;
    color: #ff4136;
    transform: translateY(-3px);
  }
`;

const Hamburger = styled.div`
  display: none;
  flex-direction: column;
  cursor: pointer;

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

    &:hover {
      background-color: #ff4136;
    }
  }
`;

const MobileMenu = styled.div`
  display: ${props => (props.open ? 'flex' : 'none')};
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
`;

const Navbar = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Nav>
      <Link to="/">
        <LogoImage src={logo2} alt="Logo" />
      </Link>
      <NavLinks>
        <NavLink>
          <Link to="/">Home</Link>
        </NavLink>
        {user && (
          <NavLink>
            <Link to="/blog">Blog</Link>
          </NavLink>
        )}
        {user ? (
          <>
            <NavLink>
              <Link to="/trading-journal">Trading Journal</Link>
            </NavLink>
            <NavLink>
              <Link to="/dashboard">Dashboard</Link>
            </NavLink>
            {user.isAdmin && (
              <NavLink>
                <Link to="/admin">Admin</Link>
              </NavLink>
            )}
            <Button onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          <>
            <NavLink>
              <Link to="/login">Login</Link>
            </NavLink>
            <NavLink>
              <Link to="/signup">Sign-up</Link>
            </NavLink>
          </>
        )}
      </NavLinks>
      <Hamburger onClick={toggleMenu} aria-expanded={isOpen} aria-controls="mobile-menu">
        <span />
        <span />
        <span />
      </Hamburger>
      <MobileMenu id="mobile-menu" open={isOpen}>
        <NavLink>
          <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
        </NavLink>
        {user && (
          <NavLink>
            <Link to="/blog" onClick={() => setIsOpen(false)}>Blog</Link>
          </NavLink>
        )}
        {user ? (
          <>
            <NavLink>
              <Link to="/trading-journal" onClick={() => setIsOpen(false)}>Trading Journal</Link>
            </NavLink>
            <NavLink>
              <Link to="/dashboard" onClick={() => setIsOpen(false)}>Dashboard</Link>
            </NavLink>
            {user.isAdmin && (
              <NavLink>
                <Link to="/admin" onClick={() => setIsOpen(false)}>Admin</Link>
              </NavLink>
            )}
            <Button onClick={() => { handleLogout(); setIsOpen(false); }}>Logout</Button>
          </>
        ) : (
          <>
            <NavLink>
              <Link to="/login" onClick={() => setIsOpen(false)}>Login</Link>
            </NavLink>
            <NavLink>
              <Link to="/signup" onClick={() => setIsOpen(false)}>Sign-up</Link>
            </NavLink>
          </>
        )}
      </MobileMenu>
    </Nav>
  );
};

export default Navbar;
