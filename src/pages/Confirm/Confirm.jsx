import './Confirm.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import axios from 'axios';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

const Confirm = () => {
    const params = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const confirmAccount = async () => {
            try {
                await axios.get(import.meta.env.VITE_API_URL + '/users/confirm/' + params.token);

                setError(null);
            } catch (error) {
                setError(error);
            } finally {
                setIsLoading(false);
            }
        };

        confirmAccount();
    }, [params.token]);

    return (
        <main className="main-confirm">
            <div className="container">
                <h1>Confirmation du compte</h1>
                {isLoading ? (
                    <p className="loading">Chargement en cours...</p>
                ) : error ? (
                    <>
                        <ErrorMessage error={error} />
                        <Link to="/login">Retour à la connexion</Link>
                        <Link to="/resend-confirmation">Renvoyer l'email de confirmation</Link>
                    </>
                ) : (
                    <>
                        <p>Votre compte est activé ! Vous pouvez maintenant vous connecter.</p>
                        <Link to="/login">Se connecter</Link>
                    </>
                )}
            </div>
        </main>
    );
};

export default Confirm;
