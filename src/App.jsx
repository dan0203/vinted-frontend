import './App.css';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Offer from './pages/Offer/Offer';
import Signup from './pages/Signup/Signup';

function App() {
    const [search, setSearch] = useState('');

    return (
        <>
            <Router>
                <Header search={search} setSearch={setSearch} />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/offers/:id" element={<Offer />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;
