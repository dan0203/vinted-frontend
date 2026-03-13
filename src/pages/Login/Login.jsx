import './Login.css';
import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router';

const Login = ({ handleToken }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    return (
        <>
            <main className="main-login">
                <div className="container">
                    <h1>Se connecter</h1>
                    {error && <p className="error">{error}</p>}
                    <form
                        onSubmit={async event => {
                            event.preventDefault();

                            try {
                                const data = {
                                    email,
                                    password,
                                };

                                // 1 : requête bdd ajout utilisateur
                                const response = await axios.post(import.meta.env.VITE_API_URL + '/user/login', data);

                                // 2 : si la réponse est ok, stocker le token dans un cookie
                                if (response.data.token) {
                                    handleToken(response.data.token);
                                    // Cookies.set('token', response.data.token, { expires: 7 });
                                    // setIsConnected(true);
                                    setError('');

                                    // 3 : rediriger vers Home
                                    navigate('/');
                                }
                            } catch (error) {
                                error.message && console.log('error.message', error.message);
                                error.response && console.log('error.response.data', error.response.data);
                                setError(error.response.data.message);

                                // si l'utilisateur n'existe pas, rediriger vers /signup
                                if (error.status === 400) {
                                    navigate('/signup');
                                }
                            }
                        }}
                    >
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={email}
                            onChange={event => {
                                setEmail(event.target.value);
                            }}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Mot de passe"
                            value={password}
                            onChange={event => {
                                setPassword(event.target.value);
                            }}
                        />
                        <button>Se connecter</button>
                    </form>
                    <Link to="/signup">Pas encore de compte ? Inscris-toi !</Link>
                </div>
            </main>
        </>
    );
};

export default Login;
