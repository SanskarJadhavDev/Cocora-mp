import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import '../css/build.css'

const chocolateList = [
  { id: 'obsidian', name: 'Obsidian' },
  { id: 'ember', name: 'Ember' },
  { id: 'ivory-cardamom', name: 'Ivory Cardamom' },
  { id: 'malabar', name: 'Malabar' },
  { id: 'kashmir-rose', name: 'Kashmir Rose' },
  { id: 'burnt-caramel', name: 'Burnt Caramel' },
  { id: 'alphonso', name: 'Alphonso' },
  { id: 'midnight-orange', name: 'Midnight Orange' },
  { id: 'hazelnut-praline', name: 'Hazelnut Praline' },
  { id: 'kesar', name: 'Kesar' },
  { id: 'coconut-kokum', name: 'Coconut Kokum' },
  { id: 'garden-mint', name: 'Garden Mint' }
]

export default function Build({ cart, setCart }) {
  const [searchParams] = useSearchParams()
  const [traySize, setTraySize] = useState(12)
  const [boxPrice, setBoxPrice] = useState(1699)
  const [selectedChocolates, setSelectedChocolates] = useState([])
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const productParam = searchParams.get('product')
    if (productParam) {
      if (productParam === 'signature-box') {
        setTraySize(12)
        setBoxPrice(1699)
      } else {
        const found = chocolateList.find((c) => c.id === productParam)
        if (found) {
          setSelectedChocolates([found])
        }
      }
    }
  }, [searchParams])

  const selectTray = (size, price) => {
    setTraySize(size)
    setBoxPrice(price)
    setStatusMessage('')
    setSelectedChocolates((prev) => {
      if (prev.length > size) {
        return prev.slice(0, size)
      }
      return prev
    })
  }

  const addChocolate = (id) => {
    if (selectedChocolates.length >= traySize) {
      setStatusMessage('Your tray is full.')
      return
    }
    setStatusMessage('')
    const choco = chocolateList.find((c) => c.id === id)
    if (choco) {
      setSelectedChocolates((prev) => [...prev, choco])
    }
  }

  const removeChocolate = (index) => {
    setSelectedChocolates((prev) => prev.filter((_, i) => i !== index))
    setStatusMessage('')
  }

  const handleAddBoxToCart = () => {
    if (selectedChocolates.length === 0) {
      setStatusMessage('Please add at least one chocolate.')
      return
    }

    const boxId = 'custom-box-' + traySize
    const boxName = 'Custom Cocora Box (Tray ' + traySize + ')'
    const currentCart = [...cart]
    let found = false

    for (let i = 0; i < currentCart.length; i++) {
      if (currentCart[i].id === boxId) {
        currentCart[i] = {
          ...currentCart[i],
          quantity: currentCart[i].quantity + 1
        }
        found = true
        break
      }
    }

    if (!found) {
      const names = selectedChocolates.map((c) => c.name)
      currentCart.push({
        id: boxId,
        name: boxName,
        price: boxPrice,
        quantity: 1,
        traySize: traySize,
        chocolates: names
      })
    }

    setCart(currentCart)
    localStorage.setItem('cocoraCart', JSON.stringify(currentCart))
    setStatusMessage('Box added to cart!')
  }

  const getTrayNameDisplay = () => {
    if (traySize === 6) return 'TRAY 6 — HALF TRAY'
    if (traySize === 12) return 'TRAY 12 — SIGNATURE'
    if (traySize === 24) return 'TRAY 24 — DOUBLE'
    return `TRAY ${traySize}`
  }

  return (
    <div>
      <section className="build-section">
        <div className="build-inner">
          <div>
            <p className="section-tag">BUILD A BOX</p>
            <h2 className="build-title">You fill it. We hand you the tray.</h2>
            <p className="build-text">
              Choose a tray size, add chocolates to the cavities, and build your own custom box.
            </p>

            <div>
              <p className="section-tag">1. CHOOSE TRAY SIZE</p>
              <div className="hero-buttons">
                <button
                  type="button"
                  className={`btn-outline size-btn ${traySize === 6 ? 'active' : ''}`}
                  onClick={() => selectTray(6, 999)}
                >
                  Tray 6
                </button>
                <button
                  type="button"
                  className={`btn-outline size-btn ${traySize === 12 ? 'active' : ''}`}
                  onClick={() => selectTray(12, 1699)}
                >
                  Tray 12
                </button>
                <button
                  type="button"
                  className={`btn-outline size-btn ${traySize === 24 ? 'active' : ''}`}
                  onClick={() => selectTray(24, 2999)}
                >
                  Tray 24
                </button>
              </div>
            </div>

            <div>
              <p className="section-tag">2. ADD CHOCOLATES</p>
              <div className="hero-buttons">
                {chocolateList.map((choco) => (
                  <button
                    key={choco.id}
                    type="button"
                    className="btn-outline choco-btn"
                    onClick={() => addChocolate(choco.id)}
                  >
                    {choco.name} +
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tray-preview">
            <div className="tray-header">
              <span id="tray-name-display">{getTrayNameDisplay()}</span>
              <span id="tray-count-display">{selectedChocolates.length} / {traySize} FILLED</span>
            </div>
            <div id="tray-grid" className="tray-grid">
              {Array.from({ length: traySize }).map((_, i) => {
                if (i < selectedChocolates.length) {
                  const choco = selectedChocolates[i]
                  return (
                    <div
                      key={i}
                      className={`tray-slot slot-${choco.id}`}
                      title={`${choco.name} (click to remove)`}
                      onClick={() => removeChocolate(i)}
                    ></div>
                  )
                }
                return <div key={i} className="tray-slot slot-empty"></div>
              })}
            </div>
            <p id="selected-count-text" className="build-text">
              {selectedChocolates.length} / {traySize} chocolates selected
            </p>
            <p id="tray-status-message" className="section-tag">{statusMessage}</p>
            <p id="box-price-display" className="tray-price">₹{boxPrice}</p>
            <button
              type="button"
              id="add-box-btn"
              className="btn-primary"
              onClick={handleAddBoxToCart}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-brand-name">Cocora</p>
              <p className="footer-brand-desc">
                A small chocolate kitchen in Bandra West. We make twelve things and we
                make them well.
              </p>
            </div>
            <div>
              <p className="footer-heading">Shop</p>
              <ul className="footer-links">
                <li><Link to="/collection">The collection</Link></li>
                <li><Link to="/build">Build a box</Link></li>
                <li><Link to="/#trays">Tray sizes</Link></li>
              </ul>
            </div>
            <div>
              <p className="footer-heading">Kitchen</p>
              <ul className="footer-links">
                <li>Perry Cross Rd, Bandra West</li>
                <li>Tue to Sun, 11am to 8pm</li>
                <li>kitchen@cocora.in</li>
              </ul>
            </div>
          </div>
          <p className="footer-bottom">
            © 2026 Cocora Chocolate Co. — Mumbai
          </p>
        </div>
      </footer>
    </div>
  )
}
