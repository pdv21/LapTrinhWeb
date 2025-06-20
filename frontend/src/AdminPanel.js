import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Style/AdminPanel.css';

const pageSize = 5;
const API_USERS  = '/api/admin/users';
const API_ORDERS = '/api/admin/orders';
const API_GAMES  = '/api/admin/games';
const API_GENRES = '/api/genres';

const AdminPanel = ({ onLogout }) => {
  // Auth header
  const token = sessionStorage.getItem('token');
  const authHeader = { Authorization: `Bearer ${token}` };

  // Active tab
  const [activeTab, setActiveTab] = useState('users');

  // Users state
  const [users, setUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [orderSortField, setOrderSortField] = useState('');
  const [orderSortOrder, setOrderSortOrder] = useState('asc');

  // Games state
  const [games, setGames] = useState([]);
  const [searchGame, setSearchGame] = useState('');
  const [gamePage, setGamePage] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);
  const [filterGenreId, setFilterGenreId] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Genres state
  const [genres, setGenres] = useState([]);
  const [searchGenre, setSearchGenre] = useState('');
  const [genrePage, setGenrePage] = useState(1);
  const [totalGenres, setTotalGenres] = useState(0);
  const [genreSortField, setGenreSortField] = useState('');
  const [genreSortOrder, setGenreSortOrder] = useState('asc');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [modalData, setModalData] = useState({});

  // File handlers for game images
  const handleImageChange = e => setModalData(d => ({ ...d, imageFile: e.target.files[0] }));
  const handleScreenshotChange = e => setModalData(d => ({ ...d, screenshotFiles: Array.from(e.target.files) }));

  // Effects
  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [searchUser, userPage, activeTab]);
  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [orderPage, activeTab, orderSortField, orderSortOrder]);
  useEffect(() => { if (activeTab === 'games') fetchGames(); }, [searchGame, gamePage, activeTab, filterGenreId, sortField, sortOrder]);
  useEffect(() => { if (activeTab === 'genres') fetchGenres(); }, [searchGenre, genrePage, activeTab, genreSortField, genreSortOrder]);

  // Fetchers
  const fetchUsers = async () => {
    const { data } = await axios.get(API_USERS, { params: { search: searchUser, page: userPage, pageSize }, headers: authHeader });
    setUsers(data.users); setTotalUsers(data.total); setSelectedUser(null);
  };

  const fetchOrders = async () => {
    const { data } = await axios.get(API_ORDERS, { params: { page: orderPage, pageSize, sortField: orderSortField, sortOrder: orderSortOrder }, headers: authHeader });
    setOrders(data.orders); setTotalOrders(data.total);
  };

  const fetchGames = async () => {
    const { data } = await axios.get(API_GAMES, { params: { search: searchGame, page: gamePage, pageSize, genreId: filterGenreId, sortField, sortOrder }, headers: authHeader });
    setGames(data.items); setTotalGames(data.total); setSelectedGame(null);
  };

  const fetchGenres = async () => {
    const { data } = await axios.get(API_GENRES, { params: { keyword: searchGenre, page: genrePage, pageSize, sortField: genreSortField, sortOrder: genreSortOrder }, headers: authHeader });
    setGenres(data.data || []); setTotalGenres(data.total);
  };

  // Sort handlers
  const handleSort = field => { const order = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc'; setSortField(field); setSortOrder(order); setGamePage(1); };
  const handleOrderSort = field => { const order = orderSortField === field && orderSortOrder === 'asc' ? 'desc' : 'asc'; setOrderSortField(field); setOrderSortOrder(order); setOrderPage(1); };
  const handleGenreSort = field => { const order = genreSortField === field && genreSortOrder === 'asc' ? 'desc' : 'asc'; setGenreSortField(field); setGenreSortOrder(order); setGenrePage(1); };

  // Modal open
  const openEditUser = u => { setModalType('editUser'); setModalData({ ...u }); setModalVisible(true); };
  const openAddGame = () => { setModalType('addGame'); setModalData({ title:'', description:'', developer:'', publisher:'', price:'', discount:0, genreId:'', imageFile:null, screenshotFiles:[] }); setModalVisible(true); };
  const openEditGame = g => { setModalType('editGame'); setModalData({ id:g.id, title:g.title, description:g.description, developer:g.developer, publisher:g.publisher, price:g.price, discount:g.discount, genreId:g.GenreID, imageFile:null, screenshotFiles:[] }); setModalVisible(true); };
  const openAddGenre = () => { setModalType('addGenre'); setModalData({ name:'' }); setModalVisible(true); };
  const openEditGenre = g => { setModalType('editGenre'); setModalData({ GenreID:g.GenreID, name:g.Name }); setModalVisible(true); };

  // Delete handlers
  const confirmDel = () => window.confirm('Xác nhận xoá?');
  const handleDeleteUser = async id => { if (confirmDel()) { await axios.delete(`${API_USERS}/${id}`, { headers: authHeader }); fetchUsers(); } };
  const handleDeleteGame = async id => { if (confirmDel()) { await axios.delete(`${API_GAMES}/${id}`, { headers: authHeader }); fetchGames(); } };
  const handleDeleteGenre = async id => { if (confirmDel()) { await axios.delete(`${API_GENRES}/${id}`, { headers: authHeader }); fetchGenres(); } };

  // View order detail
  const handleViewOrder = async id => {
     try {
       const { data } = await axios.get(`${API_ORDERS}/${id}`, { headers: authHeader });
       setModalType('viewOrder');
       setModalData(data.orderDetails);
       setModalVisible(true);
     } catch (err) {
       alert(err.response?.data?.message || 'Lỗi khi lấy chi tiết đơn hàng');
     }
   };

  // Modal change & submit
  const handleModalChange = e => setModalData(d => ({ ...d, [e.target.name]: e.target.value }));
  const handleModalSubmit = async () => {
    try {
      if (modalType === 'editUser') {
        const { id, Name, role, accountNumberBank } = modalData;
        await axios.put(`${API_USERS}/${id}`, { name: Name, role, accountNumberBank }, { headers: authHeader });
        fetchUsers();
      } else if (['addGame','editGame'].includes(modalType)) {
        const { id, title, description, developer, publisher, price, discount, genreId, imageFile, screenshotFiles } = modalData;
        const formData = new FormData();
        formData.append('Name', title);
        formData.append('Description', description);
        formData.append('Developer', developer);
        formData.append('Publisher', publisher);
        formData.append('Price', price);
        formData.append('Discount', discount);
        formData.append('genreId', genreId);
        if (imageFile) formData.append('image', imageFile);
        screenshotFiles.forEach(f => formData.append('screenshot', f));
        if (modalType === 'addGame') await axios.post(API_GAMES, formData, { headers: { ...authHeader, 'Content-Type':'multipart/form-data' } });
        else await axios.put(`${API_GAMES}/${id}`, formData, { headers: { ...authHeader, 'Content-Type':'multipart/form-data' } });
        fetchGames();
      } else if (modalType === 'addGenre') {
        const { name } = modalData;
        await axios.post(API_GENRES, { Name: name }, { headers: authHeader });
        fetchGenres();
      } else if (modalType === 'editGenre') {
        const { GenreID, name } = modalData;
        await axios.put(`${API_GENRES}/${GenreID}`, { Name: name }, { headers: authHeader });
        fetchGenres();
      }
      setModalVisible(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi');
    }
  };

  // Modal component
  const Modal = () => {
    // 1) Nếu modal không visible thì thôi
    if (!modalVisible) return null;
  
    // 2) Nhánh duy nhất cho VIEW ORDER — *phải* return sớm
    if (modalType === 'viewOrder' && Array.isArray(modalData)) {
      const order = modalData[0] || {};
  
      return (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Chi tiết Đơn hàng #{order.id}</h3>
  
            {/* Thông tin chung */}
            <div className="order-info">
              <p><strong>Khách hàng:</strong> {order.customerName} ({order.Email})</p>
              <p><strong>Ngày mua:</strong> {new Date(order.purchase_date).toLocaleDateString()}</p>
              <p><strong>Tổng tiền:</strong> {order.total_amount?.toLocaleString()}</p>
            </div>
  
            {/* Bảng chi tiết từng game */}
            <table className="order-detail-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Giá</th>
                  <th>Discount (%)</th>
                </tr>
              </thead>
              <tbody>
                {modalData.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.gameName}</td>
                    <td>{item.Price?.toLocaleString()}</td>
                    <td>{item.Discount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
  
            <div className="modal-actions">
              <button type="button" onClick={() => setModalVisible(false)}>Đóng</button>
            </div>
          </div>
        </div>
      );
    }
  
    // ===========================
    // 2. Các modal còn lại (editUser, addGame, v.v.)
    // ===========================
    // Xác định tiêu đề modal bằng if/else thay vì ?: 
    let title = '';
    if (modalType === 'editUser')        title = 'Chỉnh sửa Người dùng';
    else if (modalType === 'addGame')    title = 'Thêm Game';
    else if (modalType === 'editGame')   title = 'Chỉnh sửa Game';
    else if (modalType === 'addGenre')   title = 'Thêm Thể loại';
    else                                  title = 'Chỉnh sửa Thể loại';
  
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>{title}</h3>
          <form onSubmit={e => { e.preventDefault(); handleModalSubmit(); }}>
            {modalType === 'editUser' && (
              <>
                <label>
                  Họ tên:
                  <input name="Name" value={modalData.Name || ''} onChange={handleModalChange} />
                </label>
                <label>
                  Role:
                  <select name="role" value={modalData.role || 'user'} onChange={handleModalChange}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>
                  Số TK:
                  <input name="accountNumberBank" value={modalData.accountNumberBank || ''} onChange={handleModalChange} />
                </label>
              </>
            )}
  
            {(modalType === 'addGame' || modalType === 'editGame') && (
              <>
                <label>
                  Title:
                  <input name="title" value={modalData.title || ''} onChange={handleModalChange} />
                </label>
                <label>
                  Description:
                  <input name="description" value={modalData.description || ''} onChange={handleModalChange} />
                </label>
                <label>
                  Developer:
                  <input name="developer" value={modalData.developer || ''} onChange={handleModalChange} />
                </label>
                <label>
                  Publisher:
                  <input name="publisher" value={modalData.publisher || ''} onChange={handleModalChange} />
                </label>
                <label>
                  Ảnh chính:
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                </label>
                {modalData.imageFile && (
                  <img src={URL.createObjectURL(modalData.imageFile)} alt="preview" style={{ width: 80 }} />
                )}
                <label>
                  Screenshots:
                  <input type="file" accept="image/*" multiple onChange={handleScreenshotChange} />
                </label>
                {modalData.screenshotFiles?.map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt="ss" style={{ width: 60, margin: 4 }} />
                ))}
                <label>
                  Price:
                  <input type="number" name="price" value={modalData.price || ''} onChange={handleModalChange} />
                </label>
                <label>
                  Discount %:
                  <input type="number" name="discount" value={modalData.discount || 0} onChange={handleModalChange} />
                </label>
                <label>
                  Genre:
                  <select name="genreId" value={modalData.genreId || ''} onChange={handleModalChange}>
                    <option value="">-- Chọn thể loại --</option>
                    {genres.map(g => (
                      <option key={g.GenreID} value={g.GenreID}>{g.Name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
  
            {(modalType === 'addGenre' || modalType === 'editGenre') && (
              <label>
                Tên thể loại:
                <input name="name" value={modalData.name || ''} onChange={handleModalChange} />
              </label>
            )}
  
            <div className="modal-actions">
              <button type="button" onClick={() => setModalVisible(false)}>Huỷ</button>
              <button type="submit">Lưu</button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  

  // Pagination
  const totalUserPages  = Math.max(1, Math.ceil(totalUsers/pageSize));
  const totalOrderPages = Math.max(1, Math.ceil(totalOrders/pageSize));
  const totalGamePages  = Math.max(1, Math.ceil(totalGames/pageSize));
  const totalGenrePages = Math.max(1, Math.ceil(totalGenres/pageSize));

  return (
    <>
      <header className="adminheader">
        <div className="header-content">
          <img src="/logo.png" alt="Steam Logo" className="adminheader-logo" />
        </div>
      </header>
    <div className="admin-panel-container">
      
      <aside className="admin-sidebar">
        <h3 className="admin-sidebar-title">Quản lý</h3>
        {[
          {key:'users', label:'Người dùng', total: totalUsers},
          {key:'orders',label:'Đơn hàng',  total: totalOrders},
          {key:'games', label:'Game',       total: totalGames},
          {key:'genres',label:'Thể loại',   total: totalGenres}
        ].map(item=>(
          <div key={item.key} className={`admin-menu-item ${activeTab===item.key?'active':''}`} onClick={()=>setActiveTab(item.key)}>
            {item.label} <span className="badge">{item.total}</span>
          </div>
        ))}
        <button className="admin-logout-btn" onClick={onLogout}>Đăng xuất</button>
      </aside>
      <main className="admin-main">
        {/* USERS */}
        {activeTab==='users' && (
          <section className="admin-section users-grid">
            <div>
              <h2>Quản lý Người dùng</h2>
              <input className="user-search" placeholder="Tìm kiếm" value={searchUser} onChange={e=>{setSearchUser(e.target.value); setUserPage(1);}}/>
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th className="action-cell">Hành động</th></tr></thead>
                <tbody>
                  {users.length===0
                    ? <tr><td colSpan={5}>Không có người dùng</td></tr>
                    : users.map(u=>(
                      <tr key={u.id} className={selectedUser?.id===u.id?'selected':''} onClick={()=>setSelectedUser(u)}>
                        <td>{u.id}</td><td>{u.Name||u.name}</td><td>{u.Email||u.email}</td><td>{u.role}</td>
                        <td className="action-cell">
                          <button className="admin-btn edit" onClick={()=>openEditUser(u)}>Sửa</button>
                          <button className="admin-btn delete" onClick={()=>handleDeleteUser(u.id)}>Xoá</button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
              <div className="admin-pagination"><button disabled={userPage===1} onClick={()=>setUserPage(p=>p-1)}>«</button><span>{userPage}/{totalUserPages}</span><button disabled={userPage===totalUserPages} onClick={()=>setUserPage(p=>p+1)}>»</button></div>
            </div>
            <div className="user-detail-card">{selectedUser?(
              <> <h3>Thông tin chi tiết</h3><p><strong>ID:</strong> {selectedUser.id}</p><p><strong>Họ tên:</strong> {selectedUser.Name||selectedUser.name}</p><p><strong>Email:</strong>{selectedUser.Email||selectedUser.email}</p><p><strong>Role:</strong>{selectedUser.role}</p>{selectedUser.accountNumberBank&&<p><strong>Số TK:</strong>{selectedUser.accountNumberBank}</p>}</>
            ):<p>Chọn người dùng để xem chi tiết…</p>}</div>
          </section>
        )}
        {/* ORDERS */}
        {activeTab==='orders' && (
          <section className="admin-section">
            <h2>Quản lý Đơn hàng</h2>
            <table className="admin-table">
              <thead><tr><th onClick={()=>handleOrderSort('id')}>ID {orderSortField==='id'&&(orderSortOrder==='asc'?'↑':'↓')}</th><th>User</th><th onClick={()=>handleOrderSort('total_amount')}>Tổng tiền {orderSortField==='total_amount'&&(orderSortOrder==='asc'?'↑':'↓')}</th><th onClick={()=>handleOrderSort('purchase_date')}>Ngày {orderSortField==='purchase_date'&&(orderSortOrder==='asc'?'↑':'↓')}</th><th className="action-cell">Hành động</th></tr></thead>
              <tbody>{orders.length===0? <tr><td colSpan={5}>Không có đơn hàng</td></tr> : orders.map(o=>(<tr key={o.id}><td>{o.id}</td><td>{o.customerName}</td><td>{o.total_amount?.toLocaleString()}</td><td>{new Date(o.purchase_date).toLocaleDateString()}</td><td><button className="admin-btn edit" onClick={()=>handleViewOrder(o.id)}>Xem</button></td></tr>))}</tbody>
            </table>
            <div className="admin-pagination"><button disabled={orderPage===1} onClick={()=>setOrderPage(p=>p-1)}>«</button><span>{orderPage}/{totalOrderPages}</span><button disabled={orderPage===totalOrderPages} onClick={()=>setOrderPage(p=>p+1)}>»</button></div>
          </section>
        )}
        {/* GAMES */}
        {activeTab==='games' && (
          <section className="admin-section">
            <h2>Quản lý Game</h2>
            <div className="admin-toolbar"><input placeholder="Tìm kiếm" value={searchGame} onChange={e=>{setSearchGame(e.target.value); setGamePage(1);}}/><select value={filterGenreId} onChange={e=>{setFilterGenreId(e.target.value); setGamePage(1);}}><option value="">-- Tất cả thể loại --</option>{genres.map(g=><option key={g.GenreID} value={g.GenreID}>{g.Name}</option>)}</select><button onClick={openAddGame}>+ Thêm game</button></div>
            <table className="admin-table"><thead><tr><th onClick={()=>handleSort('id')}>ID {sortField==='id'&&(sortOrder==='asc'?'↑':'↓')}</th><th onClick={()=>handleSort('title')}>Title {sortField==='title'&&(sortOrder==='asc'?'↑':'↓')}</th><th onClick={()=>handleSort('price')}>Giá {sortField==='price'&&(sortOrder==='asc'?'↑':'↓')}</th><th onClick={()=>handleSort('discount')}>Discount</th><th onClick={()=>handleSort('salesCount')}>Lượt mua {sortField==='salesCount'&&(sortOrder==='asc'?'↑':'↓')}</th><th className="action-cell">Hành động</th></tr></thead><tbody>{games.length===0? <tr><td colSpan={6}>Không có game</td></tr> : games.map(g=>(<tr key={g.id} className={selectedGame?.id===g.id?'selected':''} onClick={()=>setSelectedGame(g)}><td>{g.id}</td><td>{g.title}</td><td>{g.price?.toLocaleString()}</td><td>{g.discount}</td><td>{g.salesCount}</td><td className="action-cell"><button className="admin-btn edit" onClick={()=>openEditGame(g)}>Sửa</button><button className="admin-btn delete" onClick={()=>handleDeleteGame(g.id)}>Xoá</button></td></tr>))}</tbody></table>
            <div className="admin-pagination"><button disabled={gamePage===1} onClick={()=>setGamePage(p=>p-1)}>«</button><span>{gamePage}/{totalGamePages}</span><button disabled={gamePage===totalGamePages} onClick={()=>setGamePage(p=>p+1)}>»</button></div>
            <div className="game-detail-card">{selectedGame?(<><h3>Thông tin Game</h3><p><strong>ID:</strong>{selectedGame.id}</p><p><strong>Title:</strong>{selectedGame.title}</p><p><strong>Description:</strong>{selectedGame.description}</p><p><strong>Developer:</strong>{selectedGame.developer}</p><p><strong>Publisher:</strong>{selectedGame.publisher}</p><p><strong>Price:</strong>{selectedGame.price?.toLocaleString()}</p><p><strong>Discount:</strong>{selectedGame.discount}%</p><p><strong>Genre:</strong>{genres.find(x=>x.GenreID===selectedGame.GenreID)?.Name||'---'}</p>{selectedGame.imageUrl&&<img src={selectedGame.imageUrl} alt={selectedGame.title} style={{maxWidth:120,marginTop:8,borderRadius:4}}/>}</>) : <p>Chọn game để xem chi tiết…</p>}</div>
          </section>
        )}
        {/* GENRES */}
        {activeTab==='genres' && (
          <section className="admin-section">
            <h2>Quản lý Thể loại</h2>
            <div className="admin-toolbar"><input placeholder="Tìm kiếm" value={searchGenre} onChange={e=>{setSearchGenre(e.target.value); setGenrePage(1);}}/><button onClick={openAddGenre}>+ Thêm thể loại</button></div>
            <table className="admin-table"><thead><tr><th onClick={()=>handleGenreSort('GenreID')}>ID {genreSortField==='GenreID'&&(genreSortOrder==='asc'?'↑':'↓')}</th><th onClick={()=>handleGenreSort('Name')}>Name {genreSortField==='Name'&&(genreSortOrder==='asc'?'↑':'↓')}</th><th onClick={()=>handleGenreSort('gameCount')}>Số game {genreSortField==='gameCount'&&(genreSortOrder==='asc'?'↑':'↓')}</th><th className="action-cell">Hành động</th></tr></thead><tbody>{genres.length===0? <tr><td colSpan={4}>Không có thể loại</td></tr> : genres.map(g=>(<tr key={g.GenreID}><td>{g.GenreID}</td><td>{g.Name}</td><td>{g.gameCount}</td><td className="action-cell"><button className="admin-btn edit" onClick={()=>openEditGenre(g)}>Sửa</button><button className="admin-btn delete" onClick={()=>handleDeleteGenre(g.GenreID)}>Xoá</button></td></tr>))}</tbody></table>
            <div className="admin-pagination"><button disabled={genrePage===1} onClick={()=>setGenrePage(p=>p-1)}>«</button><span>{genrePage}/{totalGenrePages}</span><button disabled={genrePage===totalGenrePages} onClick={()=>setGenrePage(p=>p+1)}>»</button></div>
          </section>
        )}
      </main>
      {Modal()}
    </div>
    </>
  );
};

export default AdminPanel;
