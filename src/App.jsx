import './App.css';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Cookies from 'js-cookie';
import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Offer from './pages/Offer/Offer';
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login';

function App() {
    const [isConnected, setIsConnected] = useState(false);
    const [search, setSearch] = useState('');

    const handleToken = token => {
        if (token === null) {
            Cookies.remove('token');
            setIsConnected(false);
        } else {
            Cookies.set('token', token);
            setIsConnected(true);
        }
    };

    return (
        <>
            <Router>
                <Header search={search} setSearch={setSearch} handleToken={handleToken} />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/signup" element={<Signup handleToken={handleToken} />} />
                    <Route path="/login" element={<Login handleToken={handleToken} />} />
                    <Route path="/offers/:id" element={<Offer />} />
                    <Route path="*" element={<div className="container">Route not found</div>} />
                </Routes>
            </Router>
        </>
    );
}

export default App;
