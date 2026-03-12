import './Signup.css';
import { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Link, useNavigate } from 'react-router';

const Signup = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newsletter, setNewsletter] = useState(false);
    const [error, setError] = useState('');

    return (
        <>
            <main className="main-signup">
                <div className="container">
                    <h1>S'inscrire</h1>
                    {error && <p className="error">{error}</p>}
                    <form
                        onSubmit={async event => {
                            event.preventDefault();

                            try {
                                const data = {
                                    email,
                                    username,
                                    password,
                                    newsletter,
                                };

                                // 1 : requête bdd ajout utilisateur
                                const response = await axios.post(import.meta.env.VITE_API_URL + '/user/signup', data);

                                // 2 : si la réponse est ok, stocker le token dans un cookie
                                Cookies.set('token', response.data.token, { expires: 7 });

                                // 3 : rediriger vers Home
                                navigate('/');
                            } catch (error) {
                                error.message && console.log('error.message', error.message);
                                error.response && console.log('error.response.data', error.response.data);
                                setError(error.response.data.message);
                            }
                        }}
                    >
                        <input
                            type="text"
                            name="username"
                            placeholder="Nom d'utilisateur"
                            value={username}
                            onChange={event => {
                                setUsername(event.target.value);
                            }}
                        />
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
                        <div className="form-control">
                            <input
                                type="checkbox"
                                name="newsletter"
                                id="newsletter"
                                checked={newsletter}
                                onChange={event => {
                                    setNewsletter(event.target.checked);
                                }}
                            />
                            <label htmlFor="newsletter">S'inscrire à notre neswletter</label>
                        </div>
                        <p>En m'inscrivant je confirme avoir lu et accepté les Termes & Conditions et Politique de Confidentialité de Vinted. Je confirme avoir au moins 18 ans.</p>
                        <button>S'inscrire</button>
                    </form>
                    <Link to="/login">Tu as déjà un compte ? Connecte-toi !</Link>
                </div>
            </main>
        </>
    );
};

export default Signup;
