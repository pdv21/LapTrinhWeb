import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './Style/StorePage.css';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function StorePage({ cartItems, setCartItems }) {
  const [featured, setFeatured]       = useState([]);
  const [special, setSpecial]         = useState([]);
  const [freeGames, setFreeGames]     = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [games, setGames]             = useState([]);
  const [genres, setGenres]           = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(0);
  const [sortOrder, setSortOrder]     = useState(''); // 'asc','desc','sales'
  const [query, setQuery]             = useState('');
  const [pageInfo, setPageInfo]       = useState({ special: 1, free: 1, best: 1, all: 1 });
  const [totalPages, setTotalPages]   = useState({ special: 1, free: 1, best: 1, all: 1 });

  const navigate = useNavigate();
  const PAGE_SIZE     = 5;
  const ALL_PAGE_SIZE = 15;

  useEffect(() => {
    axios.get('/api/genres')
      .then(res => {
        const arr = Array.isArray(res.data.data) ? res.data.data : [];
        setGenres([{ id: 0, name: 'All' }, ...arr.map(g => ({ id: g.GenreID, name: g.Name }))]);
      })
      .catch(err => console.error('Error fetching genres:', err));
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const largeParams = { page: 1, pageSize: 1000 };
        const [rFeat, rSpec, rFree, rBest, rAll] = await Promise.all([
          axios.get('/api/games', { params: { page: 1, pageSize: PAGE_SIZE } }),
          axios.get('/api/games', { params: { ...largeParams, type: 'special' } }),
          axios.get('/api/games', { params: { ...largeParams, type: 'free'    } }),
          axios.get('/api/games', { params: { ...largeParams, type: 'best'    } }),
          axios.get('/api/games', { params: largeParams }),
        ]);

        setFeatured(rFeat.data.items || []);
        setSpecial(rSpec.data.items || []);
        const allFree = rFree.data.items || [];
        const freeOnly = allFree.filter(g => safePrice(g.price) === 0);
        setFreeGames(freeOnly);
        setBestSellers(rBest.data.items || []);
        setGames(rAll.data.items || []);

        const frees = freeOnly;
        const all   = rAll.data.items   || [];

        setTotalPages({
          special: 1,
          free:    Math.max(1, Math.ceil(frees.length / PAGE_SIZE)),
          best:    1,
          genre:   Math.max(1, Math.ceil(all.length   / PAGE_SIZE)),
          all:     Math.max(1, Math.ceil(all.length   / ALL_PAGE_SIZE)),
        });
        setPageInfo({ special: 1, free: 1, best: 1, genre: 1, all: 1 });
      } catch (err) {
        console.error('Error fetching games:', err);
      }
    }
    fetchData();
  }, []);

  const safePrice = val => {
    const num = Number(String(val || '').replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
  };

  const handlePageChange = (cat, delta) => {
    if (cat === 'all') {
      setPageInfo(prev => ({
        ...prev,
        all: Math.max(1, Math.min(prev.all + delta, totalPagesAll))
      }));
    } else {
      setPageInfo(prev => ({
        ...prev,
        [cat]: Math.max(1, Math.min(prev[cat] + delta, totalPages[cat])),
      }));
    }
  };
  

  const handleGenreSelect = id => {
    setSelectedGenre(id);
    setPageInfo(prev => ({ ...prev, all: 1 }));
  };

  const appliesFilter = game => {
    const title = (game.title || game.Title || '').toLowerCase();
    const gid   = game.genreId || game.GenreID || 0;
    return title.includes(query.toLowerCase()) && (selectedGenre === 0 || gid === selectedGenre);
  };

  const sortedSpecial = [...special].sort((a, b) => (b.discount || 0) - (a.discount || 0));
  const topFiveSpec   = sortedSpecial.slice(0, 5);
  const sortedBest    = [...bestSellers].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  const topFiveBest   = sortedBest.slice(0, 5);

  const fFeat = featured;
  const fSpec = topFiveSpec;
  const fFree = freeGames;
  const fBest = topFiveBest;
  const fAll  = games.filter(appliesFilter);
  
  // Apply sort to all games
  const sortedAll = [...fAll].sort((a, b) => {
    const pa = safePrice(a.price);
    const pb = safePrice(b.price);
    if (sortOrder==='sales')       return (b.salesCount||0) - (a.salesCount||0);
    if (sortOrder==='leastSales')  return (a.salesCount||0) - (b.salesCount||0);
    if (sortOrder === 'asc')  return (pa || 0) - (pb || 0);
    if (sortOrder === 'desc') return (pb || 0) - (pa || 0);
    return 0;
  });
  const totalPagesAll = Math.max(1, Math.ceil(sortedAll.length / ALL_PAGE_SIZE));
  const slicePage = (arr, size, page) => arr.slice((page - 1) * size, (page - 1) * size + size);
  const pageSpec = slicePage(fSpec, PAGE_SIZE, pageInfo.special);
  const pageFree = slicePage(fFree, PAGE_SIZE, pageInfo.free);
  const pageBest = slicePage(fBest, PAGE_SIZE, pageInfo.best);
  const pageAll  = slicePage(sortedAll, ALL_PAGE_SIZE, pageInfo.all);

  const getImgSrc = path => path && (path.startsWith('http') ? path : `${API_URL}${path}`);

  return (
    <div className="store-page">
      <header className="store-header">
        <div className="nav">
          <span className="steam-logo" onClick={() => navigate('/store')}>
            <img src="/logo.png" alt="Steam Logo" />
          </span>
          <input
            className="search-bar__input"
            type="text"
            placeholder="Search games..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="user-actions">
            <button className="btn-flat" onClick={() => navigate('/library')}>Library</button>
            <button className="btn-flat" onClick={() => navigate('/cart')}>Cart ({cartItems.length})</button>
            <button className="btn-flat" onClick={() => navigate('/profile')}>Profile</button>
          </div>
        </div>
      </header>

      <div className="banner">
        <img src="./summer_sale.jpg" alt="Sale Banner" className="banner-img"/>
      </div>

      <div className="content-container">
        {query ? (
          <section className="section-panel search-results">
            <h2>Filtered Results</h2>
            <div className="game-list">
              {pageAll.length ? pageAll.map(g => (
                <Link key={g.id} to={`/game/${g.id}`} className="game-card">
                  <img src={getImgSrc(g.imageUrl)} alt={g.title || g.Name}/>
                  <h3>{g.title || g.Name}</h3>
                  {(() => {
  const original = safePrice(g.price);
  const discount = g.discount || 0;

  if (original === 0) {
    // Game miễn phí
    return <span className="free-label">Free</span>;
  } else if (discount > 0) {
    // Game có giảm giá
    const current = (original * (1 - discount / 100)).toFixed(2);
    return (
      <div className="price-row">
        <span className="discount-price">${current}</span>
        <span className="original-price">${original.toFixed(2)}</span>
      </div>
    );
  } else {
    // Game có giá bình thường
    return <span className="normal-price">${original.toFixed(2)}</span>;
  }
})()}
                </Link>
              )) : <p className="empty">No games found.</p>}
            </div>
            <div className="pagination">
              <button onClick={() => handlePageChange('all', -1)} disabled={pageInfo.all === 1}>&lt; Prev</button>
              <span>{pageInfo.all}/{totalPages.all}</span>
              <button onClick={() => handlePageChange('all', +1)} disabled={pageInfo.all >= totalPages.all}>Next &gt;</button>
            </div>
          </section>
        ) : (
          <> 
            <section className="section-panel featured-game">
              <h2>Featured Game</h2>
              {fFeat[0] && (
                <Link to={`/game/${fFeat[0].id}`}>
                <div className="featured-container">
                  
                  <div className="featured-image">
                    <img src={getImgSrc(fFeat[0].imageUrl)} alt={fFeat[0].title} />
                  </div>
                  <div className="featured-info">
                    <h3>{fFeat[0].title}</h3>
                    <p>{fFeat[0].description}</p>
                    <p>{(fFeat[0].salesCount || 0).toLocaleString()} Sold</p>
                  </div>
                  
                </div>
                </Link>
              )}
            </section>


{/* Special Deals */}
<section className="section-panel special-offers">
  <h2>Special Deals</h2>
  <div className="game-list">
    {pageSpec.map(g => {
      const original = safePrice(g.price);
      const discount = g.discount || 0;
      const current  = original != null
        ? (original * (1 - discount / 100)).toFixed(2)
        : null;

      return (
        <Link key={g.id} to={`/game/${g.id}`} className="game-card">
          {discount > 0 && <div className="discount">-{discount}%</div>}
          <img src={getImgSrc(g.imageUrl)} alt={g.title} />
          <h3>{g.title}</h3>

          {original === 0 ? (
            /* Game miễn phí */
            <span className="free-label">Free</span>
          ) : discount > 0 ? (
            /* Game có giảm giá */
            <div className="price-row">
              <span className="discount-price">${current}</span>
              <span className="original-price">${original.toFixed(2)}</span>
            </div>
          ) : (
            /* Game có giá đầy đủ */
            <span className="normal-price">${original.toFixed(2)}</span>
          )}

          {/* Luôn show sold-count 1 lần */}
          <span className="sold-count">
            {g.salesCount?.toLocaleString() ?? 0} sold
          </span>
        </Link>
      );
    })}
  </div>
</section>



            {/* Free Games */}
            <section className="section-panel free-games">
              <h2>Free Games</h2>
              <div className="game-list">
                {pageFree.map(g => (
                  <Link key={g.id} to={`/game/${g.id}`} className="game-card">
                    <img src={getImgSrc(g.imageUrl)} alt={g.title}/>
                    <h3>{g.title}</h3>
                    <span className="sold-count">
                {g.salesCount?.toLocaleString() ?? 0} sold
              </span>
                  </Link>
                ))}
              </div>
              <div className="pagination">
                <button onClick={() => handlePageChange('free', -1)} disabled={pageInfo.free <= 1}>&lt; Prev</button>
                <span>{pageInfo.free}/{totalPages.free}</span>
                <button onClick={() => handlePageChange('free', +1)} disabled={pageInfo.free >= totalPages.free}>Next &gt;</button>
              </div>
            </section>

            {/* Best Sellers */}
<section className="section-panel best-seller">
  <h2>Best Sellers</h2>
  <div className="game-list">
    {pageBest.map(g => {
      const original = safePrice(g.price) ?? 0;
      const discount = g.discount || 0;
      const current  = discount > 0 
        ? (original * (1 - discount / 100)).toFixed(2)
        : null;

      return (
        <Link key={g.id} to={`/game/${g.id}`} className="game-card">
          <img src={getImgSrc(g.imageUrl)} alt={g.title}/>
          <h3>{g.title}</h3>

          <div className="price-row">
            {original === 0 ? (
              <span className="free-label">Free</span>
            ) : discount > 0 ? (
          <>
            <span className="discount-price">${current}</span>
            <span className="original-price">${original.toFixed(2)}</span>
          </>
          ) : (
            <span className="normal-price">${original.toFixed(2)}</span>
          )}
          </div>

          <span className="sold-count">
            {g.salesCount?.toLocaleString() ?? 0} sold
          </span>
        </Link>
      );
    })}
  </div>
</section>


            {/* All Games with Sidebar */}
            <section className="section-panel all-games">
              <h2>All Games</h2>
              <div className="all-games-wrapper">
                <aside className="sidebar all-games-sidebar">
                  <h3>Filter by Genre</h3>
                  <ul>
                    <li
                      className={selectedGenre === 0 ? 'active' : ''}
                      onClick={() => handleGenreSelect(0)}
                    >All</li>
                    {genres.filter(g => g.id !== 0).map(g => (
                      <li
                        key={g.id}
                        className={selectedGenre === g.id ? 'active' : ''}
                        onClick={() => handleGenreSelect(g.id)}
                      >{g.name}</li>
                    ))}
                  </ul>
                  <h3>Sort</h3>
                  <select value={sortOrder} onChange={e=>setSortOrder(e.target.value)}>
                    <option value="">None</option>
                    <option value="asc">Price Low to High</option>
                    <option value="desc">Price High to Low</option>
                    <option value="sales">Best Selling</option>
                    <option value="leastSales">Least Selling</option>
                  </select>
                </aside>
                <div className="game-list">
                  {pageAll.map(g => {
                    const original = safePrice(g.price);
                    const discount = g.discount || 0;
                    const current = original != null
                      ? (original * (1 - discount / 100)).toFixed(2)
                      : null;

                    return (
                      <Link key={g.id} to={`/game/${g.id}`} className="game-card">
                        {discount > 0 && <div className="discount">-{discount}%</div>}
                        <img src={getImgSrc(g.imageUrl)} alt={g.title} />
                        <h3>{g.title}</h3>
                        <div className="price-row">
                        {original === 0 ? (
                          <span className="free-label">Free</span>
                        ) : discount > 0 ? (
                        <>
                          <span className="discount-price">${current}</span>
                          <span className="original-price">${original.toFixed(2)}</span>
                        </>
                        ) : (
                          <span className="normal-price">${original.toFixed(2)}</span>
                        )}
                        </div>
                        <span className="sold-count">
                          {g.salesCount?.toLocaleString() ?? 0} sold
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="pagination">
                <button onClick={() => handlePageChange('all', -1)} disabled={pageInfo.all === 1}>&lt; Prev</button>
                <span>{pageInfo.all}/{totalPagesAll}</span>
                <button onClick={() => handlePageChange('all', +1)} disabled={pageInfo.all >= totalPagesAll}>Next &gt;</button>
              </div>
            </section>
          </>
        )}
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <img src="/logo.png" alt="Valve Steam Logo" className="footer-logo"/>
            <p>© 2023 Valve Corporation. All rights reserved.</p>
            <p>All trademarks are property of their respective owners.</p>
            <p>VAT included in all prices where applicable.</p>
          </div>
          <div className="footer-links">
            <ul><li>About Valve</li><li>Jobs</li><li>Steamworks</li><li>Distribution</li><li>Support</li></ul>
            <ul><li>Privacy Policy</li><li>Legal</li><li>Subscriber Agreement</li><li>Refunds</li><li>Cookies</li></ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
