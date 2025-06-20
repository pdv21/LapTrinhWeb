import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./Style/Library.css";

const Library = () => {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();

  // Lấy userId từ session hoặc param URL
  const storedUser = sessionStorage.getItem("user");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const currentUserId = parsedUser?.id;
  const userId = paramUserId || currentUserId;

  // State cho phân trang và games
  const [page, setPage] = useState(1); // Trang hiện tại
  const [pageSize, setPageSize] = useState(8); // Số game trên 1 trang
  const [games, setGames] = useState([]); // Danh sách toàn bộ game
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Genres cho sidebar filter
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(0); // 0 là all genres

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await axios.get("/api/genres");
        // Kiểm tra kiểu trả về: array hoặc object
        const genresArr = Array.isArray(res.data)
          ? res.data
          : res.data.items || res.data.data || [];
        setGenres([{ GenreID: 0, Name: "All Genres" }, ...genresArr]);
      } catch {
        setGenres([{ GenreID: 0, Name: "All Genres" }]);
      }
    };
    fetchGenres();
  }, []);
  

  // Fetch toàn bộ library data cho user 1 lần
  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      try {
        if (!userId) throw new Error("User ID is missing");
        let res;
        try {
          // Lấy nhiều nhất có thể
          res = await axios.get(`/api/users/${userId}/library?page=1&pageSize=999`);
        } catch (err) {
          if (err.response?.status === 404) {
            try {
              res = await axios.get(`/api/users/${userId}/games?page=1&pageSize=999`);
            } catch {
              res = await axios.get(`/api/library/${userId}?page=1&pageSize=999`);
            }
          } else {
            throw err;
          }
        }

        const data = res.data;
        let rawItems = [];
        if (Array.isArray(data)) rawItems = data;
        else rawItems = data.items || data.data || data.library || data.games || [];
        setGames(rawItems);
        setPage(1); // Reset page về 1 mỗi lần đổi user
      } catch (error) {
        setGames([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
    // eslint-disable-next-line
  }, [userId]);

  // Lọc theo genre và query, sau đó phân trang ở frontend
  const filteredGames = games.filter(game => {
    // Điều chỉnh tuỳ DB: genreId, genre, GenreID
    const matchGenre =
      selectedGenre === 0 ||
      game.genreId === selectedGenre ||
      game.GenreID === selectedGenre ||
      game.genre === genres.find(g => g.GenreID === selectedGenre)?.Name;

    const matchTitle = game.title?.toLowerCase().includes(query.toLowerCase());
    return matchGenre && matchTitle;
  });

  const totalPages = Math.ceil(filteredGames.length / pageSize) || 1;
  const pagedGames = filteredGames.slice((page - 1) * pageSize, page * pageSize);

  // Nếu page vượt quá totalPages do filter, tự động về trang cuối cùng còn dữ liệu
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line
  }, [filteredGames.length, pageSize]);

  if (loading) {
    return <div className="loading">Loading games for user {userId}...</div>;
  }

  return (
    <>
      {/* HEADER */}
      <header className="store-header">
        <div className="nav">
          <span className="steam-logo" onClick={() => navigate('/store')}>
            <img src="/logo.png" alt="Steam Logo" />
          </span>
          <div className="user-actions">
            <button className="btn-flat" onClick={() => navigate('/library')}>Library</button>
            <button className="btn-flat" onClick={() => navigate('/cart')}>Cart </button>
            <button className="btn-flat" onClick={() => navigate('/profile')}>Profile</button>
          </div>
        </div>
      </header>

      <h2 style={{
        color: "#fff",
        fontSize: "2.1rem",
        fontWeight: 700,
        margin: "30px 0 22px 0",
        textAlign: "center"
      }}>Your Library</h2>

      <div className="library-layout">
        <aside className="sidebar_lib">
          <h4>Genres</h4>
          <ul>
            {genres.map(genre => (
              <li
                key={genre.GenreID}
                className={selectedGenre === genre.GenreID ? "selected" : ""}
                onClick={() => {
                  setSelectedGenre(genre.GenreID);
                  setPage(1);
                }}
              >
                {genre.Name}
              </li>
            ))}
          </ul>
        </aside>
        <div className="library-main">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search games..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(1); // Reset page về 1 mỗi lần search
              }}
            />
          </div>
          {pagedGames.length === 0 ? (
            <div className="no-games">Không tìm thấy game nào.</div>
          ) : (
            <>
              <div className="library-games">
                {pagedGames.map(game => (
                  <div key={game.id} className="library-game-card">
                    <img src={game.imageUrl} alt={game.title} />
                    <h3>{game.title}</h3>
                    <button
                      className="play-button"
                      onClick={() => { /* play logic */ }}
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
              <div className="pagination" style={{ textAlign: "center", margin: "20px 0" }}>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn-page"
                >
                  Previous
                </button>
                <span style={{ margin: "0 12px" }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="btn-page"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
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
    </>
  );
};

export default Library;
