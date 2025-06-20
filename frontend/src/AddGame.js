import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Style/AddGame.css";

const AddGame = () => {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Action"); // Giá trị mặc định là "Action"

  const handleSubmit = (e) => {
    e.preventDefault();
    // Xử lý upload game: gửi dữ liệu lên server hoặc cập nhật state
    const gameData = {
      gameName,
      price,
      imageUrl,
      description,
      category,
    };
    
    console.log("Game details:", gameData);
    alert("Game uploaded successfully!");
    navigate("/profile"); // Sau khi upload, chuyển hướng về trang Profile hoặc trang khác
  };
  const handleDiscoverClick = () => {
    navigate('/library');
  };

  return (
    <div className="add-game-page">
      <header className="store-header">
        <div className="nav">
          <span className="steam-logo" onClick={() => navigate("/store")}>
          <img src="/logo.png" alt="Valve Steam Logo" className="footer-logo" />
          </span>
          <div className="user-actions">
          <button className="download-btn" onClick={handleDiscoverClick}>
                Library
            </button>
            <span>Wishlist</span>
            <span className="cart-btn" onClick={() => navigate("/cart")} style={{ cursor: "pointer" }}>
              Cart
            </span>
            <span className="cart-btn" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
              Profile
            </span>
          </div>
        </div>
      </header>

      <div className="add-game-header">
        <h1>Upload a New Game</h1>
      </div>
      <main className="add-game-container">
        <form className="add-game-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="gameName">Game Name:</label>
            <input
              type="text"
              id="gameName"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="price">Price:</label>
            <input
              type="text"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="category">Game Category:</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="Action">Action</option>
              <option value="Adventure">Adventure</option>
              <option value="RPG">RPG</option>
              <option value="Strategy">Strategy</option>
              <option value="Simulation">Simulation</option>
              <option value="Sports">Sports</option>
              <option value="Puzzle">Puzzle</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="imageUrl">Image URL:</label>
            <input
              type="text"
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          <div className="form-buttons">
            <button type="submit" className="submit-btn">
              Upload Game
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/profile")}
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <img
              src="/logo.png"
              alt="Valve Steam Logo"
              className="footer-logo"
            />
            <p>© 2023 Valve Corporation. All rights reserved.</p>
            <p>
              All trademarks are property of their respective owners in the US
              and other countries.
            </p>
            <p>VAT included in all prices where applicable.</p>
          </div>
          <div className="footer-links">
            <ul>
              <li>About Valve</li>
              <li>Jobs</li>
              <li>Steamworks</li>
              <li>Steam Distribution</li>
              <li>Support</li>
            </ul>
            <ul>
              <li>Privacy Policy</li>
              <li>Legal</li>
              <li>Steam Subscriber Agreement</li>
              <li>Refunds</li>
              <li>Cookies</li>
            </ul>
          </div>
          <div className="footer-social">
            <div className="social-icon facebook"></div>
            <div className="social-icon close"></div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AddGame;
