import { Link } from 'react-router-dom'
import '../css/collection.css'

const chocolates = [
  { num: 1, code: 'CCR-01', name: 'Obsidian', price: 180, desc: '72% dark, flaked sea salt, a long bitter finish.' },
  { num: 2, code: 'CCR-02', name: 'Ember', price: 200, desc: 'Dark ganache cut with Kashmiri chilli. Heat arrives late.' },
  { num: 3, code: 'CCR-03', name: 'Ivory Cardamom', price: 190, desc: 'White chocolate, green cardamom ground the same day.' },
  { num: 4, code: 'CCR-04', name: 'Malabar', price: 210, desc: 'Milk chocolate over cold-brewed Coorg coffee.' },
  { num: 5, code: 'CCR-05', name: 'Kashmir Rose', price: 220, desc: 'Rose water, crushed pistachio, a thin dark shell.' },
  { num: 6, code: 'CCR-06', name: 'Burnt Caramel', price: 195, desc: 'Sugar taken past amber, stopped with cream and salt.' },
  { num: 7, code: 'CCR-07', name: 'Alphonso', price: 230, desc: 'Ratnagiri mango folded into white ganache. April to June only.' },
  { num: 8, code: 'CCR-08', name: 'Midnight Orange', price: 185, desc: 'Candied peel, dark shell, a bitter edge on the back end.' },
  { num: 9, code: 'CCR-09', name: 'Hazelnut Praline', price: 200, desc: 'Roasted hazelnut ground to a paste, nothing else added.' },
  { num: 10, code: 'CCR-10', name: 'Kesar', price: 250, desc: 'Kashmiri saffron bloomed in cream. The expensive one.' },
  { num: 11, code: 'CCR-11', name: 'Coconut Kokum', price: 190, desc: 'Toasted coconut against sour kokum. Divides the room.' },
  { num: 12, code: 'CCR-12', name: 'Garden Mint', price: 215, desc: 'Fresh mint steeped in cream overnight, never extract.' }
]

export default function Collection({ cart, setCart }) {
  const handleAddToCart = (product) => {
    const id = product.name.toLowerCase().replace(/ /g, '-')
    const currentCart = [...cart]
    let found = false

    for (let i = 0; i < currentCart.length; i++) {
      if (currentCart[i].id === id) {
        currentCart[i] = {
          ...currentCart[i],
          quantity: currentCart[i].quantity + 1
        }
        found = true
        break
      }
    }

    if (!found) {
      currentCart.push({
        id: id,
        name: product.name,
        price: product.price,
        quantity: 1
      })
    }

    setCart(currentCart)
    localStorage.setItem('cocoraCart', JSON.stringify(currentCart))
  }

  return (
    <div>
      <section className="collection-hero">
        <div className="collection-hero-inner">
          <p className="section-tag collection-tag">THE COLLECTION</p>
          <h1 className="collection-title">Twelve chocolates, rotated by season</h1>
          <p className="collection-intro">
            Tasting notes are written by whoever rolled the batch, which is why they
            read the way they do. Prices are per piece.
          </p>
        </div>
      </section>

      <section className="collection-products">
        <div className="product-grid">
          {chocolates.map((choco) => (
            <article key={choco.code} className={`product-card choco-${choco.num}`}>
              <div className="product-image">
                <div className="chocolate-tray">
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                  <div className="chocolate-piece"></div>
                </div>
              </div>
              <div className="product-info">
                <p className="product-code">{choco.code}</p>
                <h3 className="product-name">{choco.name}</h3>
                <p className="product-desc">{choco.desc}</p>
                <div className="product-footer">
                  <span className="product-price">₹{choco.price}</span>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => handleAddToCart(choco)}
                  >
                    +
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="collection-cta">
        <div className="collection-cta-inner">
          <h2 className="cta-title">Ready to fill a tray?</h2>
          <p className="cta-text">Twelve cavities, and no rule about how you fill them.</p>
          <Link to="/build" className="btn-primary">Build your box</Link>
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
