import './Login.css';
import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

const Login = ({ handleToken }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    return (
        <>
            <main className="main-login">
                <div className="container">
                    <h1>Se connecter</h1>
                    {error?.response?.status === 423 ? (
                        <p className="error-message">
                            Compte verrouillé pendant 15 minutes après plusieurs tentatives
                            échouées. Réessayez plus tard.
                        </p>
                    ) : (
                        <>
                            <ErrorMessage error={error} />
                            {error?.response?.status === 403 && (
                                <p className="login-hint">
                                    Si vous n'avez pas encore confirmé votre compte, vérifiez vos
                                    emails pour retrouver le lien de confirmation. Vous pouvez
                                    aussi{' '}
                                    <Link to="/resend-confirmation">
                                        renvoyer l'email de confirmation
                                    </Link>
                                    .
                                </p>
                            )}
                        </>
                    )}
                    <form
                        onSubmit={async event => {
                            event.preventDefault();

                            try {
                                const data = {
                                    email,
                                    password,
                                };

                                // 1 : requête bdd ajout utilisateur
                                const response = await axios.post(
                                    import.meta.env.VITE_API_URL + '/users/login',
                                    data,
                                    { withCredentials: true },
                                );

                                // 2 : si la réponse est ok, stocker le token
                                if (response.data.accessToken) {
                                    handleToken(response.data.accessToken);
                                    setError(null);

                                    // 3 : rediriger vers Home
                                    navigate('/');
                                }
                            } catch (error) {
                                setError(error);
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
