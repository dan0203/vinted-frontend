import './App.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import axios from 'axios';
import Header from './components/Header';
import Home from './pages/Home';
import Offer from './pages/Offer';

function App() {
    const [search, setSearch] = useState('');
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(import.meta.env.VITE_API_URL);

                setOffers(response.data.offers);
                setIsLoading(false);
            } catch (error) {
                error.message && console.log(error.message);
                error.response && console.log(error.response.data);
            }
        };

        fetchData();
    }, []);

    return isLoading ? (
        <p className="loading">Chargement en cours...</p>
    ) : (
        <>
            <Router>
                <Header search={search} setSearch={setSearch} />
                <Routes>
                    <Route path="/" element={<Home offers={offers} />} />
                    <Route path="/offer" element={<Offer offers={offers} />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;
