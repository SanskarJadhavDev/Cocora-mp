import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Collection from './pages/Collection'
import Build from './pages/Build'
import GiftFinder from './pages/GiftFinder'
import Cart from './pages/Cart'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import './css/common.css'

function AppContent({ cart, setCart, cartCount }) {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      {!isAdmin && <Navbar cartCount={cartCount} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/collection" element={<Collection cart={cart} setCart={setCart} />} />
        <Route path="/build" element={<Build cart={cart} setCart={setCart} />} />
        <Route path="/gift-finder" element={<GiftFinder />} />
        <Route path="/cart" element={<Cart cart={cart} setCart={setCart} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </>
  )
}

export default function App() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cocoraCart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('cocoraCart')
        setCart(saved ? JSON.parse(saved) : [])
      } catch {
        setCart([])
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <BrowserRouter>
      <AppContent cart={cart} setCart={setCart} cartCount={cartCount} />
    </BrowserRouter>
  )
}
