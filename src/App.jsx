import './App.css';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Offer from './pages/Offer/Offer';
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login';
import Publish from './pages/Publish/Publish';
import Payment from './pages/Payment/Payment';
import Confirm from './pages/Confirm/Confirm';
import ResendConfirmation from './pages/ResendConfirmation/ResendConfirmation';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import { getToken, restoreSession, setToken as setStoredToken, subscribeToken } from './api/client';

function App() {
    const [search, setSearch] = useState('');
    const [token, setToken] = useState(getToken());
    // The access token lives in memory only, so every page load starts signed
    // out until the refresh cookie has had its one chance to say otherwise.
    const [isRestoring, setIsRestoring] = useState(true);

    useEffect(() => subscribeToken(setToken), []);

    useEffect(() => {
        restoreSession().finally(() => setIsRestoring(false));
    }, []);

    const handleToken = token => {
        setStoredToken(token);
    };

    // Nothing renders until the answer is in, Header included. A signed-out
    // first paint is not a cosmetic flash here: `Publish` and `Payment` redirect
    // away on a falsy token, and adopting the token afterwards does not bring
    // the visitor back to the url they opened.
    if (isRestoring) {
        return (
            <div className="container">
                <p className="loading">Chargement en cours...</p>
            </div>
        );
    }

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
                    <Route path="/" element={<Home search={search} />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/login" element={<Login handleToken={handleToken} />} />
                    <Route path="/confirm/:token" element={<Confirm />} />
                    <Route path="/resend-confirmation" element={<ResendConfirmation />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
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
