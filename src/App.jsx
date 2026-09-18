import './App.css';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Offer from './pages/Offer/Offer';
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login';
import Publish from './pages/Publish/Publish';
import Payment from './pages/Payment/Payment';

function App() {
    const [search, setSearch] = useState('');
    const [token, setToken] = useState(null);

    const handleToken = token => {
        setToken(token);
    };

    return (
        <>
            <Router>
                <Header
                    search={search}
                    setSearch={setSearch}
                    handleToken={handleToken}
                    token={token}
                />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/signup" element={<Signup handleToken={handleToken} />} />
                    <Route path="/login" element={<Login handleToken={handleToken} />} />
                    <Route path="/publish" element={<Publish token={token} />} />
                    <Route path="/offers/:id" element={<Offer />} />
                    <Route path="/payment" element={<Payment token={token} />} />
                    <Route path="*" element={<div className="container">Route not found</div>} />
                </Routes>
            </Router>
        </>
    );
}

export default App;
